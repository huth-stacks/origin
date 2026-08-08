import { access, chmod, writeFile } from "node:fs/promises";
import { randomBytes } from "node:crypto";
import { resolve } from "node:path";

import {
  loadTestnetAccount,
  type TestnetAccountRole,
} from "./testnet-account-utils.ts";

const roleIndex = process.argv.indexOf("--role");
const role = process.argv[roleIndex + 1] as TestnetAccountRole | undefined;
if (role !== "domain_attester" && role !== "canonical_attester")
  throw new Error("Signer role must be domain_attester or canonical_attester");

const keyPath = resolve(`settings/origin-${role}-signer.local.key`);
const tokenPath = resolve(`settings/origin-${role}-ipc.local.token`);
for (const path of [keyPath, tokenPath]) {
  try {
    await access(path);
    throw new Error(`Refusing to overwrite ${path}`);
  } catch (error) {
    if (
      error instanceof Error &&
      !error.message.startsWith("Refusing to overwrite")
    )
      continue;
    throw error;
  }
}

const account = await loadTestnetAccount(role);
await writeFile(keyPath, `${account.account.stxPrivateKey}\n`, {
  encoding: "utf8",
  flag: "wx",
  mode: 0o600,
});
await chmod(keyPath, 0o600);
await writeFile(tokenPath, `${randomBytes(32).toString("hex")}\n`, {
  encoding: "utf8",
  flag: "wx",
  mode: 0o600,
});
await chmod(tokenPath, 0o600);

console.log(
  JSON.stringify({
    state: "provisioned",
    role,
    attester: account.address,
    keyPath,
    tokenPath,
  }),
);
console.log(
  "Mount the signer key only in the signer process; the verifier receives only the IPC token.",
);
