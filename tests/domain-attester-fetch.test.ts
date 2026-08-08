import { gzipSync } from "node:zlib";

import { describe, expect, test, vi } from "vitest";

import {
  isGloballyRoutableAddress,
  validateResolvedAddresses,
  type ResolvedAddress,
} from "../scripts/domain-attester/network-policy.ts";
import {
  DOMAIN_FETCH_MAX_BODY_BYTES,
  DOMAIN_FETCH_MAX_HEADER_BYTES,
  DOMAIN_PROOF_PATH,
  secureFetchDomainProof,
  type PinnedRequest,
  type PinnedResponse,
} from "../scripts/domain-attester/secure-fetch.ts";

const publicAddresses: ResolvedAddress[] = [
  { address: "93.184.216.34", family: 4 },
  { address: "2606:4700:4700::1111", family: 6 },
];

function response(
  source: string | Uint8Array,
  overrides: Partial<PinnedResponse> = {},
): PinnedResponse {
  const bytes = typeof source === "string" ? Buffer.from(source) : source;
  return {
    statusCode: 200,
    headers: { "content-type": "application/json; charset=utf-8" },
    headerBytes: 64,
    body: (async function* () {
      yield bytes;
    })(),
    abort: vi.fn(),
    ...overrides,
  };
}

function dependencies(
  pinnedResponse: PinnedResponse,
  requestSpy = vi.fn<(request: PinnedRequest) => Promise<PinnedResponse>>(),
) {
  requestSpy.mockResolvedValue(pinnedResponse);
  return {
    resolve: vi.fn().mockResolvedValue(publicAddresses),
    request: requestSpy,
  };
}

describe(isGloballyRoutableAddress.name, () => {
  test.each([
    "0.0.0.0",
    "10.0.0.1",
    "100.64.0.1",
    "127.0.0.1",
    "169.254.169.254",
    "172.16.0.1",
    "192.168.0.1",
    "192.0.2.1",
    "198.18.0.1",
    "198.51.100.1",
    "203.0.113.1",
    "224.0.0.1",
    "255.255.255.255",
    "::",
    "::1",
    "::ffff:127.0.0.1",
    "::ffff:169.254.169.254",
    "fe80::1",
    "fc00::1",
    "2001:db8::1",
    "ff02::1",
  ])("rejects non-public or metadata destination %s", (address) => {
    expect(isGloballyRoutableAddress(address)).toBe(false);
  });

  test.each(["8.8.8.8", "1.1.1.1", "2606:4700:4700::1111"])(
    "accepts public unicast destination %s",
    (address) => expect(isGloballyRoutableAddress(address)).toBe(true),
  );
});

describe(validateResolvedAddresses.name, () => {
  test("rejects a mixed public/private DNS answer set", () => {
    expect(() =>
      validateResolvedAddresses([
        publicAddresses[0]!,
        { address: "10.0.0.1", family: 4 },
      ]),
    ).toThrow("non-public");
  });

  test("rejects the attester itself and configured internal ranges", () => {
    expect(() =>
      validateResolvedAddresses([publicAddresses[0]!], {
        serviceAddresses: new Set([publicAddresses[0]!.address]),
      }),
    ).toThrow("service address");
    expect(() =>
      validateResolvedAddresses([publicAddresses[0]!], {
        internalCidrs: ["93.184.216.0/24"],
      }),
    ).toThrow("internal network");
    expect(() =>
      validateResolvedAddresses(
        [{ address: "2606:4700:4700::1111", family: 6 }],
        {
          serviceAddresses: new Set(["2606:4700:4700:0:0:0:0:1111"]),
        },
      ),
    ).toThrow("service address");
  });
});

describe(secureFetchDomainProof.name, () => {
  test("constructs one credential-free TLS request pinned to a validated answer", async () => {
    const requestSpy =
      vi.fn<(request: PinnedRequest) => Promise<PinnedResponse>>();
    const deps = dependencies(response('{"ok":true}'), requestSpy);
    const result = await secureFetchDomainProof("example.com", deps);

    expect(result.document).toEqual({ ok: true });
    expect(deps.resolve).toHaveBeenCalledExactlyOnceWith("example.com");
    expect(requestSpy).toHaveBeenCalledTimes(1);
    expect(requestSpy.mock.calls[0]?.[0]).toMatchObject({
      method: "GET",
      hostname: "example.com",
      servername: "example.com",
      address: "93.184.216.34",
      family: 4,
      port: 443,
      path: DOMAIN_PROOF_PATH,
      headers: {
        accept: "application/json",
        "user-agent": "Origin-Testnet-Attester/1",
      },
      rejectUnauthorized: true,
      useEnvironmentProxy: false,
    });
    expect(Object.keys(requestSpy.mock.calls[0]?.[0].headers ?? {})).toEqual([
      "accept",
      "user-agent",
    ]);
  });

  test("pins the validation answer even if ambient DNS later rebinds", async () => {
    let ambientAddress = "93.184.216.34";
    const request = vi.fn(async (options: PinnedRequest) => {
      ambientAddress = "10.0.0.1";
      expect(options.address).toBe("93.184.216.34");
      expect(ambientAddress).toBe("10.0.0.1");
      return response('{"ok":true}');
    });
    await secureFetchDomainProof("example.com", {
      resolve: async () => [{ address: ambientAddress, family: 4 }],
      request,
    });
    expect(request).toHaveBeenCalledTimes(1);
  });

  test.each([
    "https://example.com/other",
    "https://attacker.example/other",
    "http://example.com/other",
    "https://example.com:444/other",
    "http://169.254.169.254/",
  ])(
    "rejects redirect destination %s without following it",
    async (location) => {
      const request = vi.fn().mockResolvedValue(
        response("", {
          statusCode: 302,
          headers: { location, "content-type": "application/json" },
        }),
      );
      await expect(
        secureFetchDomainProof("example.com", {
          resolve: async () => publicAddresses,
          request,
        }),
      ).rejects.toThrow("redirects are forbidden");
      expect(request).toHaveBeenCalledTimes(1);
    },
  );

  test("rejects wrong content type and duplicate content-type headers", async () => {
    for (const headers of [
      { "content-type": "text/plain" },
      { "content-type": ["application/json", "text/plain"] },
    ]) {
      const abort = vi.fn();
      await expect(
        secureFetchDomainProof(
          "example.com",
          dependencies(response("{}", { headers, abort })),
        ),
      ).rejects.toThrow();
      expect(abort).toHaveBeenCalledOnce();
    }
  });

  test.each([
    {
      name: "server error",
      overrides: { statusCode: 503 },
      message: "not successful",
    },
    {
      name: "oversized headers",
      overrides: { headerBytes: DOMAIN_FETCH_MAX_HEADER_BYTES + 1 },
      message: "headers are too large",
    },
    {
      name: "invalid content length",
      overrides: {
        headers: {
          "content-type": "application/json",
          "content-length": "not-a-number",
        },
      },
      message: "compressed body is too large",
    },
    {
      name: "unsupported content encoding",
      overrides: {
        headers: {
          "content-type": "application/json",
          "content-encoding": "compress",
        },
      },
      message: "unsupported content encoding",
    },
  ])("aborts a rejected $name response", async ({ overrides, message }) => {
    const abort = vi.fn();
    const request = vi
      .fn()
      .mockResolvedValue(response("{}", { ...overrides, abort }));
    await expect(
      secureFetchDomainProof("example.com", {
        resolve: async () => publicAddresses,
        request,
      }),
    ).rejects.toThrow(message);
    expect(request).toHaveBeenCalledOnce();
    expect(abort).toHaveBeenCalledOnce();
  });

  test("rejects invalid UTF-8 and aborts the response", async () => {
    const abort = vi.fn();
    await expect(
      secureFetchDomainProof(
        "example.com",
        dependencies(response(Uint8Array.from([0xc3, 0x28]), { abort })),
      ),
    ).rejects.toThrow("not valid UTF-8");
    expect(abort).toHaveBeenCalledOnce();
  });

  test("rejects compressed and decompressed bodies above the limit", async () => {
    await expect(
      secureFetchDomainProof(
        "example.com",
        dependencies(
          response(Buffer.alloc(DOMAIN_FETCH_MAX_BODY_BYTES + 1), {
            headers: { "content-type": "application/json" },
          }),
        ),
      ),
    ).rejects.toThrow("compressed body is too large");
    const compressed = gzipSync(
      Buffer.alloc(DOMAIN_FETCH_MAX_BODY_BYTES + 1, "a"),
    );
    await expect(
      secureFetchDomainProof(
        "example.com",
        dependencies(
          response(compressed, {
            headers: {
              "content-type": "application/json",
              "content-encoding": "gzip",
            },
          }),
        ),
      ),
    ).rejects.toThrow("decompressed body is too large");
  });

  test("aborts a slow body at the total deadline", async () => {
    const abort = vi.fn();
    const slow = response("", {
      abort,
      body: (async function* () {
        await new Promise(() => undefined);
        yield Buffer.from("{}");
      })(),
    });
    await expect(
      secureFetchDomainProof("example.com", {
        ...dependencies(slow),
        totalTimeoutMs: 5,
      }),
    ).rejects.toThrow("total deadline exceeded");
    expect(abort).toHaveBeenCalledOnce();
  });

  test.each([
    "not json",
    '{"domain":"example.com","domain":"attacker.example"}',
    "[]",
  ])("rejects malformed or duplicate-key body %s", async (source) => {
    await expect(
      secureFetchDomainProof("example.com", dependencies(response(source))),
    ).rejects.toThrow();
  });

  test("fails closed when DNS or first-byte work exceeds the total budget", async () => {
    await expect(
      secureFetchDomainProof("example.com", {
        resolve: () => new Promise(() => undefined),
        totalTimeoutMs: 5,
      }),
    ).rejects.toThrow("DNS deadline exceeded");
    await expect(
      secureFetchDomainProof("example.com", {
        resolve: async () => publicAddresses,
        request: () => new Promise(() => undefined),
        totalTimeoutMs: 5,
      }),
    ).rejects.toThrow("first-byte deadline exceeded");
  });
});
