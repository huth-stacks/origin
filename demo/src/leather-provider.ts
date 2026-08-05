import { createDemoContractCall, type DemoScenario } from "./demo-scenarios";

export interface ConnectLeatherRequest {
  network: "testnet";
  chains: ["stacks"];
}

interface LeatherRequestMap {
  getAddresses: ConnectLeatherRequest;
  stx_callContract: ReturnType<typeof createDemoContractCall>;
}

export interface LeatherProvider {
  request<Method extends keyof LeatherRequestMap>(
    method: Method,
    params: LeatherRequestMap[Method],
  ): Promise<unknown>;
}

declare global {
  interface Window {
    LeatherProvider?: LeatherProvider;
  }
}

export function findLeatherProvider(
  scope: Pick<Window, "LeatherProvider"> = window,
) {
  return scope.LeatherProvider ?? null;
}

export function connectLeather(provider: LeatherProvider) {
  const request: ConnectLeatherRequest = {
    network: "testnet",
    chains: ["stacks"],
  };
  return provider.request("getAddresses", request);
}

export async function requestDemoContractCall(
  provider: LeatherProvider,
  scenario: DemoScenario,
) {
  return provider.request("stx_callContract", createDemoContractCall(scenario));
}
