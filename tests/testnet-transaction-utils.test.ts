import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import type { TxBroadcastResult } from "@stacks/transactions";
import { describe, expect, test } from "vitest";

import {
  acceptedTxId,
  findPreparedTransactionByJournalKey,
  isExplicitTestnetBroadcast,
  readJournaledNonce,
  requireExplicitTestnetBroadcast,
} from "../scripts/testnet-transaction-utils";

describe(acceptedTxId.name, () => {
  test("returns the transaction ID only for an accepted broadcast", () => {
    expect(acceptedTxId({ txid: "accepted-id" }, "Deployment")).toBe(
      "accepted-id",
    );
  });

  test("rejects a node response even when the rejection includes a transaction ID", () => {
    const rejection: TxBroadcastResult = {
      error: "Contract already exists",
      reason: "ContractAlreadyExists",
      reason_data: { contract_identifier: "ST123.origin-registry" },
      txid: "rejected-id",
    };

    expect(() => acceptedTxId(rejection, "Deployment")).toThrow(
      "Deployment failed: ContractAlreadyExists: Contract already exists",
    );
  });
});

describe(isExplicitTestnetBroadcast.name, () => {
  test("keeps ordinary invocations in dry-run mode", () => {
    expect(isExplicitTestnetBroadcast(["node", "script"])).toBe(false);
  });

  test("recognizes the explicit broadcast flag", () => {
    expect(isExplicitTestnetBroadcast(["node", "script", "--broadcast"])).toBe(
      true,
    );
  });
});

describe(requireExplicitTestnetBroadcast.name, () => {
  test("accepts an explicit broadcast invocation", () => {
    expect(() =>
      requireExplicitTestnetBroadcast(["node", "script", "--broadcast"]),
    ).not.toThrow();
  });

  test("rejects an ordinary script invocation before it can broadcast", () => {
    expect(() => requireExplicitTestnetBroadcast(["node", "script"])).toThrow(
      "Refusing to broadcast without the explicit --broadcast flag",
    );
  });
});

describe(findPreparedTransactionByJournalKey.name, () => {
  test("finds one semantic intent independently of its transaction ID", async () => {
    const directory = await mkdtemp(join(tmpdir(), "origin-journal-"));
    await writeFile(
      join(directory, "different-txid.local.json"),
      JSON.stringify({
        state: "signed",
        txId: "planned",
        serializedTransaction: "00",
        intent: { journalKey: "fund:sender:recipient", nonce: "7" },
      }),
    );

    const record = await findPreparedTransactionByJournalKey(
      "fund:sender:recipient",
      directory,
    );

    expect(record?.txId).toBe("planned");
    expect(record && readJournaledNonce(record)).toBe(7n);
  });

  test("rejects duplicate semantic journal entries", async () => {
    const directory = await mkdtemp(join(tmpdir(), "origin-journal-"));
    const record = JSON.stringify({
      state: "signed",
      txId: "planned",
      serializedTransaction: "00",
      intent: { journalKey: "issue:intent:subject", nonce: "7" },
    });
    await writeFile(join(directory, "one.local.json"), record);
    await writeFile(join(directory, "two.local.json"), record);

    await expect(
      findPreparedTransactionByJournalKey("issue:intent:subject", directory),
    ).rejects.toThrow("Multiple prepared transactions");
  });
});
