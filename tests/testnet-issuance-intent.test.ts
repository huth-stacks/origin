import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { describe, expect, test } from "vitest";

import { prepareIssuanceIntent } from "../scripts/testnet-issuance-intent";

const target = {
  attesterRole: "canonical_attester",
  subject: "STTEST.origin-action",
  issuerName: "example.test",
  contractRole: "Application contract",
  expiresAt: 10_000,
};

async function intentDirectory() {
  return mkdtemp(join(tmpdir(), "origin-issuance-intent-"));
}

describe(prepareIssuanceIntent.name, () => {
  test("reuses the exact request ID for the same persisted intent", async () => {
    const directory = await intentDirectory();
    const first = await prepareIssuanceIntent({
      intentId: "canonical-cutover-1",
      targets: [target],
      directory,
    });
    const second = await prepareIssuanceIntent({
      intentId: "canonical-cutover-1",
      targets: [target],
      directory,
    });

    expect(first.issuances[0]?.requestId).toMatch(/^[0-9a-f]{64}$/);
    expect(second).toEqual(first);
  });

  test("assigns a fresh request ID to a new issuance intent", async () => {
    const directory = await intentDirectory();
    const first = await prepareIssuanceIntent({
      intentId: "lifecycle-initial",
      targets: [target],
      directory,
    });
    const reissue = await prepareIssuanceIntent({
      intentId: "lifecycle-reissue-1",
      targets: [target],
      directory,
    });

    expect(reissue.issuances[0]?.requestId).not.toBe(
      first.issuances[0]?.requestId,
    );
  });

  test("rejects changed arguments under an existing intent ID", async () => {
    const directory = await intentDirectory();
    await prepareIssuanceIntent({
      intentId: "canonical-cutover-1",
      targets: [target],
      directory,
    });

    await expect(
      prepareIssuanceIntent({
        intentId: "canonical-cutover-1",
        targets: [{ ...target, expiresAt: target.expiresAt + 1 }],
        directory,
      }),
    ).rejects.toThrow("Issuance intent conflict");
  });

  test("rejects path-like intent IDs", async () => {
    await expect(
      prepareIssuanceIntent({
        intentId: "../escape",
        targets: [target],
        directory: await intentDirectory(),
      }),
    ).rejects.toThrow("Invalid issuance intent ID");
  });
});
