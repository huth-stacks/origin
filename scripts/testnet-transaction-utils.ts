import { randomUUID } from "node:crypto";
import {
  access,
  mkdir,
  readFile,
  readdir,
  rename,
  writeFile,
} from "node:fs/promises";
import { resolve } from "node:path";

import {
  serializeTransaction,
  type StacksTransactionWire,
} from "@stacks/transactions";
import type { TxBroadcastResult } from "@stacks/transactions";

export interface PreparedTransactionRecord {
  state: "signed" | "broadcast-attempted";
  txId: string;
  serializedTransaction: string;
  intent: unknown;
  path: string;
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isPreparedTransactionState(
  state: unknown,
): state is PreparedTransactionRecord["state"] {
  return state === "signed" || state === "broadcast-attempted";
}

export function canPrepareSequencedNonce(
  networkNonce: number,
  plannedNonce: bigint,
  journaledNonces: ReadonlySet<bigint>,
) {
  if (!Number.isSafeInteger(networkNonce) || networkNonce < 0) return false;
  const first = BigInt(networkNonce);
  if (plannedNonce < first || plannedNonce - first > 10_000n) return false;
  for (let nonce = first; nonce < plannedNonce; nonce += 1n)
    if (!journaledNonces.has(nonce)) return false;
  return true;
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

export function isExplicitTestnetPrepare(args: string[]) {
  if (args.includes("--prepare") && args.includes("--broadcast"))
    throw new Error("Choose either --prepare or --broadcast, not both");
  return args.includes("--prepare");
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
    if (
      !isObject(existing) ||
      !isPreparedTransactionState(existing.state) ||
      existing.txId !== record.txId ||
      existing.serializedTransaction !== record.serializedTransaction ||
      JSON.stringify(existing.intent) !== JSON.stringify(record.intent)
    )
      throw new Error(`Prepared transaction journal conflict for ${txId}`);
    return { txId, path, state: existing.state };
  }
  return { txId, path, state: record.state };
}

export async function markPreparedTransactionBroadcastAttempted(
  txId: string,
  directory = resolve("deployments/testnet-transactions"),
) {
  const path = resolve(directory, `${txId}.local.json`);
  const value = JSON.parse(await readFile(path, "utf8")) as unknown;
  if (
    !isObject(value) ||
    !isPreparedTransactionState(value.state) ||
    typeof value.txId !== "string" ||
    value.txId !== txId ||
    typeof value.serializedTransaction !== "string" ||
    !("intent" in value)
  )
    throw new Error(`Invalid prepared transaction journal at ${path}`);
  if (value.state === "broadcast-attempted") return { txId, path };
  const attempted = { ...value, state: "broadcast-attempted" };
  const temporaryPath = resolve(
    directory,
    `${txId}.attempted.${process.pid}.${randomUUID()}.tmp`,
  );
  await writeFile(temporaryPath, `${JSON.stringify(attempted, null, 2)}\n`, {
    encoding: "utf8",
    flag: "wx",
    mode: 0o600,
  });
  await rename(temporaryPath, path);
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

export async function wasPreparedTransactionBroadcastAttempted(
  txId: string,
  directory = resolve("deployments/testnet-transactions"),
) {
  const path = resolve(directory, `${txId}.local.json`);
  let value: unknown;
  try {
    value = JSON.parse(await readFile(path, "utf8")) as unknown;
  } catch (error) {
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      error.code === "ENOENT"
    )
      return false;
    throw error;
  }
  if (!isObject(value) || !isPreparedTransactionState(value.state))
    throw new Error(`Invalid prepared transaction journal at ${path}`);
  return value.state === "broadcast-attempted";
}

export async function findPreparedTransactionByJournalKey(
  journalKey: string,
  directory = resolve("deployments/testnet-transactions"),
): Promise<PreparedTransactionRecord | undefined> {
  const matches = (
    await findPreparedTransactionsByJournalKeyPrefix(journalKey, directory)
  ).filter(
    (record) =>
      isObject(record.intent) && record.intent.journalKey === journalKey,
  );
  if (matches.length > 1)
    throw new Error(`Multiple prepared transactions for ${journalKey}`);
  return matches[0];
}

export async function findPreparedTransactionsByJournalKeyPrefix(
  journalKeyPrefix: string,
  directory = resolve("deployments/testnet-transactions"),
): Promise<PreparedTransactionRecord[]> {
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
      return [];
    throw error;
  }
  const matches: PreparedTransactionRecord[] = [];
  for (const name of names.filter((value) => value.endsWith(".local.json"))) {
    const path = resolve(directory, name);
    const value = JSON.parse(await readFile(path, "utf8")) as unknown;
    if (!isObject(value) || !isObject(value.intent)) continue;
    if (
      typeof value.intent.journalKey !== "string" ||
      !value.intent.journalKey.startsWith(journalKeyPrefix)
    )
      continue;
    if (
      !isPreparedTransactionState(value.state) ||
      typeof value.txId !== "string" ||
      typeof value.serializedTransaction !== "string"
    )
      throw new Error(`Invalid prepared transaction journal at ${path}`);
    matches.push({
      state: value.state,
      txId: value.txId,
      serializedTransaction: value.serializedTransaction,
      intent: value.intent,
      path,
    });
  }
  return matches;
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
