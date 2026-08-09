import {
  ClarityType,
  type ClarityValue,
  fetchCallReadOnlyFunction,
  isClarityType,
  principalCV,
} from "@stacks/transactions";

import { fetchJsonWithTimeout } from "./fetch-with-timeout";

export interface OriginClaimPair {
  attester: string;
  subject: string;
}

export interface OriginCurrentClaim extends OriginClaimPair {
  issuerName: string;
  role: string;
  issuedAt: number;
  expiresAt: number;
  revoked: boolean;
  revokedAt?: number;
  requestId?: string;
}

export interface OriginCurrentLookup extends OriginClaimPair {
  claim: OriginCurrentClaim | null;
}

interface ReadOriginCurrentStateArgs {
  apiUrl: string;
  registryPrincipal: string;
  schemaVersion: 1 | 2;
  pairs: readonly OriginClaimPair[];
  fetchFn?: typeof fetch;
  requestTimeoutMs?: number;
  maxPairs?: number;
}

class InvalidOriginCurrentStateError extends Error {}

function tupleField(value: ClarityValue, field: string) {
  if (!isClarityType(value, ClarityType.Tuple))
    throw new InvalidOriginCurrentStateError("Invalid Origin attestation");
  const fieldValue = value.value[field];
  if (!fieldValue)
    throw new InvalidOriginCurrentStateError(
      `Origin attestation is missing ${field}`,
    );
  return fieldValue;
}

function parseString(value: ClarityValue, field: string) {
  if (!isClarityType(value, ClarityType.StringASCII))
    throw new InvalidOriginCurrentStateError(`Invalid Origin ${field}`);
  return value.value;
}

function parseUint(value: ClarityValue, field: string) {
  if (!isClarityType(value, ClarityType.UInt))
    throw new InvalidOriginCurrentStateError(`Invalid Origin ${field}`);
  const parsed = BigInt(value.value);
  if (parsed > BigInt(Number.MAX_SAFE_INTEGER))
    throw new InvalidOriginCurrentStateError(`Origin ${field} is too large`);
  return Number(parsed);
}

function parseOptionalUint(value: ClarityValue, field: string) {
  if (isClarityType(value, ClarityType.OptionalNone)) return undefined;
  if (!isClarityType(value, ClarityType.OptionalSome))
    throw new InvalidOriginCurrentStateError(`Invalid Origin ${field}`);
  return parseUint(value.value, field);
}

function parseRequestId(value: ClarityValue) {
  if (
    !isClarityType(value, ClarityType.Buffer) ||
    !/^[0-9a-f]{64}$/i.test(value.value)
  )
    throw new InvalidOriginCurrentStateError("Invalid Origin request ID");
  return value.value.toLowerCase();
}

export function parseOriginCurrentClaim(
  value: ClarityValue,
  pair: OriginClaimPair,
  schemaVersion: 1 | 2,
): OriginCurrentClaim | null {
  if (isClarityType(value, ClarityType.OptionalNone)) return null;
  if (!isClarityType(value, ClarityType.OptionalSome))
    throw new InvalidOriginCurrentStateError("Invalid Origin lookup");
  const claim = value.value;
  const revokedValue = tupleField(claim, "revoked");
  if (
    !isClarityType(revokedValue, ClarityType.BoolTrue) &&
    !isClarityType(revokedValue, ClarityType.BoolFalse)
  )
    throw new InvalidOriginCurrentStateError("Invalid Origin revocation flag");
  return {
    ...pair,
    issuerName: parseString(tupleField(claim, "issuer-name"), "issuer name"),
    role: parseString(tupleField(claim, "role"), "role"),
    issuedAt: parseUint(tupleField(claim, "issued-at"), "issue height"),
    expiresAt: parseUint(tupleField(claim, "expires-at"), "expiration height"),
    revoked: isClarityType(revokedValue, ClarityType.BoolTrue),
    ...(schemaVersion === 2
      ? {
          revokedAt: parseOptionalUint(
            tupleField(claim, "revoked-at"),
            "revocation height",
          ),
          requestId: parseRequestId(tupleField(claim, "request-id")),
        }
      : {}),
  };
}

async function withDeadline<T>(
  timeoutMs: number,
  task: (signal: AbortSignal) => Promise<T>,
) {
  const controller = new AbortController();
  let timeout: ReturnType<typeof setTimeout> | undefined;
  const deadline = new Promise<never>((_, reject) => {
    timeout = setTimeout(() => {
      controller.abort();
      reject(new Error("Origin current-state deadline exceeded"));
    }, timeoutMs);
  });
  try {
    return await Promise.race([task(controller.signal), deadline]);
  } finally {
    if (timeout) clearTimeout(timeout);
  }
}

export async function readOriginCurrentState({
  apiUrl,
  registryPrincipal,
  schemaVersion,
  pairs,
  fetchFn = fetch,
  requestTimeoutMs = 8_000,
  maxPairs = 100,
}: ReadOriginCurrentStateArgs) {
  const separator = registryPrincipal.indexOf(".");
  if (separator <= 0 || separator === registryPrincipal.length - 1)
    throw new Error("Invalid Origin registry principal");
  const contractAddress = registryPrincipal.slice(0, separator);
  const contractName = registryPrincipal.slice(separator + 1);
  const seenPairs = new Set<string>();
  const uniquePairs = pairs.filter((pair) => {
    const key = `${pair.attester}\u0000${pair.subject}`;
    if (seenPairs.has(key)) return false;
    seenPairs.add(key);
    return true;
  });
  const boundedPairs = uniquePairs.slice(0, maxPairs);
  const [info, lookups] = await Promise.all([
    fetchJsonWithTimeout(
      fetchFn,
      `${apiUrl}/v2/info`,
      undefined,
      requestTimeoutMs,
    ),
    Promise.all(
      boundedPairs.map((pair) =>
        withDeadline(requestTimeoutMs, async (signal) => {
          const boundedFetch: typeof fetch = (input, init) =>
            fetchFn(input, {
              ...init,
              signal: init?.signal
                ? AbortSignal.any([signal, init.signal])
                : signal,
            });
          const value = await fetchCallReadOnlyFunction({
            contractAddress,
            contractName,
            functionName: "get-attestation",
            functionArgs: [
              principalCV(pair.attester),
              principalCV(pair.subject),
            ],
            senderAddress: pair.subject.split(".")[0] ?? contractAddress,
            network: "testnet",
            client: { baseUrl: apiUrl, fetch: boundedFetch },
          });
          return {
            ...pair,
            claim: parseOriginCurrentClaim(value, pair, schemaVersion),
          };
        }),
      ),
    ),
  ]);
  if (!info.ok || info.bodyError)
    throw new Error("Origin burn-height lookup unavailable");
  const infoValue = info.value;
  if (
    typeof infoValue !== "object" ||
    infoValue === null ||
    !("burn_block_height" in infoValue) ||
    !Number.isSafeInteger(infoValue.burn_block_height) ||
    typeof infoValue.burn_block_height !== "number"
  )
    throw new Error("Origin burn-height lookup returned invalid data");
  return {
    burnBlockHeight: infoValue.burn_block_height,
    lookups,
    truncated: uniquePairs.length > maxPairs,
  };
}
