import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, test } from "vitest";

import { App } from "../demo/src/App";
import fixtures from "../deployments/testnet-fixtures.json";

describe("Acme demo app", () => {
  test("offers the app-bar wallet button before Leather is detected", () => {
    const html = renderToStaticMarkup(<App />);
    const walletButton = html.match(
      /<button[^>]*class="wallet-button"[^>]*>/,
    )?.[0];

    expect(walletButton).toBeDefined();
    expect(walletButton).not.toContain("disabled");
    expect(html).toContain("Connect Leather");
  });

  test("ships the frozen check-in triggers the Leather specs drive", () => {
    const html = renderToStaticMarkup(<App />);

    for (const testId of [
      "request-card-known",
      "request-card-unrecognized",
      "request-card-lookalike",
    ]) {
      expect(html).toContain(`data-testid="${testId}"`);
    }

    for (const label of [
      "Check in · Weekly check-in from acme.example",
      "Check in · Bonus check-in from northwind.example",
      "Check in · Weekly check-in from mail.acme-rewards.example",
    ]) {
      expect(html).toContain(`aria-label="${label}"`);
    }

    expect(html.match(/>Check in</g)).toHaveLength(3);
    expect(html).toContain(fixtures.fixtures.known.subject);
    expect(html).toContain(fixtures.registry.principal);
    expect(html).toContain('href="/registry"');
    expect(html).toContain("See how the registry works");
  });

  test("keeps the forensic vocabulary and Leather's own wording off the page", () => {
    // data-testid values are a frozen cross-repo contract, not site copy.
    const copy = renderToStaticMarkup(<App />).replaceAll(
      /data-testid="[^"]*"/g,
      "",
    );

    expect(copy).not.toMatch(
      /Requested by|verified|untrusted|unrecognized|lookalike|collision|attacker|phishing|scenario/i,
    );
  });
});
