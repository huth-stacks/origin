import { mkdir, readFile, stat } from "node:fs/promises";
import { dirname, resolve } from "node:path";

import { fetchNonce } from "@stacks/transactions";

import { fetchJsonWithTimeout } from "../demo/src/fetch-with-timeout.ts";
import { IsolatedOriginSigner } from "./domain-attester/isolated-signer.ts";
import {
  closeSignerIpcServer,
  startSignerIpcServer,
} from "./domain-attester/signer-ipc.ts";
import {
  loadPublicTestnetAccounts,
  type TestnetAccountRole,
} from "./testnet-account-utils.ts";

interface CurrentManifest {
  apiUrl: string;
  fixtures: {
    known: { subject: string };
    unrecognized: { subject: string };
  };
}

function stringArgument(name: string, fallback?: string) {
  const index = process.argv.indexOf(name);
  const value = index < 0 ? fallback : process.argv[index + 1];
  if (!value) throw new Error(`Missing ${name}`);
  return resolve(value);
}

function roleArgument() {
  const index = process.argv.indexOf("--role");
  const value = process.argv[index + 1] as TestnetAccountRole | undefined;
  if (value !== "domain_attester" && value !== "canonical_attester")
    throw new Error(
      "Signer role must be domain_attester or canonical_attester",
    );
  return value;
}

async function readRestricted(path: string, pattern: RegExp, name: string) {
  const metadata = await stat(path);
  if ((metadata.mode & 0o077) !== 0)
    throw new Error(`${name} must not be group/world accessible`);
  const value = (await readFile(path, "utf8")).trim();
  if (!pattern.test(value)) throw new Error(`Invalid ${name}`);
  return value;
}

const role = roleArgument();
const keyPath = stringArgument(
  "--key-file",
  `settings/origin-${role}-signer.local.key`,
);
const tokenPath = stringArgument(
  "--token-file",
  `settings/origin-${role}-ipc.local.token`,
);
const socketPath = stringArgument(
  "--socket",
  `settings/origin-${role}-signer.local.sock`,
);
const journalPath = stringArgument(
  "--journal",
  `settings/origin-${role}-signer.local.sqlite`,
);
const killSwitchPath = stringArgument(
  "--kill-switch",
  `settings/origin-${role}-signer.kill`,
);
const privateKey = await readRestricted(
  keyPath,
  /^(?:[0-9a-f]{64}|[0-9a-f]{66})$/,
  "signer key",
);
const token = await readRestricted(tokenPath, /^[0-9a-f]{64}$/, "IPC token");
const publicAccounts = await loadPublicTestnetAccounts();
const manifest = JSON.parse(
  await readFile(resolve("deployments/testnet-fixtures.json"), "utf8"),
) as CurrentManifest;
const registryPrincipal = `${publicAccounts.registry_deployer.address}.origin-registry-v2`;
const lifecycleSubject = `${publicAccounts.lifecycle_deployer.address}.origin-lifecycle-action`;
const denySubjects = new Set([
  manifest.fixtures.known.subject,
  manifest.fixtures.unrecognized.subject,
  lifecycleSubject,
  `${publicAccounts.expiry_deployer.address}.origin-expiry-action`,
]);
async function readBurnHeight() {
  const response = await fetchJsonWithTimeout(
    fetch,
    `${manifest.apiUrl}/v2/info`,
    undefined,
    8_000,
  );
  if (!response.ok || response.bodyError)
    throw new Error("Signer burn height is unavailable");
  const value = response.value;
  if (
    typeof value !== "object" ||
    value === null ||
    !("burn_block_height" in value) ||
    typeof value.burn_block_height !== "number" ||
    !Number.isSafeInteger(value.burn_block_height) ||
    value.burn_block_height < 0
  )
    throw new Error("Signer burn height is invalid");
  return value.burn_block_height;
}
const signer = new IsolatedOriginSigner({
  privateKey,
  journalPath,
  readNetworkNonce: (attester) =>
    fetchNonce({ address: attester, network: "testnet" }),
  readBurnHeight,
  killSwitch: async () => {
    try {
      await stat(killSwitchPath);
      return true;
    } catch {
      return false;
    }
  },
  policy: {
    attester: publicAccounts[role].address,
    registryPrincipal,
    allowedKinds: new Set(
      role === "domain_attester"
        ? (["origin-domain-issue-v1"] as const)
        : (["origin-operator-lifecycle-v1"] as const),
    ),
    fixedFee: 10_000,
    authorizationMaxAgeSeconds: 300,
    denySubjects,
    lifecycleSubject,
    lifecycleIssuerName: "Origin lifecycle fixture",
    lifecycleRole: "Demo contract",
    lifecycleMaxLifetimeBurnBlocks: 100_000,
  },
});
await mkdir(dirname(socketPath), { recursive: true });
const server = await startSignerIpcServer({
  socketPath,
  token,
  signer,
  logger: (entry) => console.log(JSON.stringify(entry)),
});
console.log(
  JSON.stringify({
    state: "listening",
    role,
    attester: publicAccounts[role].address,
    socketPath,
  }),
);

async function stop() {
  await closeSignerIpcServer(server);
  signer.close();
  process.exitCode = 0;
}
process.once("SIGINT", () => void stop());
process.once("SIGTERM", () => void stop());
