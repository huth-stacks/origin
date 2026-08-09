import { Cl } from "@stacks/transactions";
import { describe, expect, test } from "vitest";

const accounts = simnet.getAccounts();
const deployer = accounts.get("deployer");

if (!deployer) throw new Error("Missing Simnet deployer account");

describe("origin-demo-target", () => {
  test("records a harmless state-only action", () => {
    const receipt = simnet.callPublicFn(
      "origin-demo-target",
      "record-demo-action",
      [],
      deployer,
    );

    expect(receipt.result).toBeOk(Cl.uint(1));
    expect(receipt.events).toHaveLength(1);
    expect(receipt.events.map((event) => event.event)).toEqual(["print_event"]);
    expect(
      simnet.callReadOnlyFn(
        "origin-demo-target",
        "get-invocation-count",
        [],
        deployer,
      ).result,
    ).toBeUint(1);
  });
});
