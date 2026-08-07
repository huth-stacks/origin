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

/**
 * Leather answers either the bare body or a JSON-RPC `{ result: … }` envelope
 * depending on the build, so every reader below unwraps both and asserts
 * nothing about the shape underneath.
 */
function unwrap(response: unknown): Record<string, unknown> {
  const outer = (response ?? {}) as Record<string, unknown>;
  const inner = outer.result;
  return (inner && typeof inner === "object" ? inner : outer) as Record<
    string,
    unknown
  >;
}

export function readStxAddress(response: unknown): string | undefined {
  const body = unwrap(response);
  const addresses = Array.isArray(body.addresses)
    ? (body.addresses as Array<Record<string, unknown>>)
    : [];
  const entry =
    addresses.find((address) => address?.symbol === "STX") ??
    addresses.find(
      (address) =>
        typeof address?.address === "string" &&
        /^S[TP]/.test(address.address as string),
    );
  const value = entry?.address;
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

/**
 * A response can settle with `status: "proposed"` and no txid. Callers must
 * distinguish that response from a transaction broadcast.
 */
export function readTxId(response: unknown): string | undefined {
  const value = unwrap(response).txid;
  if (typeof value !== "string" || value.length === 0) return undefined;
  return value.startsWith("0x") ? value : `0x${value}`;
}

export class LeatherTimeoutError extends Error {}

export function withTimeout<T>(work: Promise<T>, ms: number) {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(
      () => reject(new LeatherTimeoutError("Leather did not answer in time")),
      ms,
    );
    work.then(resolve, reject).finally(() => clearTimeout(timer));
  });
}
