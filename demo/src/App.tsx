import { useState } from "react";

import {
  demoScenarios,
  type DemoScenario,
  type DemoScenarioId,
} from "./demo-scenarios";
import {
  findLeatherProvider,
  requestDemoContractCall,
} from "./leather-provider";

type RequestState =
  | { status: "idle" }
  | { status: "requesting"; scenarioId: DemoScenarioId }
  | { status: "complete"; scenarioId: DemoScenarioId }
  | { status: "rejected"; scenarioId: DemoScenarioId }
  | { status: "unavailable"; scenarioId: DemoScenarioId };

function requestStatusLabel(state: RequestState, scenario: DemoScenario) {
  if ("scenarioId" in state && state.scenarioId !== scenario.id)
    return "Inspect in Leather";
  switch (state.status) {
    case "requesting":
      return "Check the Leather window";
    case "complete":
      return "Request approved";
    case "rejected":
      return "Request rejected — try again";
    case "unavailable":
      return "Leather not detected";
    case "idle":
      return "Inspect in Leather";
  }
}

export function App() {
  const [activeId, setActiveId] = useState<DemoScenarioId>("known");
  const [requestState, setRequestState] = useState<RequestState>({
    status: "idle",
  });
  const [hasLeather, setHasLeather] = useState(() =>
    Boolean(findLeatherProvider()),
  );

  const activeScenario =
    demoScenarios.find((scenario) => scenario.id === activeId) ??
    demoScenarios[0];

  async function inspectScenario(scenario: DemoScenario) {
    setRequestState({ status: "requesting", scenarioId: scenario.id });
    const provider = findLeatherProvider();
    if (!provider) {
      setRequestState({ status: "unavailable", scenarioId: scenario.id });
      return;
    }
    setHasLeather(true);

    try {
      await requestDemoContractCall(provider, scenario);
      setRequestState({ status: "complete", scenarioId: scenario.id });
    } catch {
      setRequestState({ status: "rejected", scenarioId: scenario.id });
    }
  }

  const buttonLabel = requestStatusLabel(requestState, activeScenario);
  const isRequesting =
    requestState.status === "requesting" &&
    requestState.scenarioId === activeScenario.id;

  return (
    <main className="shell">
      <header className="masthead intro intro-one">
        <a
          className="wordmark"
          href="#top"
          aria-label="Origin transaction lab home"
        >
          <span className="origin-mark" aria-hidden="true">
            O
          </span>
          <span>Origin</span>
        </a>
        <div className="network-status">
          <span className="network-dot" aria-hidden="true" />
          Stacks Testnet
        </div>
      </header>

      <section
        className="intro intro-two"
        id="top"
        aria-labelledby="page-title"
      >
        <p className="kicker">Transaction lab / 001</p>
        <h1 id="page-title">
          The site asks. The wallet decides what it knows.
        </h1>
        <p className="lede">
          Run three harmless calls through a local Leather build and compare the
          exact contract principal with its on-chain provenance.
        </p>
      </section>

      <section
        className="lab intro intro-three"
        aria-label="Origin demo scenarios"
      >
        <nav
          className="scenario-list"
          aria-label="Choose a transaction scenario"
        >
          {demoScenarios.map((scenario) => {
            const isActive = scenario.id === activeScenario.id;
            return (
              <button
                className="scenario-tab"
                data-active={isActive}
                key={scenario.id}
                onClick={() => {
                  setActiveId(scenario.id);
                  setRequestState({ status: "idle" });
                }}
                type="button"
                aria-pressed={isActive}
              >
                <span className="scenario-index">{scenario.index}</span>
                <span>
                  <strong>{scenario.eyebrow}</strong>
                  <small>{scenario.contractName}</small>
                </span>
                <span className="scenario-arrow" aria-hidden="true">
                  ↗
                </span>
              </button>
            );
          })}
        </nav>

        <article className="request-panel" key={activeScenario.id}>
          <div className="panel-topline">
            <span>Scenario {activeScenario.index}</span>
            <span className="provider-state" data-connected={hasLeather}>
              {hasLeather ? "Leather detected" : "Leather required"}
            </span>
          </div>

          <div className="request-copy">
            <p className="eyebrow">{activeScenario.eyebrow}</p>
            <h2>{activeScenario.title}</h2>
            <p>{activeScenario.siteClaim}</p>
          </div>

          <dl className="transaction-spec">
            <div>
              <dt>Exact target</dt>
              <dd>{activeScenario.subject}</dd>
            </div>
            <div>
              <dt>Function</dt>
              <dd>record-demo-action()</dd>
            </div>
            <div>
              <dt>Asset movement</dt>
              <dd>None declared · Deny mode</dd>
            </div>
          </dl>

          <div className="wallet-handoff">
            <p>
              <span>In Leather</span>
              {activeScenario.walletPrompt}
            </p>
            <button
              className="inspect-button"
              data-loading={isRequesting}
              disabled={isRequesting}
              onClick={() => void inspectScenario(activeScenario)}
              type="button"
            >
              <span>{buttonLabel}</span>
              <span aria-hidden="true">→</span>
            </button>
          </div>
        </article>
      </section>

      <section className="boundary" aria-labelledby="boundary-title">
        <div>
          <p className="kicker">Trust boundary</p>
          <h2 id="boundary-title">
            Only the transaction crosses into Leather.
          </h2>
        </div>
        <ol>
          <li>
            <span>Site</span>
            requests a contract call
          </li>
          <li>
            <span>Wallet</span>
            derives the exact principal
          </li>
          <li>
            <span>Registry</span>
            returns configured claims
          </li>
        </ol>
      </section>

      <footer>
        <span>Origin proves provenance, not safety.</span>
        <a
          href="https://explorer.hiro.so/?chain=testnet"
          target="_blank"
          rel="noreferrer"
        >
          Open Testnet explorer ↗
        </a>
      </footer>
    </main>
  );
}
