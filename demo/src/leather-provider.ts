import { createDemoContractCall, type DemoScenario } from "./demo-scenarios";

export interface LeatherProvider {
  request(
    method: "stx_callContract",
    params: ReturnType<typeof createDemoContractCall>,
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

export async function requestDemoContractCall(
  provider: LeatherProvider,
  scenario: DemoScenario,
) {
  return provider.request("stx_callContract", createDemoContractCall(scenario));
}
