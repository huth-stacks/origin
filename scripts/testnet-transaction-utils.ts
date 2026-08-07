import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

import {
  serializeTransaction,
  type StacksTransactionWire,
} from "@stacks/transactions";
import type { TxBroadcastResult } from "@stacks/transactions";

export function acceptedTxId(result: TxBroadcastResult, action: string) {
  if ("error" in result)
    throw new Error(`${action} failed: ${result.reason}: ${result.error}`);
  return result.txid;
}

export function requireExplicitTestnetBroadcast(args: string[]) {
  if (!args.includes("--broadcast"))
    throw new Error(
      "Refusing to broadcast without the explicit --broadcast flag",
    );
}

export function isExplicitTestnetBroadcast(args: string[]) {
  return args.includes("--broadcast");
}

export async function persistPreparedTransaction(
  transaction: StacksTransactionWire,
  intent: unknown,
  directory = resolve("deployments/testnet-transactions"),
) {
  const txId = transaction.txid();
  const record = {
    state: "signed",
    txId,
    serializedTransaction: serializeTransaction(transaction),
    intent,
  };
  const path = resolve(directory, `${txId}.local.json`);
  await mkdir(directory, { recursive: true });
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
      throw new Error(`Prepared transaction journal conflict for ${txId}`);
  }
  return { txId, path };
}

export async function hasPreparedTransaction(
  txId: string,
  directory = resolve("deployments/testnet-transactions"),
) {
  try {
    await access(resolve(directory, `${txId}.local.json`));
    return true;
  } catch {
    return false;
  }
}
