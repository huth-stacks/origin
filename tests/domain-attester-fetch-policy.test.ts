import { describe, expect, test } from "vitest";

import { parseDomainFetchPolicy } from "../scripts/domain-attester/fetch-policy.ts";

describe(parseDomainFetchPolicy.name, () => {
  test("requires and parses explicit production network exclusions", () => {
    expect(
      parseDomainFetchPolicy({
        ORIGIN_ATTESTER_SERVICE_ADDRESSES: "93.184.216.34,2606:4700:4700::1111",
        ORIGIN_ATTESTER_INTERNAL_CIDRS: "93.184.216.0/24,2606:4700::/32",
      }),
    ).toEqual({
      serviceAddresses: new Set(["93.184.216.34", "2606:4700:4700::1111"]),
      internalCidrs: ["93.184.216.0/24", "2606:4700::/32"],
    });
  });

  test.each([
    {},
    { ORIGIN_ATTESTER_SERVICE_ADDRESSES: "127.0.0.1" },
    { ORIGIN_ATTESTER_SERVICE_ADDRESSES: "not-an-address" },
    {
      ORIGIN_ATTESTER_SERVICE_ADDRESSES: "93.184.216.34",
      ORIGIN_ATTESTER_INTERNAL_CIDRS: "93.184.216.0/33",
    },
    {
      ORIGIN_ATTESTER_SERVICE_ADDRESSES: "93.184.216.34",
      ORIGIN_ATTESTER_INTERNAL_CIDRS: "bad/24",
    },
  ])("rejects missing or malformed fetch policy %#", (environment) => {
    expect(() => parseDomainFetchPolicy(environment)).toThrow();
  });
});
