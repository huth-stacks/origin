import { execFile } from "node:child_process";
import { readFile } from "node:fs/promises";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const mnemonicPattern =
  /["']?mnemonic["']?\s*[:=]\s*["'][a-z]+(?:\s+[a-z]+){11,}["']/i;
const privateKeyPattern =
  /["']?(?:privateKey|secretKey|senderKey)["']?\s*[:=]\s*["'][0-9a-f]{64,66}["']/i;
const localPathPattern = /(^|\/)[^/]*\.local\.[^/]+$/;
const publicFixturePaths = new Set(["settings/Devnet.toml"]);

async function gitPaths(...args: string[]) {
  const { stdout } = await execFileAsync("git", args, {
    encoding: "buffer",
    maxBuffer: 10 * 1024 * 1024,
  });
  return stdout
    .toString("utf8")
    .split("\0")
    .filter((path) => path.length > 0);
}

const trackedPaths = await gitPaths("ls-files", "-z");
const candidatePaths = await gitPaths(
  "ls-files",
  "--cached",
  "--others",
  "--exclude-standard",
  "-z",
);
const violations: string[] = trackedPaths
  .filter((path) => localPathPattern.test(path))
  .map((path) => `${path}: tracked local-secret filename`);

for (const path of candidatePaths) {
  let source: string;
  try {
    source = await readFile(path, "utf8");
  } catch {
    continue;
  }
  if (mnemonicPattern.test(source) && !publicFixturePaths.has(path))
    violations.push(`${path}: mnemonic-like assignment`);
  if (privateKeyPattern.test(source))
    violations.push(`${path}: private-key-like assignment`);
}

if (violations.length > 0)
  throw new Error(`Secret hygiene check failed:\n${violations.join("\n")}`);

console.log("Secret hygiene check passed");
