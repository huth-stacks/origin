import type { TxBroadcastResult } from "@stacks/transactions";

export function acceptedTxId(result: TxBroadcastResult, action: string) {
  if ("error" in result)
    throw new Error(`${action} failed: ${result.reason}: ${result.error}`);
  return result.txid;
}

export function requireExplicitTestnetBroadcast(args: string[]) {
  if (!args.includes("--broadcast"))
    throw new Error(
      "Refusing to broadcast without the explicit --broadcast flag",
    );
}
