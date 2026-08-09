import { chmodSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { DatabaseSync } from "node:sqlite";

import type {
  DomainChallenge,
  DomainIssueAuthorization,
  DomainRequestState,
  SignedAuthorization,
} from "./types.ts";

const OPEN_STATES: DomainRequestState[] = [
  "challenge-issued",
  "verified",
  "authorized",
  "signed",
  "broadcast-unknown",
  "pending",
];

interface StoreRateLimits {
  windowSeconds: number;
  source: number;
  domain: number;
  subject: number;
  globalOpen: number;
}

export interface StoredDomainRequest {
  requestId: string;
  nonce: string;
  domain: string;
  subject: string;
  attester: string;
  sourceAddress: string;
  state: DomainRequestState;
  challenge: DomainChallenge;
  authorization?: DomainIssueAuthorization;
  signerNonce?: number;
  serializedTransaction?: string;
  txId?: string;
  createdAt: number;
  updatedAt: number;
  disposition?: string;
}

interface RequestRow {
  request_id: string;
  nonce: string;
  domain: string;
  subject: string;
  attester: string;
  source_address: string;
  state: DomainRequestState;
  challenge_json: string;
  authorization_json: string | null;
  signer_nonce: number | null;
  serialized_transaction: string | null;
  tx_id: string | null;
  created_at: number;
  updated_at: number;
  disposition: string | null;
}

const DEFAULT_RATE_LIMITS: StoreRateLimits = {
  windowSeconds: 60,
  source: 5,
  domain: 3,
  subject: 3,
  globalOpen: 100,
};

function placeholders(values: readonly unknown[]) {
  return values.map(() => "?").join(", ");
}

export class DomainAttesterStore {
  readonly database: DatabaseSync;
  private readonly rateLimits: StoreRateLimits;

  constructor(path = ":memory:", rateLimits = DEFAULT_RATE_LIMITS) {
    this.rateLimits = rateLimits;
    if (path !== ":memory:") mkdirSync(dirname(path), { recursive: true });
    this.database = new DatabaseSync(path, { timeout: 5_000 });
    if (path !== ":memory:") chmodSync(path, 0o600);
    this.database.exec("PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;");
    this.database.exec(`
      CREATE TABLE IF NOT EXISTS domain_requests (
        request_id TEXT PRIMARY KEY,
        nonce TEXT NOT NULL UNIQUE,
        domain TEXT NOT NULL,
        subject TEXT NOT NULL,
        attester TEXT NOT NULL,
        source_address TEXT NOT NULL,
        state TEXT NOT NULL CHECK (state IN (
          'challenge-issued', 'verified', 'authorized', 'signed',
          'broadcast-unknown', 'pending', 'confirmed', 'rejected'
        )),
        challenge_json TEXT NOT NULL,
        authorization_json TEXT,
        signer_nonce INTEGER UNIQUE,
        serialized_transaction TEXT,
        tx_id TEXT UNIQUE,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL,
        disposition TEXT
      ) STRICT;
      CREATE INDEX IF NOT EXISTS domain_requests_rate_source
        ON domain_requests(source_address, created_at);
      CREATE INDEX IF NOT EXISTS domain_requests_rate_domain
        ON domain_requests(domain, created_at);
      CREATE INDEX IF NOT EXISTS domain_requests_rate_subject
        ON domain_requests(subject, created_at);
      CREATE INDEX IF NOT EXISTS domain_requests_inflight
        ON domain_requests(attester, subject, state);
      CREATE TABLE IF NOT EXISTS domain_request_history (
        id INTEGER PRIMARY KEY,
        request_id TEXT NOT NULL REFERENCES domain_requests(request_id),
        state TEXT NOT NULL,
        recorded_at INTEGER NOT NULL,
        detail TEXT
      ) STRICT;
    `);
  }

  close() {
    this.database.close();
  }

  private immediate<T>(task: () => T) {
    this.database.exec("BEGIN IMMEDIATE");
    try {
      const result = task();
      this.database.exec("COMMIT");
      return result;
    } catch (error) {
      this.database.exec("ROLLBACK");
      throw error;
    }
  }

  private count(where: string, values: readonly (string | number)[]) {
    const row = this.database
      .prepare(`SELECT COUNT(*) AS count FROM domain_requests WHERE ${where}`)
      .get(...values) as { count: number };
    return row.count;
  }

  issueChallenge(
    challenge: DomainChallenge,
    sourceAddress: string,
    nowSeconds: number,
  ) {
    return this.immediate(() => {
      this.expireStaleUnverifiedInTransaction(nowSeconds);
      const cutoff = nowSeconds - this.rateLimits.windowSeconds;
      const checks: [string, readonly (string | number)[], number, string][] = [
        [
          "source_address = ? AND created_at >= ?",
          [sourceAddress, cutoff],
          this.rateLimits.source,
          "source",
        ],
        [
          "domain = ? AND created_at >= ?",
          [challenge.domain, cutoff],
          this.rateLimits.domain,
          "domain",
        ],
        [
          "subject = ? AND created_at >= ?",
          [challenge.subject, cutoff],
          this.rateLimits.subject,
          "subject",
        ],
        [
          `state IN (${placeholders(OPEN_STATES)})`,
          OPEN_STATES,
          this.rateLimits.globalOpen,
          "global concurrency",
        ],
      ];
      for (const [where, values, limit, name] of checks)
        if (this.count(where, values) >= limit)
          throw new Error(`Domain attester ${name} rate limit exceeded`);
      this.database
        .prepare(
          `INSERT INTO domain_requests (
            request_id, nonce, domain, subject, attester, source_address,
            state, challenge_json, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, 'challenge-issued', ?, ?, ?)`,
        )
        .run(
          challenge.requestId,
          challenge.nonce,
          challenge.domain,
          challenge.subject,
          challenge.attester,
          sourceAddress,
          JSON.stringify(challenge),
          nowSeconds,
          nowSeconds,
        );
      this.recordHistory(challenge.requestId, "challenge-issued", nowSeconds);
      return this.get(challenge.requestId);
    });
  }

  get(requestId: string) {
    const row = this.database
      .prepare("SELECT * FROM domain_requests WHERE request_id = ?")
      .get(requestId) as RequestRow | undefined;
    if (!row) throw new Error("Unknown domain attester request");
    return {
      requestId: row.request_id,
      nonce: row.nonce,
      domain: row.domain,
      subject: row.subject,
      attester: row.attester,
      sourceAddress: row.source_address,
      state: row.state,
      challenge: JSON.parse(row.challenge_json) as DomainChallenge,
      ...(row.authorization_json
        ? {
            authorization: JSON.parse(
              row.authorization_json,
            ) as DomainIssueAuthorization,
          }
        : {}),
      ...(row.signer_nonce === null ? {} : { signerNonce: row.signer_nonce }),
      ...(row.serialized_transaction
        ? { serializedTransaction: row.serialized_transaction }
        : {}),
      ...(row.tx_id ? { txId: row.tx_id } : {}),
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      ...(row.disposition ? { disposition: row.disposition } : {}),
    } satisfies StoredDomainRequest;
  }

  authorize(
    requestId: string,
    authorization: DomainIssueAuthorization,
    nowSeconds: number,
  ) {
    return this.immediate(() => {
      const current = this.get(requestId);
      if (current.state !== "challenge-issued")
        throw new Error("Domain request is not awaiting verification");
      const inFlight = this.count(
        `request_id <> ? AND attester = ? AND subject = ? AND state IN (${placeholders(
          OPEN_STATES.slice(1),
        )})`,
        [requestId, current.attester, current.subject, ...OPEN_STATES.slice(1)],
      );
      if (inFlight > 0)
        throw new Error(
          "An authorization is already in flight for this subject",
        );
      this.updateState(requestId, "verified", nowSeconds);
      this.database
        .prepare(
          "UPDATE domain_requests SET authorization_json = ?, state = 'authorized', updated_at = ? WHERE request_id = ?",
        )
        .run(JSON.stringify(authorization), nowSeconds, requestId);
      this.recordHistory(requestId, "authorized", nowSeconds);
      return this.get(requestId);
    });
  }

  recordSigned(
    requestId: string,
    signed: SignedAuthorization,
    nowSeconds: number,
  ) {
    return this.immediate(() => {
      this.expireStaleUnverifiedInTransaction(nowSeconds);
      const current = this.get(requestId);
      if (current.state === "signed") {
        if (
          current.signerNonce !== signed.signerNonce ||
          current.serializedTransaction !== signed.serializedTransaction ||
          current.txId !== signed.txId
        )
          throw new Error("Signed domain request journal conflict");
        return current;
      }
      const recoverableExpiredAuthorization =
        current.state === "rejected" &&
        current.disposition === "authorization-expired" &&
        current.authorization !== undefined;
      if (current.state !== "authorized" && !recoverableExpiredAuthorization)
        throw new Error("Domain request is not authorized for signing");
      if (signed.requestId !== requestId)
        throw new Error("Signer returned a different request ID");
      if (
        !Number.isSafeInteger(signed.signerNonce) ||
        signed.signerNonce < 0 ||
        !/^(?:[0-9a-f]{2})+$/.test(signed.serializedTransaction) ||
        !/^[0-9a-f]{64}$/.test(signed.txId)
      )
        throw new Error("Signer returned invalid transaction data");
      this.database
        .prepare(
          `UPDATE domain_requests SET
            signer_nonce = ?, serialized_transaction = ?, tx_id = ?,
            state = 'signed', updated_at = ?, disposition = NULL
          WHERE request_id = ?`,
        )
        .run(
          signed.signerNonce,
          signed.serializedTransaction,
          signed.txId,
          nowSeconds,
          requestId,
        );
      this.recordHistory(requestId, "signed", nowSeconds, signed.txId);
      return this.get(requestId);
    });
  }

  transition(
    requestId: string,
    next: "broadcast-unknown" | "pending" | "confirmed" | "rejected",
    nowSeconds: number,
    disposition?: string,
  ) {
    const allowed: Record<typeof next, DomainRequestState[]> = {
      "broadcast-unknown": ["signed", "broadcast-unknown"],
      pending: ["broadcast-unknown", "pending"],
      confirmed: ["broadcast-unknown", "pending", "confirmed"],
      rejected: ["broadcast-unknown", "pending", "rejected"],
    };
    return this.immediate(() => {
      const current = this.get(requestId);
      if (!allowed[next].includes(current.state))
        throw new Error(
          `Invalid domain request transition ${current.state} -> ${next}`,
        );
      if (current.state === next) return current;
      this.database
        .prepare(
          "UPDATE domain_requests SET state = ?, updated_at = ?, disposition = ? WHERE request_id = ?",
        )
        .run(next, nowSeconds, disposition ?? null, requestId);
      this.recordHistory(requestId, next, nowSeconds, disposition);
      return this.get(requestId);
    });
  }

  history(requestId: string) {
    return this.database
      .prepare(
        "SELECT state, recorded_at AS recordedAt, detail FROM domain_request_history WHERE request_id = ? ORDER BY id",
      )
      .all(requestId) as {
      state: DomainRequestState;
      recordedAt: number;
      detail: string | null;
    }[];
  }

  private updateState(
    requestId: string,
    state: DomainRequestState,
    nowSeconds: number,
  ) {
    this.database
      .prepare(
        "UPDATE domain_requests SET state = ?, updated_at = ? WHERE request_id = ?",
      )
      .run(state, nowSeconds, requestId);
    this.recordHistory(requestId, state, nowSeconds);
  }

  expireStale(nowSeconds: number) {
    return this.immediate(() =>
      this.expireStaleUnverifiedInTransaction(nowSeconds),
    );
  }

  private expireStaleUnverifiedInTransaction(nowSeconds: number) {
    const stale = this.database
      .prepare(
        `SELECT request_id AS requestId, state
         FROM domain_requests
         WHERE
           (state = 'challenge-issued' AND
             CAST(json_extract(challenge_json, '$.expiresAt') AS INTEGER) <= ?)
           OR
           (state = 'authorized' AND
             CAST(json_extract(authorization_json, '$.authorizationExpiresAt') AS INTEGER) <= ?)`,
      )
      .all(nowSeconds, nowSeconds) as {
      requestId: string;
      state: "challenge-issued" | "authorized";
    }[];
    for (const request of stale) {
      const disposition =
        request.state === "challenge-issued"
          ? "challenge-expired"
          : "authorization-expired";
      this.database
        .prepare(
          "UPDATE domain_requests SET state = 'rejected', updated_at = ?, disposition = ? WHERE request_id = ?",
        )
        .run(nowSeconds, disposition, request.requestId);
      this.recordHistory(
        request.requestId,
        "rejected",
        nowSeconds,
        disposition,
      );
    }
    return stale.length;
  }

  private recordHistory(
    requestId: string,
    state: DomainRequestState,
    nowSeconds: number,
    detail?: string,
  ) {
    this.database
      .prepare(
        "INSERT INTO domain_request_history (request_id, state, recorded_at, detail) VALUES (?, ?, ?, ?)",
      )
      .run(requestId, state, nowSeconds, detail ?? null);
  }
}
