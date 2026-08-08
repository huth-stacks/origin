import { spawn } from "node:child_process";
import { mkdir, open, readFile, rename, stat, unlink } from "node:fs/promises";
import { dirname, resolve } from "node:path";

import {
  loadTestnetAccount,
  privateAccountPath,
  testnetAccountRoles,
} from "./testnet-account-utils.ts";

interface RecoveryBundle {
  accountSet: "testnet-v2";
  accounts: Array<{ path: string; source: string }>;
  publicManifest: { path: string; source: string };
  version: 1;
}

function readArgument(name: string) {
  const index = process.argv.indexOf(name);
  const value = process.argv[index + 1];
  if (!value || value.startsWith("--"))
    throw new Error(`Missing required ${name} argument`);
  return value;
}

function runGpg(args: string[], input: Buffer, outputFd?: number) {
  return new Promise<Buffer>((resolvePromise, reject) => {
    const child = spawn("gpg", args, {
      stdio: ["pipe", outputFd === undefined ? "pipe" : outputFd, "pipe"],
    });
    const stdout: Buffer[] = [];
    const stderr: Buffer[] = [];
    child.stdout?.on("data", (chunk: Buffer) => stdout.push(chunk));
    child.stderr!.on("data", (chunk: Buffer) => stderr.push(chunk));
    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) return resolvePromise(Buffer.concat(stdout));
      reject(
        new Error(
          `gpg failed with status ${String(code)}: ${Buffer.concat(stderr).toString("utf8").trim()}`,
        ),
      );
    });
    child.stdin!.end(input);
  });
}

async function readPrivateSource(path: string) {
  const metadata = await stat(path);
  if ((metadata.mode & 0o077) !== 0)
    throw new Error(`Private account file is not mode 0600: ${path}`);
  return readFile(path, "utf8");
}

const recipient = readArgument("--recipient");
if (!/^[0-9A-Fa-f]{40}$/.test(recipient))
  throw new Error("GPG recipient must be a full 40-character fingerprint");
const outputPath = resolve(readArgument("--output"));
if (!outputPath.endsWith(".gpg"))
  throw new Error("Recovery output must use the .gpg extension");

for (const role of testnetAccountRoles) await loadTestnetAccount(role);

const publicPath = resolve("deployments/testnet-v2-accounts.local.json");
const bundle: RecoveryBundle = {
  version: 1,
  accountSet: "testnet-v2",
  publicManifest: {
    path: "deployments/testnet-v2-accounts.local.json",
    source: await readFile(publicPath, "utf8"),
  },
  accounts: await Promise.all(
    testnetAccountRoles.map(async (role) => ({
      path: `settings/testnet-v2-${role}.local.json`,
      source: await readPrivateSource(privateAccountPath(role)),
    })),
  ),
};
const plaintext = Buffer.from(`${JSON.stringify(bundle)}\n`, "utf8");

await mkdir(dirname(outputPath), { recursive: true, mode: 0o700 });
const temporaryPath = `${outputPath}.tmp`;
const output = await open(temporaryPath, "wx", 0o600);
try {
  await runGpg(
    [
      "--batch",
      "--yes",
      "--trust-model",
      "always",
      "--recipient",
      recipient,
      "--encrypt",
    ],
    plaintext,
    output.fd,
  );
  await output.sync();
} catch (error) {
  await output.close();
  await unlink(temporaryPath).catch(() => undefined);
  throw error;
}
await output.close();
await rename(temporaryPath, outputPath);

const encrypted = await readFile(outputPath);
const restored = await runGpg(["--batch", "--quiet", "--decrypt"], encrypted);
if (!restored.equals(plaintext)) {
  await unlink(outputPath);
  throw new Error(
    "Encrypted recovery test did not reproduce the source bundle",
  );
}

console.log(
  `Created and restore-tested encrypted recovery bundle: ${outputPath}`,
);
console.log(
  `Recovered ${bundle.accounts.length} isolated Testnet roles exactly`,
);
