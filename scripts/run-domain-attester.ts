import assert from "node:assert/strict";
import { readFile, stat } from "node:fs/promises";
import { resolve } from "node:path";

import {
  Cl,
  ClarityType,
  fetchCallReadOnlyFunction,
  isClarityType,
  type ClarityValue,
} from "@stacks/transactions";

import { fetchJsonWithTimeout } from "../demo/src/fetch-with-timeout.ts";
import {
  domainAttesterOperatorHelp,
  parseDomainAttesterOperatorCommand,
  runDomainAttesterOperatorCommand,
} from "./domain-attester/operator.ts";
import { DomainAttesterService } from "./domain-attester/service.ts";
import { signOverIpc } from "./domain-attester/signer-ipc.ts";
import { DomainAttesterStore } from "./domain-attester/store.ts";
import { loadPublicTestnetAccounts } from "./testnet-account-utils.ts";

interface CurrentManifest {
  apiUrl: string;
  fixtures: {
    known: { subject: string };
    unrecognized: { subject: string };
  };
}

async function readRestrictedToken(path: string) {
  const metadata = await stat(path);
  if ((metadata.mode & 0o077) !== 0)
    throw new Error("IPC token must not be group/world accessible");
  const token = (await readFile(path, "utf8")).trim();
  if (!/^[0-9a-f]{64}$/.test(token)) throw new Error("Invalid IPC token");
  return token;
}

const command = parseDomainAttesterOperatorCommand(process.argv.slice(2));
if (command.kind === "help") {
  console.log(domainAttesterOperatorHelp());
  process.exit(0);
}

const publicAccounts = await loadPublicTestnetAccounts();
const manifest = JSON.parse(
  await readFile(resolve("deployments/testnet-fixtures.json"), "utf8"),
) as CurrentManifest;
const registryAddress = publicAccounts.registry_deployer.address;
const registryName = "origin-registry-v2";
const registryPrincipal = `${registryAddress}.${registryName}`;
const lifecycleSubject = `${publicAccounts.lifecycle_deployer.address}.origin-lifecycle-action`;
const denySubjects = new Set([
  manifest.fixtures.known.subject,
  manifest.fixtures.unrecognized.subject,
  lifecycleSubject,
  `${publicAccounts.expiry_deployer.address}.origin-expiry-action`,
]);
const databasePath = resolve(
  process.env.ORIGIN_ATTESTER_DATABASE ??
    "settings/origin-domain-attester-requests.local.sqlite",
);
const socketPath = resolve(
  process.env.ORIGIN_ATTESTER_SIGNER_SOCKET ??
    "settings/origin-domain_attester-signer.local.sock",
);
const tokenPath = resolve(
  process.env.ORIGIN_ATTESTER_IPC_TOKEN_FILE ??
    "settings/origin-domain_attester-ipc.local.token",
);
const apiUrl = process.env.ORIGIN_ATTESTER_API_URL ?? manifest.apiUrl;
const store = new DomainAttesterStore(databasePath);

async function readBurnHeight() {
  const response = await fetchJsonWithTimeout(
    fetch,
    `${apiUrl}/v2/info`,
    undefined,
    8_000,
  );
  if (!response.ok || response.bodyError)
    throw new Error("Burn height is unavailable");
  const value = response.value as { burn_block_height?: unknown };
  if (!Number.isSafeInteger(value.burn_block_height))
    throw new Error("Burn height is unavailable");
  return value.burn_block_height as number;
}

async function readCurrentClaim(attester: string, subject: string) {
  const value = await fetchCallReadOnlyFunction({
    contractAddress: registryAddress,
    contractName: registryName,
    functionName: "get-attestation",
    functionArgs: [Cl.principal(attester), Cl.principal(subject)],
    senderAddress: registryAddress,
    network: "testnet",
  });
  if (isClarityType(value, ClarityType.OptionalNone)) return null;
  assert(
    isClarityType(value, ClarityType.OptionalSome) &&
      isClarityType(value.value, ClarityType.Tuple),
    "Registry returned an invalid attestation",
  );
  const claim = value.value.value;
  const issuedAt = claim["issued-at"];
  const expiresAt = claim["expires-at"];
  const revoked = claim.revoked;
  const readUint = (field: unknown) => {
    assert(
      typeof field === "object" && field !== null,
      "Registry returned an invalid uint",
    );
    const clarityValue = field as ClarityValue;
    assert(
      isClarityType(clarityValue, ClarityType.UInt),
      "Registry returned an invalid uint",
    );
    const value = BigInt(clarityValue.value);
    assert(
      value <= BigInt(Number.MAX_SAFE_INTEGER),
      "Registry returned an oversized uint",
    );
    return Number(value);
  };
  assert(
    isClarityType(revoked, ClarityType.BoolTrue) ||
      isClarityType(revoked, ClarityType.BoolFalse),
    "Registry returned invalid lifecycle fields",
  );
  return {
    issuedAt: readUint(issuedAt),
    expiresAt: readUint(expiresAt),
    revoked: isClarityType(revoked, ClarityType.BoolTrue),
  };
}

const service = new DomainAttesterService({
  store,
  attester: publicAccounts.domain_attester.address,
  registryPrincipal,
  denySubjects,
  readBurnHeight,
  readCurrentClaim,
  signer: {
    sign: async (authorization) =>
      signOverIpc({
        socketPath,
        token: await readRestrictedToken(tokenPath),
        authorization,
      }),
  },
  logger: (entry) => console.error(JSON.stringify(entry)),
});

try {
  const result = await runDomainAttesterOperatorCommand(
    command,
    service,
    store,
  );
  console.log(JSON.stringify(result, null, 2));
} finally {
  store.close();
}
