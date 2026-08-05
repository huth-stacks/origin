import { describe, expect, test } from "vitest";

import {
  createDemoContractCall,
  demoScenarios,
} from "../demo/src/demo-scenarios";
import {
  connectLeather,
  requestDemoContractCall,
  type LeatherProvider,
} from "../demo/src/leather-provider";
import fixtures from "../deployments/testnet-fixtures.json";

describe("Origin demo requests", () => {
  test("connects to a Stacks Testnet account through the normal Leather method", async () => {
    const calls: Array<{ method: string; params: unknown }> = [];
    const provider: LeatherProvider = {
      async request(method, params) {
        calls.push({ method, params });
        return { addresses: [] };
      },
    };

    await connectLeather(provider);

    expect(calls).toEqual([
      {
        method: "getAddresses",
        params: { network: "testnet", chains: ["stacks"] },
      },
    ]);
  });

  test("pins every scenario to its exact deployed fixture principal", () => {
    expect(
      demoScenarios.map((scenario) => [scenario.id, scenario.subject]),
    ).toEqual([
      ["known", fixtures.fixtures.known.subject],
      ["unrecognized", fixtures.fixtures.unrecognized.subject],
      ["lookalike", fixtures.fixtures.lookalike.subject],
    ]);
  });

  test.each(demoScenarios)(
    "$id sends only a harmless Testnet contract call",
    (scenario) => {
      const request = createDemoContractCall(scenario);

      expect(request).toEqual({
        contract: scenario.subject,
        functionName: "record-demo-action",
        functionArgs: [],
        network: "testnet",
        postConditionMode: "deny",
        postConditions: [],
      });
      expect(Object.keys(request).sort()).toEqual(
        [
          "contract",
          "functionArgs",
          "functionName",
          "network",
          "postConditionMode",
          "postConditions",
        ].sort(),
      );
    },
  );

  test("uses the normal Leather RPC method without attaching identity hints", async () => {
    const calls: Array<{ method: string; params: unknown }> = [];
    const provider: LeatherProvider = {
      async request(method, params) {
        calls.push({ method, params });
        return { transaction: "0x00" };
      },
    };

    await requestDemoContractCall(provider, demoScenarios[1]);

    expect(calls).toEqual([
      {
        method: "stx_callContract",
        params: createDemoContractCall(demoScenarios[1]),
      },
    ]);
    expect(JSON.stringify(calls)).not.toMatch(
      /attester|issuer|organization|origin|verdict|canonical/i,
    );
  });
});
