import { chmodSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { DatabaseSync } from "node:sqlite";

import {
  makeContractCall,
  privateKeyToAddress,
  serializeTransaction,
} from "@stacks/transactions";

import {
  validateSignerAuthorization,
  type SignerPolicyConfig,
} from "./signer-policy.ts";
import type { SignedAuthorization, SignerAuthorization } from "./types.ts";

interface IsolatedSignerOptions {
  privateKey: Parameters<typeof privateKeyToAddress>[0];
  policy: SignerPolicyConfig;
  journalPath?: string;
  readNetworkNonce: (attester: string) => Promise<bigint>;
  readBurnHeight: () => Promise<number>;
  nowSeconds?: () => number;
  dailyLimit?: number;
  killSwitch?: () => boolean | Promise<boolean>;
}

interface SignerRow {
  request_id: string;
  authorization_json: string;
  signer_nonce: number;
  serialized_transaction: string | null;
  tx_id: string | null;
}

function canonicalize(value: unknown): string {
  if (Array.isArray(value))
    return `[${value.map((item) => canonicalize(item)).join(",")}]`;
  if (typeof value === "object" && value !== null)
    return `{${Object.entries(value)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, item]) => `${JSON.stringify(key)}:${canonicalize(item)}`)
      .join(",")}}`;
  return JSON.stringify(value);
}

export class IsolatedOriginSigner {
  private readonly database: DatabaseSync;
  private readonly nowSeconds: () => number;
  private readonly dailyLimit: number;
  private readonly options: IsolatedSignerOptions;
  private signingQueue: Promise<void> = Promise.resolve();

  constructor(options: IsolatedSignerOptions) {
    this.options = options;
    const address = privateKeyToAddress(options.privateKey, "testnet");
    if (address !== options.policy.attester)
      throw new Error(
        "Isolated signer key does not match its configured attester",
      );
    const path = options.journalPath ?? ":memory:";
    if (path !== ":memory:") mkdirSync(dirname(path), { recursive: true });
    this.database = new DatabaseSync(path, { timeout: 5_000 });
    if (path !== ":memory:") chmodSync(path, 0o600);
    this.database.exec("PRAGMA journal_mode = WAL;");
    this.database.exec(`
      CREATE TABLE IF NOT EXISTS signer_requests (
        request_id TEXT PRIMARY KEY,
        authorization_json TEXT NOT NULL,
        signer_nonce INTEGER NOT NULL UNIQUE,
        serialized_transaction TEXT,
        tx_id TEXT UNIQUE,
        created_at INTEGER NOT NULL,
        signed_at INTEGER
      ) STRICT;
      CREATE INDEX IF NOT EXISTS signer_requests_daily
        ON signer_requests(created_at);
    `);
    this.database
      .prepare(
        "DELETE FROM signer_requests WHERE serialized_transaction IS NULL OR tx_id IS NULL",
      )
      .run();
    this.nowSeconds =
      options.nowSeconds ?? (() => Math.floor(Date.now() / 1_000));
    this.dailyLimit = options.dailyLimit ?? 20;
  }

  close() {
    this.database.close();
  }

  sign(authorization: SignerAuthorization): Promise<SignedAuthorization> {
    const result = this.signingQueue.then(() =>
      this.signAuthorization(authorization),
    );
    this.signingQueue = result.then(
      () => undefined,
      () => undefined,
    );
    return result;
  }

  private async signAuthorization(
    authorization: SignerAuthorization,
  ): Promise<SignedAuthorization> {
    if (await this.options.killSwitch?.())
      throw new Error("Origin signer kill switch is active");
    const now = this.nowSeconds();
    const canonicalAuthorization = canonicalize(authorization);
    const row = this.database
      .prepare("SELECT * FROM signer_requests WHERE request_id = ?")
      .get(authorization.requestId) as SignerRow | undefined;
    if (row) {
      if (row.authorization_json !== canonicalAuthorization)
        throw new Error(
          "Signer request ID was replayed with altered authorization",
        );
      if (row.serialized_transaction && row.tx_id)
        return {
          requestId: row.request_id,
          signerNonce: row.signer_nonce,
          serializedTransaction: row.serialized_transaction,
          txId: row.tx_id,
        };
    }
    const currentBurnHeight = await this.options.readBurnHeight();
    const call = validateSignerAuthorization(
      authorization,
      this.options.policy,
      now,
      currentBurnHeight,
    );
    const networkNonce = await this.options.readNetworkNonce(
      this.options.policy.attester,
    );
    if (networkNonce < 0n || networkNonce > BigInt(Number.MAX_SAFE_INTEGER))
      throw new Error("Signer nonce is too large");
    this.database.exec("BEGIN IMMEDIATE");
    try {
      this.database
        .prepare(
          "DELETE FROM signer_requests WHERE serialized_transaction IS NULL OR tx_id IS NULL",
        )
        .run();
      const dayStart = now - (now % 86_400);
      const daily = this.database
        .prepare(
          "SELECT COUNT(*) AS count FROM signer_requests WHERE created_at >= ?",
        )
        .get(dayStart) as { count: number };
      if (daily.count >= this.dailyLimit)
        throw new Error("Origin signer daily issuance ceiling reached");
      const localNonces = this.database
        .prepare(
          `SELECT signer_nonce AS nonce
           FROM signer_requests
           WHERE signer_nonce >= ?
           ORDER BY signer_nonce`,
        )
        .all(Number(networkNonce)) as { nonce: number }[];
      let signerNonce = Number(networkNonce);
      for (const local of localNonces) {
        if (local.nonce !== signerNonce)
          throw new Error("Signer journal contains a nonce gap");
        signerNonce += 1;
      }
      const transaction = await makeContractCall({
        contractAddress: call.contractAddress,
        contractName: call.contractName,
        functionName: call.functionName,
        functionArgs: call.functionArgs,
        nonce: BigInt(signerNonce),
        fee: call.fee,
        senderKey: this.options.privateKey,
        network: "testnet",
      });
      const signed: SignedAuthorization = {
        requestId: authorization.requestId,
        signerNonce,
        serializedTransaction: serializeTransaction(transaction),
        txId: transaction.txid(),
      };
      this.database
        .prepare(
          `INSERT INTO signer_requests (
            request_id, authorization_json, signer_nonce,
            serialized_transaction, tx_id, created_at, signed_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
        )
        .run(
          authorization.requestId,
          canonicalAuthorization,
          signerNonce,
          signed.serializedTransaction,
          signed.txId,
          now,
          now,
        );
      this.database.exec("COMMIT");
      return signed;
    } catch (error) {
      this.database.exec("ROLLBACK");
      throw error;
    }
  }
}
