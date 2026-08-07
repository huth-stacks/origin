import { describe, expect, test, vi } from "vitest";

import {
  fetchJsonWithTimeout,
  fetchWithTimeout,
} from "../demo/src/fetch-with-timeout";

describe(fetchWithTimeout.name, () => {
  test("passes an abort signal through to the request", async () => {
    const fetchFn = vi.fn<typeof fetch>(() =>
      Promise.resolve(Response.json({ ok: true })),
    );

    await expect(
      fetchWithTimeout(
        fetchFn,
        "https://example.test",
        undefined,
        100,
        (response) => Promise.resolve(response),
      ),
    ).resolves.toBeInstanceOf(Response);
    expect(fetchFn.mock.calls[0]?.[1]?.signal).toBeInstanceOf(AbortSignal);
  });

  test("rejects even when a fetch implementation ignores abort", async () => {
    const fetchFn = vi.fn<typeof fetch>(() => new Promise(() => undefined));

    await expect(
      fetchWithTimeout(
        fetchFn,
        "https://example.test",
        undefined,
        5,
        (response) => Promise.resolve(response),
      ),
    ).rejects.toThrow("Fetch deadline exceeded");
  });

  test("composes a caller signal", async () => {
    const caller = new AbortController();
    const observed: { signal?: AbortSignal } = {};
    const fetchFn = vi.fn<typeof fetch>((_, init) => {
      observed.signal = init?.signal as AbortSignal;
      return Promise.resolve(Response.json({ ok: true }));
    });

    await fetchWithTimeout(
      fetchFn,
      "https://example.test",
      { signal: caller.signal },
      100,
      (response) => Promise.resolve(response),
    );
    caller.abort();

    expect(observed.signal?.aborted).toBe(true);
  });

  test("keeps the deadline armed while consuming the response body", async () => {
    const response = Response.json({ ok: true });
    vi.spyOn(response, "json").mockImplementation(
      () => new Promise(() => undefined),
    );

    await expect(
      fetchJsonWithTimeout(
        () => Promise.resolve(response),
        "https://example.test",
        undefined,
        5,
      ),
    ).rejects.toThrow("Fetch deadline exceeded");
  });
});
