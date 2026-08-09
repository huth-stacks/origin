import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import {
  makeRandomPrivKey,
  makeSTXTokenTransfer,
  type TxBroadcastResult,
} from "@stacks/transactions";
import { describe, expect, test } from "vitest";

import {
  acceptedTxId,
  canPrepareSequencedNonce,
  findPreparedTransactionByJournalKey,
  findPreparedTransactionsByJournalKeyPrefix,
  isExplicitTestnetPrepare,
  isExplicitTestnetBroadcast,
  markPreparedTransactionBroadcastAttempted,
  persistPreparedTransaction,
  readJournaledNonce,
  requireExplicitTestnetBroadcast,
} from "../scripts/testnet-transaction-utils";

describe(canPrepareSequencedNonce.name, () => {
  test("allows a future nonce only behind a contiguous local journal", () => {
    const journaled = new Set([0n, 1n, 2n]);
    expect(canPrepareSequencedNonce(0, 3n, journaled)).toBe(true);
    expect(canPrepareSequencedNonce(0, 4n, journaled)).toBe(false);
  });

  test("rejects stale and implausibly distant planned nonces", () => {
    expect(canPrepareSequencedNonce(2, 1n, new Set())).toBe(false);
    expect(canPrepareSequencedNonce(0, 10_001n, new Set())).toBe(false);
  });
});

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

describe(isExplicitTestnetPrepare.name, () => {
  test("recognizes the local signing-only mode", () => {
    expect(isExplicitTestnetPrepare(["node", "script", "--prepare"])).toBe(
      true,
    );
  });

  test("rejects an invocation that also requests broadcast", () => {
    expect(() =>
      isExplicitTestnetPrepare(["node", "script", "--prepare", "--broadcast"]),
    ).toThrow("either --prepare or --broadcast");
  });
});

describe(markPreparedTransactionBroadcastAttempted.name, () => {
  test("preserves the exact prepared transaction while recording network intent", async () => {
    const directory = await mkdtemp(join(tmpdir(), "origin-journal-"));
    const transaction = await makeSTXTokenTransfer({
      recipient: "ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM",
      amount: 1n,
      fee: 1_000n,
      nonce: 0n,
      senderKey: makeRandomPrivKey(),
      network: "testnet",
    });
    const intent = { journalKey: "fund:sender:recipient:0", nonce: "0" };
    const prepared = await persistPreparedTransaction(
      transaction,
      intent,
      directory,
    );

    expect(prepared.state).toBe("signed");
    await markPreparedTransactionBroadcastAttempted(
      transaction.txid(),
      directory,
    );
    const repeated = await persistPreparedTransaction(
      transaction,
      intent,
      directory,
    );
    const stored = JSON.parse(await readFile(prepared.path, "utf8")) as {
      state: string;
    };

    expect(repeated.state).toBe("broadcast-attempted");
    expect(stored.state).toBe("broadcast-attempted");
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

  test("finds every journal in one semantic sequence", async () => {
    const directory = await mkdtemp(join(tmpdir(), "origin-journal-"));
    for (const sequence of [0, 1])
      await writeFile(
        join(directory, `${sequence}.local.json`),
        JSON.stringify({
          state: "signed",
          txId: `planned-${sequence}`,
          serializedTransaction: "00",
          intent: {
            journalKey: `fund:sender:recipient:${sequence}`,
            nonce: String(sequence),
          },
        }),
      );

    const records = await findPreparedTransactionsByJournalKeyPrefix(
      "fund:sender:recipient:",
      directory,
    );

    expect(records.map((record) => record.txId).sort()).toEqual([
      "planned-0",
      "planned-1",
    ]);
  });

  test("ignores an orphaned atomic-write temp file", async () => {
    const directory = await mkdtemp(join(tmpdir(), "origin-journal-"));
    await writeFile(
      join(directory, "planned.local.json"),
      JSON.stringify({
        state: "signed",
        txId: "planned",
        serializedTransaction: "00",
        intent: { journalKey: "fund:sender:recipient:0", nonce: "0" },
      }),
    );
    await writeFile(
      join(directory, "planned.attempted.123.uuid.tmp"),
      '{"state":',
    );

    await expect(
      findPreparedTransactionsByJournalKeyPrefix(
        "fund:sender:recipient:",
        directory,
      ),
    ).resolves.toHaveLength(1);
  });
});
