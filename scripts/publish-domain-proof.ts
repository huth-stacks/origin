import { mkdir, open, rename, unlink } from "node:fs/promises";
import { dirname, resolve } from "node:path";

import { deployerFromSubject } from "./domain-attester/domain-policy.ts";
import { signDomainProof } from "./domain-attester/proof-signature.ts";
import { DomainAttesterStore } from "./domain-attester/store.ts";
import { loadTestnetAccount } from "./testnet-account-utils.ts";

function readArgument(name: string, fallback?: string) {
  const index = process.argv.indexOf(name);
  const value = index < 0 ? fallback : process.argv[index + 1];
  if (!value || value.startsWith("--"))
    throw new Error(`Missing required ${name} argument`);
  return value;
}

const requestId = readArgument("--request-id");
if (!/^[0-9a-f]{64}$/.test(requestId))
  throw new Error("Domain proof request ID must be 32-byte lowercase hex");
const databasePath = resolve(
  readArgument(
    "--database",
    "settings/origin-domain-attester-requests.local.sqlite",
  ),
);
const outputPath = resolve(
  readArgument("--output", "demo/public/.well-known/stacks-origin.json"),
);
const store = new DomainAttesterStore(databasePath);

try {
  const request = store.get(requestId);
  if (request.state !== "challenge-issued")
    throw new Error("Domain proof request is not awaiting publication");
  const deployer = await loadTestnetAccount("proof_deployer");
  if (deployerFromSubject(request.subject) !== deployer.address)
    throw new Error("Domain proof subject is not owned by the proof deployer");
  const proof = signDomainProof(
    request.challenge,
    deployer.account.stxPrivateKey,
  );
  const source = `${JSON.stringify(proof, null, 2)}\n`;
  await mkdir(dirname(outputPath), { recursive: true });
  const temporaryPath = `${outputPath}.tmp`;
  const output = await open(temporaryPath, "wx", 0o644);
  try {
    await output.writeFile(source, "utf8");
    await output.sync();
  } catch (error) {
    await output.close();
    await unlink(temporaryPath).catch(() => undefined);
    throw error;
  }
  await output.close();
  await rename(temporaryPath, outputPath);
  console.log(
    JSON.stringify({ state: "published-locally", requestId, outputPath }),
  );
} finally {
  store.close();
}
