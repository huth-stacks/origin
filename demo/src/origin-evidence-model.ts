import type { OriginCurrentLookup } from "./origin-current-state";
import type { OriginLifecycleEvent } from "./origin-event-index";

export type OriginEvidenceStatus = "active" | "expired" | "revoked" | "missing";

export interface OriginEvidenceClaim {
  key: string;
  attester: string;
  subject: string;
  issuerName: string;
  role: string;
  issuedAt?: number;
  expiresAt?: number;
  revokedAt?: number;
  requestId?: string;
  recognized: boolean;
  status: OriginEvidenceStatus;
  history: OriginLifecycleEvent[];
}

interface BuildOriginEvidenceClaimsArgs {
  events: readonly OriginLifecycleEvent[];
  lookups: readonly OriginCurrentLookup[];
  burnBlockHeight: number;
  trustedAttesters: readonly string[];
}

export function sanitizeEvidenceText(value: string, maxLength: number) {
  const stripped = value.replaceAll(/[\u0000-\u001f\u007f-\u009f]/g, "");
  const characters = Array.from(stripped);
  return characters.length <= maxLength
    ? stripped
    : `${characters.slice(0, Math.max(0, maxLength - 1)).join("")}…`;
}

function claimKey(attester: string, subject: string) {
  return `${attester}:${subject}`;
}

export function buildOriginEvidenceClaims({
  events,
  lookups,
  burnBlockHeight,
  trustedAttesters,
}: BuildOriginEvidenceClaimsArgs) {
  const historyByClaim = new Map<string, OriginLifecycleEvent[]>();
  for (const event of events) {
    const key = claimKey(event.attester, event.subject);
    historyByClaim.set(key, [...(historyByClaim.get(key) ?? []), event]);
  }
  const currentByClaim = new Map(
    lookups.map((lookup) => [
      claimKey(lookup.attester, lookup.subject),
      lookup,
    ]),
  );
  return [...historyByClaim.entries()]
    .map(([key, history]): OriginEvidenceClaim => {
      const latestEvent = history.at(-1);
      if (!latestEvent) throw new Error("Origin claim history is empty");
      const current = currentByClaim.get(key)?.claim ?? null;
      const status: OriginEvidenceStatus = !current
        ? "missing"
        : current.revoked
          ? "revoked"
          : current.expiresAt <= burnBlockHeight
            ? "expired"
            : "active";
      return {
        key,
        attester: latestEvent.attester,
        subject: latestEvent.subject,
        issuerName: sanitizeEvidenceText(
          current?.issuerName ?? latestEvent.issuerName ?? "Unavailable",
          64,
        ),
        role: sanitizeEvidenceText(
          current?.role ?? latestEvent.role ?? "Unavailable",
          32,
        ),
        issuedAt: current?.issuedAt ?? latestEvent.issuedAt,
        expiresAt: current?.expiresAt ?? latestEvent.expiresAt,
        revokedAt: current?.revokedAt ?? latestEvent.revokedAt,
        requestId: current?.requestId ?? latestEvent.requestId,
        recognized: trustedAttesters.includes(latestEvent.attester),
        status,
        history,
      };
    })
    .sort(
      (left, right) =>
        (right.issuedAt ?? Number.MIN_SAFE_INTEGER) -
        (left.issuedAt ?? Number.MIN_SAFE_INTEGER),
    );
}

export function filterOriginEvidenceClaims(
  claims: readonly OriginEvidenceClaim[],
  query: string,
) {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return claims;
  return claims.filter(
    (claim) =>
      claim.subject.toLowerCase() === normalized ||
      claim.attester.toLowerCase() === normalized ||
      claim.history.some((event) => event.txId.toLowerCase() === normalized),
  );
}
