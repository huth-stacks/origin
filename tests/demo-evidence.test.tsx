import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, test } from "vitest";

import fixtures from "../deployments/testnet-fixtures.json";
import publicProfile from "../demo/public/origin-attester-profile.json";
import { EvidenceView } from "../demo/src/EvidenceApp";
import profile from "../demo/src/origin-attester-profile.json";
import type { OriginEvidenceClaim } from "../demo/src/origin-evidence-model";

const trusted = "ST121HDPNYM3PYBXM6EK0NY673DWCK54ZXEXX2HHC";
const hostile = "ST2EWCY9STYTS6FGJ0KP1FQNMKHJFXMP7KKM7FRX0";

function claim(recognized: boolean): OriginEvidenceClaim {
  const attester = recognized ? trusted : hostile;
  const subject = `${attester}.${recognized ? "acme-action" : "claimed-action"}`;
  return {
    key: `${attester}:${subject}`,
    attester,
    subject,
    issuerName: recognized ? "Acme" : "Definitely Acme",
    role: recognized ? "Demo contract" : "Official contract",
    issuedAt: 2745,
    expiresAt: 102745,
    recognized,
    status: "active",
    history: [
      {
        schemaVersion: 1,
        kind: "issued",
        attester,
        subject,
        issuerName: recognized ? "Acme" : "Definitely Acme",
        role: recognized ? "Demo contract" : "Official contract",
        issuedAt: 2745,
        expiresAt: 102745,
        revoked: false,
        txId: `0x${(recognized ? "a" : "b").repeat(64)}`,
        eventIndex: 0,
        complete: true,
      },
    ],
  };
}

describe(EvidenceView.name, () => {
  test("keeps the explanatory profile aligned with wallet compatibility", () => {
    expect(publicProfile).toEqual(profile);
    expect(
      profile.principals.map(({ state: _state, ...principal }) => principal),
    ).toEqual(
      fixtures.compatibility.trustedAttesters.map((attester) => ({
        principal: attester.principal,
        validFromBurnBlock: attester.validFromBurnBlock,
        maxClaimLifetimeBurnBlocks: attester.maxClaimLifetimeBurnBlocks,
      })),
    );
    expect(
      profile.principals.every(({ state }) => state.startsWith("current-v2")),
    ).toBe(true);
  });

  test("renders the attester identity, exact evidence, and Testnet warning", () => {
    const html = renderToStaticMarkup(
      <EvidenceView
        loadState={{
          kind: "ready",
          claims: [claim(true)],
          burnBlockHeight: 3100,
          condition: "complete",
          rejectedEvents: 0,
        }}
      />,
    );

    expect(html).toContain("Origin Testnet Attester");
    expect(html).toContain("Stacks Testnet");
    expect(html).toContain("Provenance is not a safety guarantee");
    expect(html).toContain(trusted);
    expect(html).toContain("Machine profile");
    expect(html).toContain("Approved profile");
    expect(html).toContain("explorer.hiro.so");
  });

  test("labels hostile identity strings as quarantined and unrecognized", () => {
    const html = renderToStaticMarkup(
      <EvidenceView
        loadState={{
          kind: "ready",
          claims: [claim(false)],
          burnBlockHeight: 3100,
          condition: "complete",
          rejectedEvents: 0,
        }}
      />,
    );

    expect(html).toContain("Unrecognized attester");
    expect(html).toContain("Claim-supplied name");
    expect(html).toContain("not in the wallet");
    expect(html).not.toContain("Wallet-recognized attester");
  });

  test("marks an older issuance as replaced after reissue", () => {
    const reissued = claim(true);
    reissued.history.push({
      ...reissued.history[0]!,
      txId: `0x${"c".repeat(64)}`,
      issuedAt: 2800,
    });
    const html = renderToStaticMarkup(
      <EvidenceView
        loadState={{
          kind: "ready",
          claims: [reissued],
          burnBlockHeight: 3100,
          condition: "complete",
          rejectedEvents: 0,
        }}
      />,
    );

    expect(html).toContain("Replaced");
    expect(html).toContain("Issued");
  });

  test("fails neutrally when registry evidence is unavailable", () => {
    const html = renderToStaticMarkup(
      <EvidenceView
        loadState={{ kind: "unavailable", message: "Fetch deadline exceeded" }}
      />,
    );

    expect(html).toContain("Registry evidence is unavailable");
    expect(html).not.toContain("Wallet-recognized attester");
    expect(html).not.toContain("0 exact claims");
  });
});
