import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, test } from "vitest";

import { RegistryApp } from "../demo/src/RegistryApp";
import fixtures from "../deployments/testnet-fixtures.json";

describe("Origin registry explainer", () => {
  test("shows the real Testnet registry and known fixture record", () => {
    const html = renderToStaticMarkup(<RegistryApp />);
    const known = fixtures.fixtures.known;

    expect(html).toContain(fixtures.registry.principal);
    expect(html).toContain(fixtures.registry.txId);
    expect(html).toContain(known.subject);
    expect(html).toContain(known.claim.attester);
    expect(html).toContain(known.claim.requestId);
    expect(html).toContain(known.claim.txId);
  });

  test("links every proof surface to Hiro Explorer on Testnet", () => {
    const html = renderToStaticMarkup(<RegistryApp />);
    const known = fixtures.fixtures.known;

    for (const href of [
      `https://explorer.hiro.so/address/${fixtures.registry.principal}?chain=testnet`,
      `https://explorer.hiro.so/txid/${fixtures.registry.txId}?chain=testnet`,
      `https://explorer.hiro.so/address/${known.subject}?chain=testnet`,
      `https://explorer.hiro.so/txid/${known.claim.txId}?chain=testnet`,
    ]) {
      expect(html).toContain(`href="${href}"`);
    }

    expect(html.match(/target="_blank"/g)?.length).toBeGreaterThanOrEqual(4);
    expect(html).toContain('rel="noopener noreferrer"');
  });

  test("explains open issuance, wallet-owned trust, and the safety boundary", () => {
    const html = renderToStaticMarkup(<RegistryApp />);

    expect(html).toContain("Anyone can write a claim");
    expect(html).toContain("Leather chooses whom to believe");
    expect(html).toContain("claim exists ≠ attester trusted");
    expect(html).toContain("Provenance is not a safety guarantee");
  });
});
