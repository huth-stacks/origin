import {
  ClarityType,
  type ClarityValue,
  deserializeCV,
  isClarityType,
} from "@stacks/transactions";

import { fetchWithTimeout } from "./fetch-with-timeout";

export interface OriginContractLog {
  eventIndex: number;
  txId: string;
  contractId: string;
  topic: string;
  valueHex: string;
}

export interface OriginLifecycleEvent {
  schemaVersion: 1 | 2;
  kind: "issued" | "revoked";
  attester: string;
  subject: string;
  issuerName?: string;
  role?: string;
  issuedAt?: number;
  expiresAt?: number;
  revoked: boolean;
  revokedAt?: number;
  requestId?: string;
  txId: string;
  eventIndex: number;
  complete: boolean;
}

interface FetchOriginLogPagesArgs {
  apiUrl: string;
  registryPrincipal: string;
  fetchFn?: typeof fetch;
  pageSize?: number;
  maxPages?: number;
  requestTimeoutMs?: number;
  totalTimeoutMs?: number;
  nowFn?: () => number;
}

type OriginLogPageResult =
  | {
      condition: "complete";
      logs: OriginContractLog[];
    }
  | {
      condition: "partial" | "unavailable";
      logs: OriginContractLog[];
      reason:
        | "invalid-response"
        | "network-failure"
        | "cursor-non-progress"
        | "pagination-exhausted";
    };

interface BuildOriginEventIndexArgs {
  registryPrincipal: string;
  schemaVersion: 1 | 2;
  newestFirstLogs: readonly OriginContractLog[];
}

export interface OriginEventIndex {
  events: OriginLifecycleEvent[];
  rejectedEvents: number;
  condition: "complete" | "partial";
}

class InvalidOriginEventError extends Error {}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function parseContractLog(value: unknown): OriginContractLog | null {
  if (!isObject(value)) return null;
  if (
    !Number.isSafeInteger(value.event_index) ||
    typeof value.event_index !== "number" ||
    value.event_index < 0 ||
    value.event_type !== "smart_contract_log" ||
    typeof value.tx_id !== "string" ||
    !/^0x[0-9a-f]{64}$/i.test(value.tx_id) ||
    !isObject(value.contract_log) ||
    typeof value.contract_log.contract_id !== "string" ||
    typeof value.contract_log.topic !== "string" ||
    !isObject(value.contract_log.value) ||
    typeof value.contract_log.value.hex !== "string"
  )
    return null;
  return {
    eventIndex: value.event_index,
    txId: value.tx_id,
    contractId: value.contract_log.contract_id,
    topic: value.contract_log.topic,
    valueHex: value.contract_log.value.hex,
  };
}

function parseLogPage(value: unknown) {
  if (!isObject(value) || !Array.isArray(value.results)) return null;
  const logs = value.results.map(parseContractLog);
  if (logs.some((log) => log === null)) return null;
  if (value.next_cursor !== null && typeof value.next_cursor !== "string")
    return null;
  return {
    logs: logs.filter((log): log is OriginContractLog => log !== null),
    nextCursor: value.next_cursor,
  };
}

export async function fetchOriginLogPages({
  apiUrl,
  registryPrincipal,
  fetchFn = fetch,
  pageSize = 50,
  maxPages = 20,
  requestTimeoutMs = 8_000,
  totalTimeoutMs = 30_000,
  nowFn = () => performance.now(),
}: FetchOriginLogPagesArgs): Promise<OriginLogPageResult> {
  const logs: OriginContractLog[] = [];
  const seenCursors = new Set<string>();
  const startedAt = nowFn();
  let cursor: string | null = null;

  for (let page = 0; page < maxPages; page += 1) {
    const url = new URL(
      `/extended/v2/smart-contracts/${registryPrincipal}/logs`,
      apiUrl,
    );
    url.searchParams.set("limit", String(pageSize));
    if (cursor) url.searchParams.set("cursor", cursor);

    let response: Response;
    try {
      const remainingMs = totalTimeoutMs - (nowFn() - startedAt);
      response = await fetchWithTimeout(
        fetchFn,
        url,
        undefined,
        Math.min(requestTimeoutMs, remainingMs),
      );
    } catch {
      return {
        condition: logs.length === 0 ? "unavailable" : "partial",
        logs,
        reason: "network-failure",
      };
    }
    if (!response.ok)
      return {
        condition: logs.length === 0 ? "unavailable" : "partial",
        logs,
        reason: "network-failure",
      };

    let value: unknown;
    try {
      value = await response.json();
    } catch {
      return {
        condition: logs.length === 0 ? "unavailable" : "partial",
        logs,
        reason: "invalid-response",
      };
    }
    const parsed = parseLogPage(value);
    if (!parsed)
      return {
        condition: logs.length === 0 ? "unavailable" : "partial",
        logs,
        reason: "invalid-response",
      };
    logs.push(...parsed.logs);
    if (parsed.nextCursor === null) return { condition: "complete", logs };
    if (parsed.nextCursor === cursor || seenCursors.has(parsed.nextCursor))
      return {
        condition: "partial",
        logs,
        reason: "cursor-non-progress",
      };
    seenCursors.add(parsed.nextCursor);
    cursor = parsed.nextCursor;
  }

  return {
    condition: "partial",
    logs,
    reason: "pagination-exhausted",
  };
}

function tupleField(value: ClarityValue, field: string) {
  if (!isClarityType(value, ClarityType.Tuple))
    throw new InvalidOriginEventError("Origin event is not a tuple");
  const fieldValue = value.value[field];
  if (!fieldValue)
    throw new InvalidOriginEventError(`Origin event is missing ${field}`);
  return fieldValue;
}

function parseString(value: ClarityValue, field: string) {
  if (!isClarityType(value, ClarityType.StringASCII))
    throw new InvalidOriginEventError(`Origin ${field} is not ASCII`);
  return value.value;
}

function parsePrincipal(value: ClarityValue, field: string) {
  if (
    !isClarityType(value, ClarityType.PrincipalStandard) &&
    !isClarityType(value, ClarityType.PrincipalContract)
  )
    throw new InvalidOriginEventError(`Origin ${field} is not a principal`);
  return value.value;
}

function parseUint(value: ClarityValue, field: string) {
  if (
    !isClarityType(value, ClarityType.UInt) ||
    typeof value.value !== "bigint"
  )
    throw new InvalidOriginEventError(`Origin ${field} is not a uint`);
  if (value.value > BigInt(Number.MAX_SAFE_INTEGER))
    throw new InvalidOriginEventError(`Origin ${field} is too large`);
  return Number(value.value);
}

function parseBool(value: ClarityValue, field: string) {
  if (isClarityType(value, ClarityType.BoolTrue)) return true;
  if (isClarityType(value, ClarityType.BoolFalse)) return false;
  throw new InvalidOriginEventError(`Origin ${field} is not a bool`);
}

function parseOptionalUint(value: ClarityValue, field: string) {
  if (isClarityType(value, ClarityType.OptionalNone)) return undefined;
  if (!isClarityType(value, ClarityType.OptionalSome))
    throw new InvalidOriginEventError(`Origin ${field} is not optional`);
  return parseUint(value.value, field);
}

function parseRequestId(value: ClarityValue) {
  if (
    !isClarityType(value, ClarityType.Buffer) ||
    !/^[0-9a-f]{64}$/i.test(value.value)
  )
    throw new InvalidOriginEventError("Origin request ID is invalid");
  return value.value.toLowerCase();
}

function parseEventTag(value: ClarityValue) {
  return parseString(tupleField(value, "event"), "event tag");
}

function parseV1Event(
  value: ClarityValue,
  log: OriginContractLog,
  precedingIssue?: OriginLifecycleEvent,
): OriginLifecycleEvent {
  const kind = parseEventTag(value);
  const attester = parsePrincipal(tupleField(value, "attester"), "attester");
  const subject = parsePrincipal(tupleField(value, "subject"), "subject");
  if (kind === "origin-attestation-issued")
    return {
      schemaVersion: 1,
      kind: "issued",
      attester,
      subject,
      issuerName: parseString(tupleField(value, "issuer-name"), "issuer name"),
      role: parseString(tupleField(value, "role"), "role"),
      issuedAt: parseUint(tupleField(value, "issued-at"), "issue height"),
      expiresAt: parseUint(
        tupleField(value, "expires-at"),
        "expiration height",
      ),
      revoked: false,
      txId: log.txId,
      eventIndex: log.eventIndex,
      complete: true,
    };
  if (kind !== "origin-attestation-revoked")
    throw new InvalidOriginEventError("Unknown Origin v1 event");
  const matchingIssue =
    precedingIssue?.kind === "issued" &&
    precedingIssue.attester === attester &&
    precedingIssue.subject === subject
      ? precedingIssue
      : undefined;
  return {
    schemaVersion: 1,
    kind: "revoked",
    attester,
    subject,
    issuerName: matchingIssue?.issuerName,
    role: matchingIssue?.role,
    issuedAt: matchingIssue?.issuedAt,
    expiresAt: matchingIssue?.expiresAt,
    revoked: true,
    revokedAt: parseUint(tupleField(value, "revoked-at"), "revocation height"),
    txId: log.txId,
    eventIndex: log.eventIndex,
    complete: matchingIssue !== undefined,
  };
}

function parseV2Event(
  value: ClarityValue,
  log: OriginContractLog,
): OriginLifecycleEvent {
  if (parseUint(tupleField(value, "version"), "schema version") !== 2)
    throw new InvalidOriginEventError("Unexpected Origin v2 schema version");
  const eventTag = parseEventTag(value);
  const kind =
    eventTag === "origin-attestation-issued"
      ? "issued"
      : eventTag === "origin-attestation-revoked"
        ? "revoked"
        : null;
  if (!kind) throw new InvalidOriginEventError("Unknown Origin v2 event");
  const revoked = parseBool(tupleField(value, "revoked"), "revoked flag");
  if ((kind === "issued" && revoked) || (kind === "revoked" && !revoked))
    throw new InvalidOriginEventError(
      "Origin event lifecycle state is inconsistent",
    );
  return {
    schemaVersion: 2,
    kind,
    attester: parsePrincipal(tupleField(value, "attester"), "attester"),
    subject: parsePrincipal(tupleField(value, "subject"), "subject"),
    issuerName: parseString(tupleField(value, "issuer-name"), "issuer name"),
    role: parseString(tupleField(value, "role"), "role"),
    issuedAt: parseUint(tupleField(value, "issued-at"), "issue height"),
    expiresAt: parseUint(tupleField(value, "expires-at"), "expiration height"),
    revoked,
    revokedAt: parseOptionalUint(
      tupleField(value, "revoked-at"),
      "revocation height",
    ),
    requestId: parseRequestId(tupleField(value, "request-id")),
    txId: log.txId,
    eventIndex: log.eventIndex,
    complete: true,
  };
}

export function buildOriginEventIndex({
  registryPrincipal,
  schemaVersion,
  newestFirstLogs,
}: BuildOriginEventIndexArgs): OriginEventIndex {
  const uniqueNewestFirstLogs = newestFirstLogs.filter(
    (log, index, logs) =>
      logs.findIndex(
        (candidate) =>
          candidate.txId === log.txId &&
          candidate.eventIndex === log.eventIndex,
      ) === index,
  );
  const chronologicalLogs = [...uniqueNewestFirstLogs].reverse();
  const events: OriginLifecycleEvent[] = [];
  const latestIssueByClaim = new Map<string, OriginLifecycleEvent>();
  let rejectedEvents = 0;

  for (const log of chronologicalLogs) {
    if (log.contractId !== registryPrincipal || log.topic !== "print") {
      rejectedEvents += 1;
      continue;
    }
    try {
      const value = deserializeCV(log.valueHex);
      const rawAttester = parsePrincipal(
        tupleField(value, "attester"),
        "attester",
      );
      const rawSubject = parsePrincipal(
        tupleField(value, "subject"),
        "subject",
      );
      const claimKey = `${rawAttester}:${rawSubject}`;
      const event =
        schemaVersion === 1
          ? parseV1Event(value, log, latestIssueByClaim.get(claimKey))
          : parseV2Event(value, log);
      events.push(event);
      if (event.kind === "issued") latestIssueByClaim.set(claimKey, event);
    } catch {
      rejectedEvents += 1;
    }
  }

  return {
    events,
    rejectedEvents,
    condition: rejectedEvents === 0 ? "complete" : "partial",
  };
}
