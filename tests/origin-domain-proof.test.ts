import { Cl } from "@stacks/transactions";
import { describe, expect, test } from "vitest";

const accounts = simnet.getAccounts();
const deployer = accounts.get("wallet_1");
const subject = accounts.get("wallet_2");
if (!deployer || !subject) throw new Error("Missing Simnet accounts");

const requestId = Cl.bufferFromHex("11".repeat(32));

describe("origin-domain-proof", () => {
  test("records a harmless deployer proof fixture", () => {
    const publishedAt = simnet.burnBlockHeight;
    const receipt = simnet.callPublicFn(
      "origin-domain-proof",
      "publish-proof",
      [requestId, Cl.principal(subject), Cl.stringAscii("example.test")],
      deployer,
    );

    expect(receipt.result).toBeOk(Cl.bool(true));
    expect(
      simnet.callReadOnlyFn(
        "origin-domain-proof",
        "get-proof",
        [Cl.principal(deployer), requestId],
        subject,
      ).result,
    ).toBeSome(
      Cl.tuple({
        subject: Cl.principal(subject),
        domain: Cl.stringAscii("example.test"),
        "published-at": Cl.uint(publishedAt),
      }),
    );
  });

  test("rejects a request ID that is not 32 bytes", () => {
    const receipt = simnet.callPublicFn(
      "origin-domain-proof",
      "publish-proof",
      [
        Cl.bufferFromHex("11".repeat(31)),
        Cl.principal(subject),
        Cl.stringAscii("example.test"),
      ],
      deployer,
    );

    expect(receipt.result).toBeErr(Cl.uint(423));
  });

  test("rejects a forwarded proof", () => {
    const receipt = simnet.callPublicFn(
      "origin-registry-caller",
      "publish-domain-proof",
      [requestId, Cl.principal(subject), Cl.stringAscii("example.test")],
      deployer,
    );

    expect(receipt.result).toBeErr(Cl.uint(403));
  });

  test("rejects overwrite and preserves the original proof", () => {
    const original = simnet.callPublicFn(
      "origin-domain-proof",
      "publish-proof",
      [requestId, Cl.principal(subject), Cl.stringAscii("example.test")],
      deployer,
    );
    const replacement = simnet.callPublicFn(
      "origin-domain-proof",
      "publish-proof",
      [requestId, Cl.principal(deployer), Cl.stringAscii("attacker.test")],
      deployer,
    );

    expect(original.result).toBeOk(Cl.bool(true));
    expect(replacement.result).toBeErr(Cl.uint(409));
    expect(
      simnet.callReadOnlyFn(
        "origin-domain-proof",
        "get-proof",
        [Cl.principal(deployer), requestId],
        subject,
      ).result,
    ).toBeSome(
      Cl.tuple({
        subject: Cl.principal(subject),
        domain: Cl.stringAscii("example.test"),
        "published-at": Cl.uint(simnet.burnBlockHeight),
      }),
    );
  });
});
