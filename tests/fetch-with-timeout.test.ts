import { describe, expect, test, vi } from "vitest";

import { fetchWithTimeout } from "../demo/src/fetch-with-timeout";

describe(fetchWithTimeout.name, () => {
  test("passes an abort signal through to the request", async () => {
    const fetchFn = vi.fn<typeof fetch>(() =>
      Promise.resolve(Response.json({ ok: true })),
    );

    await expect(
      fetchWithTimeout(fetchFn, "https://example.test", undefined, 100),
    ).resolves.toBeInstanceOf(Response);
    expect(fetchFn.mock.calls[0]?.[1]?.signal).toBeInstanceOf(AbortSignal);
  });

  test("rejects even when a fetch implementation ignores abort", async () => {
    const fetchFn = vi.fn<typeof fetch>(() => new Promise(() => undefined));

    await expect(
      fetchWithTimeout(fetchFn, "https://example.test", undefined, 5),
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
    );
    caller.abort();

    expect(observed.signal?.aborted).toBe(true);
  });
});
