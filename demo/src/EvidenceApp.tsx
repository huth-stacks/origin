import { useEffect, useMemo, useState } from "react";

import fixtures from "../../deployments/testnet-fixtures.json";
import profileSource from "./origin-attester-profile.json";
import {
  buildOriginEvidenceClaims,
  filterOriginEvidenceClaims,
  sanitizeEvidenceText,
  type OriginEvidenceClaim,
} from "./origin-evidence-model";
import { readOriginCurrentState } from "./origin-current-state";
import {
  buildOriginEventIndex,
  fetchOriginLogPages,
} from "./origin-event-index";

const EXPLORER_ADDRESS = "https://explorer.hiro.so/address";
const EXPLORER_TRANSACTION = "https://explorer.hiro.so/txid";

interface AttesterProfile {
  version: number;
  network: string;
  displayName: string;
  operator: string;
  status: string;
  verificationMethod: string;
  policyVersion: string;
  policyEffectiveDate: string;
  supportedClaimTypes: string[];
  evidenceFormat: string;
  revocationPolicy: string;
  responseTarget: string;
  securityContact: string;
  principals: {
    principal: string;
    validFromBurnBlock: number;
    maxClaimLifetimeBurnBlocks: number;
    state: string;
  }[];
  rotationHistory: { principal: string; note: string }[];
}

type EvidenceLoadState =
  | { kind: "loading" }
  | { kind: "unavailable"; message: string }
  | {
      kind: "ready";
      claims: OriginEvidenceClaim[];
      burnBlockHeight: number;
      condition: "complete" | "partial";
      rejectedEvents: number;
    };

interface EvidenceViewProps {
  loadState: EvidenceLoadState;
  onRefresh?: () => void;
}

const profile = profileSource as AttesterProfile;
const schemaVersion = fixtures.compatibility.registry.schemaVersion as 1 | 2;
const trustedAttesters = fixtures.compatibility.trustedAttesters.map(
  (attester) => attester.principal,
);

function truncateMiddle(value: string, head = 8, tail = 6) {
  if (value.length <= head + tail + 1) return value;
  return `${value.slice(0, head)}…${value.slice(-tail)}`;
}

function OriginSeal() {
  return (
    <span aria-hidden="true" className="evidence-seal">
      O
    </span>
  );
}

function ExplorerLink({ principal }: { principal: string }) {
  return (
    <a
      href={`${EXPLORER_ADDRESS}/${principal}?chain=testnet`}
      rel="noreferrer"
      target="_blank"
    >
      Explorer ↗
    </a>
  );
}

function ClaimStatus({ claim }: { claim: OriginEvidenceClaim }) {
  const label =
    claim.status === "active"
      ? "Active"
      : claim.status === "expired"
        ? "Expired"
        : claim.status === "revoked"
          ? "Revoked"
          : "Current state missing";
  return (
    <span className="evidence-status" data-status={claim.status}>
      <span aria-hidden="true" />
      {label}
    </span>
  );
}

function ClaimRecord({ claim }: { claim: OriginEvidenceClaim }) {
  const latestIssueIndex = claim.history.findLastIndex(
    (event) => event.kind === "issued",
  );
  return (
    <article className="evidence-claim" data-recognized={claim.recognized}>
      <div className="evidence-claim-heading">
        <div>
          <p className="evidence-eyebrow">
            {claim.recognized
              ? "Wallet-recognized attester"
              : "Unrecognized attester"}
          </p>
          <h3>{truncateMiddle(claim.subject, 18, 14)}</h3>
        </div>
        <ClaimStatus claim={claim} />
      </div>

      {!claim.recognized ? (
        <p className="evidence-unrecognized" role="note">
          This issuer is not in the wallet&rsquo;s trust policy. Claim-supplied
          identity text is displayed only as quarantined registry evidence.
        </p>
      ) : null}

      <dl className="evidence-claim-grid">
        <div>
          <dt>Exact subject</dt>
          <dd className="evidence-mono">{claim.subject}</dd>
        </div>
        <div>
          <dt>Attester</dt>
          <dd>
            <span className="evidence-mono">{claim.attester}</span>
            {claim.recognized ? (
              <a className="evidence-profile-jump" href="#profile">
                Approved profile ↑
              </a>
            ) : null}
          </dd>
        </div>
        <div>
          <dt>{claim.recognized ? "Organization" : "Claim-supplied name"}</dt>
          <dd data-untrusted={claim.recognized ? undefined : "true"}>
            {claim.issuerName}
          </dd>
        </div>
        <div>
          <dt>{claim.recognized ? "Role" : "Claim-supplied role"}</dt>
          <dd data-untrusted={claim.recognized ? undefined : "true"}>
            {claim.role}
          </dd>
        </div>
        <div>
          <dt>Issued / expires</dt>
          <dd className="evidence-mono">
            {claim.issuedAt ?? "—"} / {claim.expiresAt ?? "—"}
          </dd>
        </div>
        <div>
          <dt>On-chain evidence</dt>
          <dd className="evidence-links">
            <ExplorerLink principal={claim.attester} />
            <a
              href={`${EXPLORER_TRANSACTION}/${claim.history.at(-1)?.txId}?chain=testnet`}
              rel="noreferrer"
              target="_blank"
            >
              Latest event ↗
            </a>
          </dd>
        </div>
      </dl>

      <details className="evidence-history">
        <summary>
          Lifecycle history <span>{claim.history.length}</span>
        </summary>
        <ol>
          {claim.history.map((event, index) => (
            <li key={`${event.txId}:${event.eventIndex}`}>
              <span className="evidence-history-kind">
                {event.kind === "issued" && index < latestIssueIndex
                  ? "Replaced"
                  : event.kind === "issued"
                    ? "Issued"
                    : "Revoked"}
              </span>
              <span className="evidence-mono">
                burn {event.revokedAt ?? event.issuedAt ?? "unknown"}
              </span>
              <a
                href={`${EXPLORER_TRANSACTION}/${event.txId}?chain=testnet`}
                rel="noreferrer"
                target="_blank"
              >
                {truncateMiddle(event.txId)} ↗
              </a>
            </li>
          ))}
        </ol>
      </details>
    </article>
  );
}

export function EvidenceView({ loadState, onRefresh }: EvidenceViewProps) {
  const [query, setQuery] = useState("");
  const visibleClaims = useMemo(
    () =>
      loadState.kind === "ready"
        ? filterOriginEvidenceClaims(loadState.claims, query)
        : [],
    [loadState, query],
  );

  return (
    <div className="evidence-page">
      <header className="evidence-header">
        <a className="evidence-wordmark" href="#evidence-top">
          <OriginSeal />
          <span>Origin evidence</span>
        </a>
        <nav aria-label="Evidence sections">
          <a href="#profile">Attester</a>
          <a href="#claims">Claims</a>
        </nav>
        <p>
          <span aria-hidden="true" /> Stacks Testnet
        </p>
      </header>

      <main id="evidence-top">
        <section className="evidence-intro" aria-labelledby="evidence-title">
          <p className="evidence-kicker">Public Testnet evidence</p>
          <h1 id="evidence-title">{profile.displayName}</h1>
          <p className="evidence-intro-copy">
            Who the wallet recognizes, what this attester checks, and the exact
            claims it has placed on chain.
          </p>
          <p className="evidence-caveat">
            Provenance is not a safety guarantee. This operator profile is
            explanatory; Leather&rsquo;s bundled policy remains authoritative.
          </p>
        </section>

        <div className="evidence-workspace">
          <aside className="evidence-profile" id="profile">
            <div className="evidence-profile-heading">
              <p className="evidence-eyebrow">Attester profile</p>
              <p className="evidence-profile-state">Active demo</p>
            </div>
            <dl>
              <div>
                <dt>Operator</dt>
                <dd>{profile.operator}</dd>
              </div>
              <div>
                <dt>Verification method</dt>
                <dd>{profile.verificationMethod}</dd>
              </div>
              <div>
                <dt>Policy</dt>
                <dd>
                  {profile.policyVersion} · {profile.policyEffectiveDate}
                </dd>
              </div>
              <div>
                <dt>Current principal</dt>
                <dd className="evidence-mono">
                  {profile.principals[0]?.principal}
                </dd>
              </div>
              <div>
                <dt>Claim lifetime cap</dt>
                <dd>
                  {profile.principals[0]?.maxClaimLifetimeBurnBlocks.toLocaleString()}
                  &nbsp;burn blocks
                </dd>
              </div>
              <div>
                <dt>Revocation</dt>
                <dd>{profile.revocationPolicy}</dd>
              </div>
            </dl>
            <div className="evidence-profile-links">
              {profile.principals[0] ? (
                <ExplorerLink principal={profile.principals[0].principal} />
              ) : null}
              <a href="/origin-attester-profile.json">Machine profile ↗</a>
              <a
                href={profile.securityContact}
                rel="noreferrer"
                target="_blank"
              >
                Security contact ↗
              </a>
            </div>
            <p className="evidence-rotation">
              <strong>Rotation note.</strong> {profile.rotationHistory[0]?.note}
            </p>
          </aside>

          <section className="evidence-claims" id="claims">
            <div className="evidence-claims-head">
              <div>
                <p className="evidence-eyebrow">Registry explorer</p>
                <h2>Claims and lifecycle</h2>
              </div>
              {loadState.kind === "ready" ? (
                <p className="evidence-freshness">
                  Current state read at burn {loadState.burnBlockHeight}
                </p>
              ) : null}
            </div>

            <label className="evidence-search">
              <span>Exact subject, attester, or registry transaction</span>
              <input
                autoComplete="off"
                onChange={(event) => setQuery(event.target.value)}
                placeholder="ST…contract or 0x…"
                spellCheck="false"
                type="search"
                value={query}
              />
            </label>

            {loadState.kind === "loading" ? (
              <div aria-live="polite" className="evidence-loading">
                <span aria-hidden="true" /> Reading registry events and current
                map state…
              </div>
            ) : null}

            {loadState.kind === "unavailable" ? (
              <div className="evidence-unavailable" role="alert">
                <p>Registry evidence is unavailable.</p>
                <span>{sanitizeEvidenceText(loadState.message, 160)}</span>
                {onRefresh ? (
                  <button onClick={onRefresh} type="button">
                    Try again
                  </button>
                ) : null}
              </div>
            ) : null}

            {loadState.kind === "ready" ? (
              <>
                {loadState.condition === "partial" ? (
                  <p className="evidence-partial" role="status">
                    History is partial. Current map reads remain the source of
                    truth; no trusted conclusion is inferred from missing
                    events. Rejected events: {loadState.rejectedEvents}.
                  </p>
                ) : null}
                <p className="evidence-results" aria-live="polite">
                  {visibleClaims.length} exact claim
                  {visibleClaims.length === 1 ? "" : "s"}
                </p>
                <div className="evidence-claim-list">
                  {visibleClaims.map((claim) => (
                    <ClaimRecord claim={claim} key={claim.key} />
                  ))}
                  {visibleClaims.length === 0 ? (
                    <p className="evidence-empty">
                      No indexed registry claim exactly matches that value.
                    </p>
                  ) : null}
                </div>
              </>
            ) : null}
          </section>
        </div>
      </main>

      <footer className="evidence-footer">
        <p>Origin · Testnet provenance evidence</p>
        <div>
          <ExplorerLink principal={fixtures.registry.principal} />
          <a href="https://github.com/huth-stacks/origin">Source ↗</a>
        </div>
      </footer>
    </div>
  );
}

export function EvidenceApp() {
  const [refresh, setRefresh] = useState(0);
  const [loadState, setLoadState] = useState<EvidenceLoadState>({
    kind: "loading",
  });

  useEffect(() => {
    const description = document.querySelector<HTMLMetaElement>(
      'meta[name="description"]',
    );
    const theme = document.querySelector<HTMLMetaElement>(
      'meta[name="theme-color"]',
    );
    const originalDescription = description?.content;
    const originalTheme = theme?.content;
    document.title = "Origin Testnet Evidence";
    if (description)
      description.content =
        "Public Stacks Testnet attester profile and on-chain Origin claim evidence.";
    if (theme) theme.content = "#F3EFE6";
    document.documentElement.dataset.surface = "evidence";
    return () => {
      if (description && originalDescription)
        description.content = originalDescription;
      if (theme && originalTheme) theme.content = originalTheme;
      delete document.documentElement.dataset.surface;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    setLoadState({ kind: "loading" });
    void (async () => {
      try {
        const pages = await fetchOriginLogPages({
          apiUrl: fixtures.apiUrl,
          registryPrincipal: fixtures.registry.principal,
        });
        if (pages.condition === "unavailable")
          throw new Error(
            "Registry event endpoint did not return a complete response",
          );
        const index = buildOriginEventIndex({
          registryPrincipal: fixtures.registry.principal,
          schemaVersion,
          newestFirstLogs: pages.logs,
        });
        const current = await readOriginCurrentState({
          apiUrl: fixtures.apiUrl,
          registryPrincipal: fixtures.registry.principal,
          schemaVersion,
          pairs: index.events.map((event) => ({
            attester: event.attester,
            subject: event.subject,
          })),
        });
        if (cancelled) return;
        setLoadState({
          kind: "ready",
          claims: buildOriginEvidenceClaims({
            events: index.events,
            lookups: current.lookups,
            burnBlockHeight: current.burnBlockHeight,
            trustedAttesters,
          }),
          burnBlockHeight: current.burnBlockHeight,
          condition:
            pages.condition === "partial" ||
            index.condition === "partial" ||
            current.truncated
              ? "partial"
              : "complete",
          rejectedEvents: index.rejectedEvents,
        });
      } catch {
        if (cancelled) return;
        setLoadState({
          kind: "unavailable",
          message:
            "The registry event or current-state endpoint did not return complete, verifiable data.",
        });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [refresh]);

  return (
    <EvidenceView
      loadState={loadState}
      onRefresh={() => setRefresh((value) => value + 1)}
    />
  );
}
