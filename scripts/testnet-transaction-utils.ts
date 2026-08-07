import { access, mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

import {
  serializeTransaction,
  type StacksTransactionWire,
} from "@stacks/transactions";
import type { TxBroadcastResult } from "@stacks/transactions";

export interface PreparedTransactionRecord {
  state: "signed";
  txId: string;
  serializedTransaction: string;
  intent: unknown;
  path: string;
}

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

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

export async function findPreparedTransactionByJournalKey(
  journalKey: string,
  directory = resolve("deployments/testnet-transactions"),
): Promise<PreparedTransactionRecord | undefined> {
  let names: string[];
  try {
    names = await readdir(directory);
  } catch (error) {
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      error.code === "ENOENT"
    )
      return undefined;
    throw error;
  }
  const matches: PreparedTransactionRecord[] = [];
  for (const name of names.filter((value) => value.endsWith(".local.json"))) {
    const path = resolve(directory, name);
    const value = JSON.parse(await readFile(path, "utf8")) as unknown;
    if (!isObject(value) || !isObject(value.intent)) continue;
    if (value.intent.journalKey !== journalKey) continue;
    if (
      value.state !== "signed" ||
      typeof value.txId !== "string" ||
      typeof value.serializedTransaction !== "string"
    )
      throw new Error(`Invalid prepared transaction journal at ${path}`);
    matches.push({
      state: "signed",
      txId: value.txId,
      serializedTransaction: value.serializedTransaction,
      intent: value.intent,
      path,
    });
  }
  if (matches.length > 1)
    throw new Error(`Multiple prepared transactions for ${journalKey}`);
  return matches[0];
}

export function readJournaledNonce(record: PreparedTransactionRecord) {
  if (
    !isObject(record.intent) ||
    typeof record.intent.nonce !== "string" ||
    !/^\d+$/.test(record.intent.nonce)
  )
    throw new Error(`Invalid journaled nonce at ${record.path}`);
  return BigInt(record.intent.nonce);
}
