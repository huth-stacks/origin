import { Fragment, useEffect, useState } from "react";

import {
  demoScenarios,
  type DemoScenario,
  type DemoScenarioId,
} from "./demo-scenarios";
import {
  connectLeather,
  findLeatherProvider,
  LeatherTimeoutError,
  readStxAddress,
  readTxId,
  requestDemoContractCall,
  withTimeout,
} from "./leather-provider";

const EXPLORER = "https://explorer.hiro.so/txid";
const ACME_ACTION = "ST14T2RC089K364JC6VX1310NER40F17FNCY8WPDY.acme-action";
const ORIGIN_REGISTRY =
  "ST14T2RC089K364JC6VX1310NER40F17FNCY8WPDY.origin-registry";
const SEASON_WEEKS = 12;
const THIS_WEEK = 10;
const REQUEST_TIMEOUT_MS = 45_000;

type ConnectionStatus =
  "ready" | "connecting" | "connected" | "declined" | "unavailable";

interface Connection {
  status: ConnectionStatus;
  address?: string;
}

type OutcomeKind =
  "idle" | "pending" | "confirmed" | "declined" | "unavailable";

interface Outcome {
  kind: OutcomeKind;
  txid?: string;
  at?: Date;
}

interface ActivityEntry {
  key: string;
  when: string;
  action: string;
  host: string;
  hash?: string;
  txid?: string;
}

const seededActivity: ActivityEntry[] = [
  {
    key: "sample-3",
    when: "Mon 20 Jul",
    action: "Weekly check-in",
    host: "acme.example",
    hash: "0x4c91…d0a7",
  },
  {
    key: "sample-2",
    when: "Mon 13 Jul",
    action: "Weekly check-in",
    host: "acme.example",
    hash: "0xb7e2…5f14",
  },
  {
    key: "sample-1",
    when: "Mon 6 Jul",
    action: "Weekly check-in",
    host: "acme.example",
    hash: "0x1d38…9ac6",
  },
];

const idleOutcomes: Record<DemoScenarioId, Outcome> = {
  known: { kind: "idle" },
  unrecognized: { kind: "idle" },
  lookalike: { kind: "idle" },
};

function truncateMiddle(value: string, head: number, tail: number) {
  if (value.length <= head + tail + 1) return value;
  return `${value.slice(0, head)}…${value.slice(-tail)}`;
}

function clockTime(at: Date) {
  const hours = `${at.getHours()}`.padStart(2, "0");
  const minutes = `${at.getMinutes()}`.padStart(2, "0");
  return `${hours}:${minutes}`;
}

function groupByFour(address: string) {
  return address.match(/.{1,4}/g) ?? [address];
}

function AcmeMark({ size }: { size: number }) {
  return (
    <svg
      className="acme-mark"
      width={size}
      height={size}
      viewBox="0 0 20 20"
      aria-hidden="true"
      focusable="false"
    >
      <rect width="20" height="20" rx="4" fill="#241b5e" />
      <path
        d="M3 4.3q7 -2.4 14 0"
        fill="none"
        stroke="#ffffff"
        strokeWidth="1"
        opacity="0.5"
      />
      <path
        d="M3 15.7q7 2.4 14 0"
        fill="none"
        stroke="#ffffff"
        strokeWidth="1"
        opacity="0.5"
      />
      <text x="10" y="13.9" textAnchor="middle" fill="#ffffff">
        A
      </text>
    </svg>
  );
}

function EnvelopeGlyph() {
  return (
    <svg
      className="from-glyph"
      width="14"
      height="14"
      viewBox="0 0 14 14"
      aria-hidden="true"
      focusable="false"
    >
      <rect
        x="0.5"
        y="2.5"
        width="13"
        height="9"
        fill="none"
        stroke="currentColor"
      />
      <path d="M0.5 3 7 8 13.5 3" fill="none" stroke="currentColor" />
    </svg>
  );
}

function AddressGroups({
  address,
  suffix,
}: {
  address: string;
  suffix?: string;
}) {
  return (
    <span className="address">
      {groupByFour(address).map((group, index) => (
        <Fragment key={`${group}-${index}`}>
          {index > 0 ? " " : null}
          <span className="address-group">{group}</span>
        </Fragment>
      ))}
      {suffix ? <span className="address-group">.{suffix}</span> : null}
    </span>
  );
}

function StreakSheet({ stamped }: { stamped: number }) {
  return (
    <section className="panel streak" aria-labelledby="streak-season">
      <p className="panel-head" id="streak-season">
        2026 season
      </p>
      <ul className="streak-grid" role="list">
        {Array.from({ length: SEASON_WEEKS }, (_, index) => index + 1).map(
          (week) => {
            const filled = week <= stamped;
            const current = !filled && week === THIS_WEEK;
            return (
              <li key={week}>
                <span
                  aria-label={`Week ${week}, ${filled ? "stamped" : "not yet"}`}
                  className="stamp"
                  data-state={filled ? "filled" : current ? "current" : "empty"}
                  role="img"
                >
                  <span aria-hidden="true">{week}</span>
                </span>
              </li>
            );
          },
        )}
      </ul>
      <p className="panel-foot">{stamped} of 12 stamps · resets Monday</p>
    </section>
  );
}

function WaitingBlock() {
  return (
    <div className="waiting">
      <div className="waiting-track">
        <span className="waiting-indicator" />
      </div>
      <p className="waiting-caption">
        <span className="waiting-glyph" aria-hidden="true" />
        Waiting for Leather.
      </p>
    </div>
  );
}

function OutcomeLine({ outcome }: { outcome: Outcome }) {
  if (outcome.kind === "confirmed") {
    return (
      <>
        <span aria-hidden="true" className="dot dot-confirmed" />
        <span>Checked in</span>
        {outcome.txid ? (
          <>
            <span className="outcome-sep">·</span>
            <span className="outcome-txid">
              {truncateMiddle(outcome.txid, 6, 4)}
            </span>
            <a
              className="outcome-link"
              href={`${EXPLORER}/${outcome.txid}?chain=testnet`}
              rel="noreferrer"
              target="_blank"
            >
              View on explorer ↗
            </a>
          </>
        ) : null}
      </>
    );
  }

  if (outcome.kind === "declined") {
    return (
      <>
        <span aria-hidden="true" className="dot dot-open" />
        <span>Declined in Leather. Nothing was signed.</span>
      </>
    );
  }

  if (outcome.kind === "unavailable") {
    return (
      <>
        <span aria-hidden="true" className="dot dot-open" />
        <span>Leather was not detected in this browser.</span>
      </>
    );
  }

  return null;
}

export function App() {
  const [connection, setConnection] = useState<Connection>({
    status: "ready",
  });
  const [outcomes, setOutcomes] =
    useState<Record<DemoScenarioId, Outcome>>(idleOutcomes);
  const [pendingId, setPendingId] = useState<DemoScenarioId | null>(null);
  const [stamped, setStamped] = useState(9);
  const [activity, setActivity] = useState<ActivityEntry[]>([]);

  useEffect(() => {
    if (pendingId) {
      document.body.dataset.handoff = "true";
    } else {
      delete document.body.dataset.handoff;
    }
  }, [pendingId]);

  function setOutcome(id: DemoScenarioId, outcome: Outcome) {
    setOutcomes((current) => ({ ...current, [id]: outcome }));
  }

  async function connectWallet() {
    const provider = findLeatherProvider();
    if (!provider) {
      setConnection({ status: "unavailable" });
      return;
    }

    setConnection({ status: "connecting" });
    try {
      const address = readStxAddress(await connectLeather(provider));
      setConnection({ status: "connected", address });
    } catch {
      setConnection({ status: "declined" });
    }
  }

  async function checkIn(scenario: DemoScenario) {
    if (connection.status === "connecting") return;
    const provider = findLeatherProvider();
    if (!provider) {
      setConnection({ status: "unavailable" });
      setOutcome(scenario.id, { kind: "unavailable" });
      return;
    }

    setPendingId(scenario.id);
    setOutcome(scenario.id, { kind: "pending" });

    if (connection.status !== "connected") {
      setConnection({ status: "connecting" });
      try {
        const address = readStxAddress(await connectLeather(provider));
        setConnection({ status: "connected", address });
      } catch {
        // Never chase a refused connection with a second popup.
        setConnection({ status: "declined" });
        setOutcome(scenario.id, { kind: "declined" });
        setPendingId(null);
        return;
      }
    }

    try {
      const response = await withTimeout(
        requestDemoContractCall(provider, scenario),
        REQUEST_TIMEOUT_MS,
      );
      const txid = readTxId(response);
      const at = new Date();
      setOutcome(scenario.id, { kind: "confirmed", txid, at });
      setStamped((weeks) => Math.max(weeks, scenario.stampWeek));
      setActivity((rows) => [
        {
          key: `${scenario.id}-${at.getTime()}`,
          when: clockTime(at),
          action: scenario.actionTitle,
          host: scenario.from,
          hash: txid ? truncateMiddle(txid, 6, 4) : undefined,
          txid,
        },
        ...rows,
      ]);
    } catch (error) {
      setOutcome(
        scenario.id,
        error instanceof LeatherTimeoutError
          ? { kind: "idle" }
          : { kind: "declined" },
      );
    } finally {
      setPendingId(null);
    }
  }

  const connected = connection.status === "connected";
  const openLinks = demoScenarios.filter(
    (scenario) => outcomes[scenario.id].kind !== "confirmed",
  ).length;
  const notice =
    connection.status === "declined"
      ? "Connection declined in Leather. Connect whenever you're ready."
      : connection.status === "unavailable"
        ? "Leather was not detected in this browser."
        : null;

  return (
    <>
      <header className="app-bar reveal-chrome">
        <div className="app-bar-inner">
          <a className="wordmark" href="#top">
            <AcmeMark size={20} />
            <span>Acme</span>
          </a>
          <nav className="site-nav" aria-label="Sections">
            <a aria-current="page" href="#">
              Overview
            </a>
            <a href="#activity">Activity</a>
            <a href="#">Help</a>
          </nav>
          <div className="app-bar-right">
            <p className="network">
              <span aria-hidden="true" className="dot dot-live" />
              Stacks Testnet
            </p>
            <div aria-live="polite" className="wallet">
              {connected ? (
                <div className="wallet-connected">
                  <AcmeMark size={20} />
                  <span>
                    <span className="wallet-line">Leather connected</span>
                    <span className="wallet-address">
                      {connection.address
                        ? truncateMiddle(connection.address, 4, 4)
                        : "Stacks Testnet"}
                    </span>
                  </span>
                </div>
              ) : (
                <button
                  className="wallet-button"
                  disabled={connection.status === "connecting"}
                  onClick={() => void connectWallet()}
                  type="button"
                >
                  {connection.status === "connecting" ? (
                    <>
                      Approve in Leather
                      <span aria-hidden="true" className="marquee">
                        <span />
                        <span />
                        <span />
                      </span>
                    </>
                  ) : (
                    "Connect Leather"
                  )}
                </button>
              )}
            </div>
          </div>
        </div>
      </header>

      <div className="reveal-content">
        <main className="shell" id="top">
          <section className="hero" aria-labelledby="hero-title">
            <div className="hero-copy">
              <p className="label">Your streak</p>
              <h1 id="hero-title">
                {stamped >= THIS_WEEK
                  ? "Ten weeks in a row."
                  : "Nine weeks in a row."}
              </h1>
              <p className="hero-body">
                {stamped >= THIS_WEEK
                  ? "This week's stamp is pressed. The streak is safe until Monday."
                  : "Check in once this week to keep it going. A check-in records that you showed up. No tokens move."}
              </p>
              <p className="hero-meta">Started 3 June · Stacks Testnet</p>
              {notice ? (
                <p className="notice">
                  {notice}
                  {connection.status === "unavailable" ? (
                    <a
                      href="https://leather.io/install-extension"
                      rel="noreferrer"
                      target="_blank"
                    >
                      Get Leather ↗
                    </a>
                  ) : null}
                </p>
              ) : null}
            </div>
            <StreakSheet stamped={stamped} />
          </section>

          <section className="requests" aria-labelledby="requests-title">
            <div className="section-head">
              <h2 id="requests-title">Waiting for you</h2>
              <p className="section-count">
                {openLinks} check-in {openLinks === 1 ? "link" : "links"}
              </p>
              <p className="section-sub">
                {openLinks === demoScenarios.length
                  ? "Three check-in links arrived this week. Any one keeps your streak."
                  : "This week's stamp is already pressed. The other links stay open if you want them."}
              </p>
            </div>

            <div className="card-grid">
              {demoScenarios.map((scenario) => {
                const outcome = outcomes[scenario.id];
                const isPending = pendingId === scenario.id;
                return (
                  <article
                    className="panel card"
                    data-active={isPending ? "true" : undefined}
                    data-testid={`request-card-${scenario.id}`}
                    key={scenario.id}
                  >
                    <h3 className="card-title">{scenario.actionTitle}</h3>
                    <p className="card-body">{scenario.body}</p>
                    <hr className="rule" />
                    <p className="label">Exact target</p>
                    <AddressGroups
                      address={scenario.deployer}
                      suffix={scenario.contractName}
                    />
                    <p className="label label-spaced">Contract name</p>
                    <p className="contract-name">{scenario.contractName}</p>
                    <dl className="meta">
                      <dt>Action</dt>
                      <dd>record-demo-action()</dd>
                      <dt>Assets</dt>
                      <dd>None move</dd>
                    </dl>
                    <hr className="rule" />
                    <p className="from">
                      <span className="label">From</span>
                      <EnvelopeGlyph />
                      <span className="from-host">{scenario.from}</span>
                    </p>
                    {isPending ? (
                      <WaitingBlock />
                    ) : (
                      <button
                        aria-label={`Check in · ${scenario.actionTitle} from ${scenario.from}`}
                        className="check-in"
                        disabled={
                          pendingId !== null ||
                          connection.status === "connecting"
                        }
                        onClick={() => void checkIn(scenario)}
                        type="button"
                      >
                        Check in
                      </button>
                    )}
                    <p
                      aria-atomic="true"
                      aria-live="polite"
                      className="outcome"
                    >
                      <OutcomeLine outcome={outcome} />
                    </p>
                  </article>
                );
              })}
            </div>
          </section>
        </main>

        <section className="band" aria-labelledby="band-title">
          <div className="shell">
            <h2 id="band-title">What your wallet checks</h2>
            <div className="flow">
              <div className="panel node">
                <p className="node-title node-title-mono">acme.example</p>
                <p className="node-body">
                  asks your wallet for a contract call
                </p>
              </div>
              <p aria-hidden="true" className="flow-arrow">
                <span className="flow-arrow-h">→</span>
                <span className="flow-arrow-v">↓</span>
              </p>
              <div className="panel node">
                <p className="node-title">Leather</p>
                <p className="node-body">
                  reads the exact contract principal from that request
                </p>
              </div>
              <p aria-hidden="true" className="flow-arrow">
                <span className="flow-arrow-h">→</span>
                <span className="flow-arrow-v">↓</span>
              </p>
              <div className="panel node">
                <p className="node-title">Origin registry</p>
                <p className="node-body">
                  returns the claims recorded on chain for that principal
                </p>
              </div>
            </div>
            <p className="band-note">
              Acme never tells your wallet who deployed this contract. Leather
              works that out from the request itself and checks it on chain.
            </p>
            <p className="band-credit">
              Provenance checks in this demo use Origin. Origin proves
              provenance, not safety.
            </p>
          </div>
        </section>

        <div className="shell">
          <section
            className="activity"
            id="activity"
            aria-labelledby="activity-title"
          >
            <h2 id="activity-title">Recent activity</h2>
            <ul className="activity-list" role="list">
              {activity.map((row) => (
                <li className="activity-row activity-row-new" key={row.key}>
                  <span aria-hidden="true" className="activity-glyph" />
                  <span className="activity-when">{row.when}</span>
                  <span className="activity-action">{row.action}</span>
                  <span className="activity-host">{row.host}</span>
                  <span className="activity-status">
                    <span aria-hidden="true" className="dot dot-confirmed" />
                    Confirmed
                  </span>
                  <span className="activity-hash">
                    {row.txid ? (
                      <a
                        href={`${EXPLORER}/${row.txid}?chain=testnet`}
                        rel="noreferrer"
                        target="_blank"
                      >
                        {row.hash} ↗
                      </a>
                    ) : (
                      row.hash
                    )}
                  </span>
                </li>
              ))}
              {seededActivity.map((row) => (
                <li className="activity-row" key={row.key}>
                  <span aria-hidden="true" className="activity-glyph" />
                  <span className="activity-when">{row.when}</span>
                  <span className="activity-action">{row.action}</span>
                  <span className="activity-host">{row.host}</span>
                  <span className="activity-status">
                    <span aria-hidden="true" className="dot dot-confirmed" />
                    Confirmed
                  </span>
                  <span className="activity-hash">{row.hash}</span>
                </li>
              ))}
            </ul>
            <p className="activity-caption">
              Earlier weeks are sample history. Today&rsquo;s check-ins link to
              the Testnet explorer.
            </p>
          </section>
        </div>

        <footer className="site-footer">
          <div className="shell footer-inner">
            <p className="footer-brand">
              <AcmeMark size={20} />
              <span>Acme</span>
            </p>
            <p className="footer-legal">© 2026 Acme · Stacks Testnet demo</p>
            <a
              href={`${EXPLORER}/${ACME_ACTION}?chain=testnet`}
              rel="noreferrer"
              target="_blank"
            >
              View acme-action ↗
            </a>
            <a
              href={`${EXPLORER}/${ORIGIN_REGISTRY}?chain=testnet`}
              rel="noreferrer"
              target="_blank"
            >
              Origin ↗
            </a>
          </div>
        </footer>
      </div>

      <div aria-hidden="true" className="scrim" />
    </>
  );
}
