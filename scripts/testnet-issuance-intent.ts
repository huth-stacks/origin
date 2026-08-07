import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

export interface IssuanceIntentTarget {
  attesterRole: string;
  subject: string;
  issuerName: string;
  contractRole: string;
  expiresAt: number;
}

interface PrepareIssuanceIntentArgs {
  intentId: string;
  targets: readonly IssuanceIntentTarget[];
  directory?: string;
}

function requestId(intentId: string, target: IssuanceIntentTarget) {
  return createHash("sha256")
    .update(
      JSON.stringify({
        protocol: "origin-v2-issuance-intent",
        intentId,
        ...target,
      }),
    )
    .digest("hex");
}

export async function prepareIssuanceIntent({
  intentId,
  targets,
  directory = resolve("deployments/testnet-issuance-intents"),
}: PrepareIssuanceIntentArgs) {
  if (!/^[a-z0-9][a-z0-9._-]{0,63}$/.test(intentId))
    throw new Error("Invalid issuance intent ID");
  if (targets.length === 0) throw new Error("Issuance intent is empty");
  const record = {
    version: 1,
    intentId,
    issuances: targets.map((target) => ({
      ...target,
      requestId: requestId(intentId, target),
    })),
  };
  await mkdir(directory, { recursive: true });
  const path = resolve(directory, `${intentId}.local.json`);
  try {
    await writeFile(path, `${JSON.stringify(record, null, 2)}\n`, {
      encoding: "utf8",
      flag: "wx",
      mode: 0o600,
    });
  } catch (error) {
    if (
      typeof error !== "object" ||
      error === null ||
      !("code" in error) ||
      error.code !== "EEXIST"
    )
      throw error;
    const existing = JSON.parse(await readFile(path, "utf8")) as unknown;
    if (JSON.stringify(existing) !== JSON.stringify(record))
      throw new Error(`Issuance intent conflict for ${intentId}`);
  }
  return { ...record, path };
}
