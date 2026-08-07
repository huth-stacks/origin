import { Cl } from "@stacks/transactions";
import { describe, expect, test } from "vitest";

import { parseOriginCurrentClaim } from "../demo/src/origin-current-state";

const pair = {
  attester: "ST121HDPNYM3PYBXM6EK0NY673DWCK54ZXEXX2HHC",
  subject: "ST14T2RC089K364JC6VX1310NER40F17FNCY8WPDY.acme-action",
};

function baseTuple() {
  return {
    "issuer-name": Cl.stringAscii("Acme"),
    role: Cl.stringAscii("Demo contract"),
    "issued-at": Cl.uint(2745),
    "expires-at": Cl.uint(102745),
    revoked: Cl.bool(false),
  };
}

describe(parseOriginCurrentClaim.name, () => {
  test("parses the deployed v1 seven-field record", () => {
    expect(
      parseOriginCurrentClaim(Cl.some(Cl.tuple(baseTuple())), pair, 1),
    ).toEqual({
      ...pair,
      issuerName: "Acme",
      role: "Demo contract",
      issuedAt: 2745,
      expiresAt: 102745,
      revoked: false,
    });
  });

  test("parses the frozen v2 record and request correlator", () => {
    expect(
      parseOriginCurrentClaim(
        Cl.some(
          Cl.tuple({
            ...baseTuple(),
            revoked: Cl.bool(true),
            "revoked-at": Cl.some(Cl.uint(2800)),
            "request-id": Cl.bufferFromHex("ab".repeat(32)),
          }),
        ),
        pair,
        2,
      ),
    ).toEqual({
      ...pair,
      issuerName: "Acme",
      role: "Demo contract",
      issuedAt: 2745,
      expiresAt: 102745,
      revoked: true,
      revokedAt: 2800,
      requestId: "ab".repeat(32),
    });
  });

  test("preserves an absent map entry as neutral missing state", () => {
    expect(parseOriginCurrentClaim(Cl.none(), pair, 2)).toBeNull();
  });

  test("rejects malformed v2 request IDs instead of inferring trust", () => {
    expect(() =>
      parseOriginCurrentClaim(
        Cl.some(
          Cl.tuple({
            ...baseTuple(),
            "revoked-at": Cl.none(),
            "request-id": Cl.bufferFromHex("ab"),
          }),
        ),
        pair,
        2,
      ),
    ).toThrow("Invalid Origin request ID");
  });
});
