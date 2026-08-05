import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, test } from "vitest";

import { App } from "../demo/src/App";

describe("Origin demo app", () => {
  test("allows connection when Leather injects after the first render", () => {
    const html = renderToStaticMarkup(<App />);
    const providerButton = html.match(
      /<button class="provider-control"[^>]*>/,
    )?.[0];

    expect(providerButton).toBeDefined();
    expect(providerButton).not.toContain("disabled");
    expect(html).toContain("Connect Leather");
  });
});
