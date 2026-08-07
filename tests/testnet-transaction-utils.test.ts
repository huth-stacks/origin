import type { TxBroadcastResult } from "@stacks/transactions";
import { describe, expect, test } from "vitest";

import {
  acceptedTxId,
  requireExplicitTestnetBroadcast,
} from "../scripts/testnet-transaction-utils";

describe(acceptedTxId.name, () => {
  test("returns the transaction ID only for an accepted broadcast", () => {
    expect(acceptedTxId({ txid: "accepted-id" }, "Deployment")).toBe(
      "accepted-id",
    );
  });

  test("rejects a node response even when the rejection includes a transaction ID", () => {
    const rejection: TxBroadcastResult = {
      error: "Contract already exists",
      reason: "ContractAlreadyExists",
      reason_data: { contract_identifier: "ST123.origin-registry" },
      txid: "rejected-id",
    };

    expect(() => acceptedTxId(rejection, "Deployment")).toThrow(
      "Deployment failed: ContractAlreadyExists: Contract already exists",
    );
  });
});

describe(requireExplicitTestnetBroadcast.name, () => {
  test("accepts an explicit broadcast invocation", () => {
    expect(() =>
      requireExplicitTestnetBroadcast(["node", "script", "--broadcast"]),
    ).not.toThrow();
  });

  test("rejects an ordinary script invocation before it can broadcast", () => {
    expect(() =>
      requireExplicitTestnetBroadcast(["node", "script"]),
    ).toThrow("Refusing to broadcast without the explicit --broadcast flag");
  });
});
