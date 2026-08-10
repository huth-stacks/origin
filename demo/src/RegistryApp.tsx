import fixtures from "../../deployments/testnet-fixtures.json";

const EXPLORER_ADDRESS = "https://explorer.hiro.so/address";
const EXPLORER_TRANSACTION = "https://explorer.hiro.so/txid";

const registry = fixtures.registry;
const knownFixture = fixtures.fixtures.known;
const knownClaim = knownFixture.claim;

function truncateMiddle(value: string, head = 12, tail = 10) {
  if (value.length <= head + tail + 1) return value;
  return `${value.slice(0, head)}…${value.slice(-tail)}`;
}

function ExplorerLink({
  children,
  href,
  className,
}: {
  children: React.ReactNode;
  href: string;
  className?: string;
}) {
  return (
    <a
      className={className}
      href={href}
      rel="noopener noreferrer"
      target="_blank"
    >
      {children}
      <span aria-hidden="true">↗</span>
    </a>
  );
}

function OriginSeal() {
  return (
    <span aria-hidden="true" className="registry-seal">
      <span>O</span>
    </span>
  );
}

function LedgerRow({
  label,
  children,
  code = false,
}: {
  label: string;
  children: React.ReactNode;
  code?: boolean;
}) {
  return (
    <div className="registry-ledger-row">
      <dt>{label}</dt>
      <dd className={code ? "registry-code" : undefined}>{children}</dd>
    </div>
  );
}

export function RegistryApp() {
  const registryExplorer = `${EXPLORER_ADDRESS}/${registry.principal}?chain=testnet`;
  const registryTransaction = `${EXPLORER_TRANSACTION}/${registry.txId}?chain=testnet`;
  const subjectExplorer = `${EXPLORER_ADDRESS}/${knownFixture.subject}?chain=testnet`;
  const claimTransaction = `${EXPLORER_TRANSACTION}/${knownClaim.txId}?chain=testnet`;

  return (
    <div className="registry-page">
      <header className="registry-header">
        <a className="registry-wordmark" href="/registry">
          <OriginSeal />
          <span>Origin Registry</span>
        </a>
        <nav aria-label="Registry page">
          <a href="#mechanism">How it works</a>
          <a href="#live-record">Live record</a>
          <a href="/">Back to demo</a>
        </nav>
        <p className="registry-network">
          <span aria-hidden="true" />
          Stacks Testnet
        </p>
      </header>

      <main>
        <section className="registry-hero" aria-labelledby="registry-title">
          <div className="registry-hero-copy">
            <p className="registry-kicker">A public provenance ledger</p>
            <h1 id="registry-title">
              <span>Open evidence.</span>
              <span>Wallet-owned trust.</span>
            </h1>
            <p className="registry-hero-body">
              Origin records who attested to an exact Stacks principal. The
              registry stores the receipt; Leather decides which attesters it
              recognizes.
            </p>
            <div className="registry-actions">
              <ExplorerLink
                href={registryExplorer}
                className="registry-primary"
              >
                Open the registry on Explorer
              </ExplorerLink>
              <a className="registry-secondary" href="#mechanism">
                Follow one lookup ↓
              </a>
            </div>
          </div>

          <aside
            className="registry-proof-stamp"
            aria-label="Registry deployment"
          >
            <div className="registry-proof-head">
              <span>Live contract</span>
              <span className="registry-proof-status">Confirmed</span>
            </div>
            <p className="registry-version">v2</p>
            <p className="registry-proof-name">Origin registry schema</p>
            <dl>
              <LedgerRow label="Network">Stacks Testnet</LedgerRow>
              <LedgerRow label="Bitcoin block">
                {registry.burnBlockHeight.toLocaleString()}
              </LedgerRow>
              <LedgerRow label="Contract" code>
                {truncateMiddle(registry.principal, 16, 12)}
              </LedgerRow>
            </dl>
            <ExplorerLink href={registryTransaction}>
              Inspect deployment transaction
            </ExplorerLink>
          </aside>
        </section>

        <section
          className="registry-mechanism"
          id="mechanism"
          aria-labelledby="mechanism-title"
        >
          <div className="registry-section-heading">
            <p>01 / Mechanism</p>
            <h2 id="mechanism-title">
              The website never supplies the verdict.
            </h2>
          </div>

          <ol className="registry-path">
            <li>
              <span className="registry-path-number">01</span>
              <div>
                <h3>Decode the request</h3>
                <p>
                  Leather reads the exact contract principal from the
                  transaction it is asking the user to approve.
                </p>
                <code>{truncateMiddle(knownFixture.subject, 16, 14)}</code>
              </div>
            </li>
            <li>
              <span className="registry-path-number">02</span>
              <div>
                <h3>Read the registry</h3>
                <p>
                  It queries the public record using an attester and that exact
                  subject as the lookup key.
                </p>
                <code>get-attestation(attester, subject)</code>
              </div>
            </li>
            <li>
              <span className="registry-path-number">03</span>
              <div>
                <h3>Apply wallet policy</h3>
                <p>
                  Leather checks attester trust, issuance window, expiration,
                  and revocation before showing a known origin.
                </p>
                <code>claim exists ≠ attester trusted</code>
              </div>
            </li>
          </ol>
        </section>

        <section
          className="registry-live-record"
          id="live-record"
          aria-labelledby="live-record-title"
        >
          <div className="registry-record-intro">
            <p className="registry-section-index">02 / Explorer proof</p>
            <h2 id="live-record-title">This record is on Testnet now.</h2>
            <p>
              The Acme demo claim below is not bundled into the page as a wallet
              verdict. These links open the contract, subject, and issuance
              transaction independently on Hiro Explorer.
            </p>
            <ExplorerLink href={subjectExplorer} className="registry-text-link">
              Inspect the exact subject
            </ExplorerLink>
          </div>

          <article
            className="registry-ledger"
            aria-label="Acme Testnet attestation"
          >
            <header>
              <div>
                <p>Recorded attestation</p>
                <h3>{knownClaim.issuerName}</h3>
              </div>
              <span className="registry-active">
                <span aria-hidden="true" />
                Active fixture
              </span>
            </header>
            <dl>
              <LedgerRow label="Exact subject" code>
                {knownFixture.subject}
              </LedgerRow>
              <LedgerRow label="Attester" code>
                {knownClaim.attester}
              </LedgerRow>
              <LedgerRow label="Claimed role">{knownClaim.role}</LedgerRow>
              <LedgerRow label="Issued at Bitcoin block">
                {knownClaim.issuedAt.toLocaleString()}
              </LedgerRow>
              <LedgerRow label="Expires at Bitcoin block">
                {knownClaim.expiresAt.toLocaleString()}
              </LedgerRow>
              <LedgerRow label="Request ID" code>
                {knownClaim.requestId}
              </LedgerRow>
            </dl>
            <footer>
              <ExplorerLink
                href={claimTransaction}
                className="registry-primary"
              >
                View claim transaction
              </ExplorerLink>
              <ExplorerLink
                href={registryExplorer}
                className="registry-secondary"
              >
                View registry contract
              </ExplorerLink>
            </footer>
          </article>
        </section>

        <section className="registry-trust" aria-labelledby="trust-title">
          <div className="registry-trust-statement">
            <p>03 / Trust boundary</p>
            <h2 id="trust-title">
              Anyone can write a claim. Leather chooses whom to believe.
            </h2>
          </div>
          <div className="registry-trust-rules">
            <article>
              <span>Open</span>
              <div>
                <h3>Permissionless registry</h3>
                <p>
                  Each attester controls only its own records. One issuer cannot
                  overwrite another issuer&rsquo;s claim.
                </p>
              </div>
            </article>
            <article>
              <span>Local</span>
              <div>
                <h3>Wallet-owned policy</h3>
                <p>
                  A claim becomes a known origin only when its attester appears
                  in Leather&rsquo;s own trust configuration.
                </p>
              </div>
            </article>
            <article>
              <span>Exact</span>
              <div>
                <h3>Principal-level matching</h3>
                <p>
                  The deployer address and contract name must both match the
                  decoded transaction target.
                </p>
              </div>
            </article>
          </div>
        </section>

        <section className="registry-caveat" aria-labelledby="caveat-title">
          <p>What Origin proves</p>
          <h2 id="caveat-title">Provenance is not a safety guarantee.</h2>
          <p>
            Origin can show who made an identity claim about an exact principal.
            It cannot prove that the contract, organization, or transaction is
            safe. Leather keeps identity, asset protection, and transaction
            review as separate signals.
          </p>
          <div>
            <a href="/">Return to the Acme demo →</a>
            <a href="/evidence">Browse all public evidence →</a>
          </div>
        </section>
      </main>

      <footer className="registry-footer">
        <p>Origin · Exact-principal provenance on Stacks</p>
        <p>Testnet demonstration · Registry schema v2</p>
      </footer>
    </div>
  );
}
