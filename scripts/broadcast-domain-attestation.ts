import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

import {
  broadcastTransaction,
  deserializeTransaction,
} from "@stacks/transactions";

import { DomainAttesterStore } from "./domain-attester/store.ts";
import { readTransactionPreflightEvidence } from "./testnet-transaction-preflight.ts";
import { classifyTransactionPreflight } from "./testnet-transaction-preflight.ts";
import { acceptedTxId } from "./testnet-transaction-utils.ts";

function readArgument(name: string, fallback?: string) {
  const index = process.argv.indexOf(name);
  const value = index < 0 ? fallback : process.argv[index + 1];
  if (!value || value.startsWith("--"))
    throw new Error(`Missing required ${name} argument`);
  return value;
}

if (!process.argv.includes("--broadcast"))
  throw new Error("Refusing domain broadcast without explicit --broadcast");
const requestId = readArgument("--request-id");
if (!/^[0-9a-f]{64}$/.test(requestId))
  throw new Error("Domain request ID must be 32-byte lowercase hex");
const databasePath = resolve(
  readArgument(
    "--database",
    "settings/origin-domain-attester-requests.local.sqlite",
  ),
);
const manifest = JSON.parse(
  await readFile(resolve("deployments/testnet-fixtures.json"), "utf8"),
) as { apiUrl: string };
const store = new DomainAttesterStore(databasePath);

try {
  let request = store.get(requestId);
  if (request.state === "confirmed") {
    console.log(
      JSON.stringify({ state: "confirmed", requestId, txId: request.txId }),
    );
    process.exitCode = 0;
  } else {
    if (
      !["signed", "broadcast-unknown", "pending"].includes(request.state) ||
      request.signerNonce === undefined ||
      !request.serializedTransaction ||
      !request.txId
    )
      throw new Error("Domain request has no broadcastable signed transaction");
    const transaction = deserializeTransaction(
      Uint8Array.from(Buffer.from(request.serializedTransaction, "hex")),
    );
    if (transaction.txid() !== request.txId)
      throw new Error("Domain transaction bytes do not match the journaled ID");
    const preflight = classifyTransactionPreflight({
      planned: {
        txId: request.txId,
        sender: request.attester,
        nonce: request.signerNonce,
        previouslyJournaled: request.state !== "signed",
      },
      ...(await readTransactionPreflightEvidence({
        apiUrl: manifest.apiUrl,
        txId: request.txId,
        sender: request.attester,
      })),
    });
    if (preflight.action === "continue") {
      if (request.state === "signed")
        request = store.transition(
          requestId,
          "broadcast-unknown",
          Math.floor(Date.now() / 1_000),
        );
      request = store.transition(
        requestId,
        "confirmed",
        Math.floor(Date.now() / 1_000),
      );
    } else if (preflight.action === "wait") {
      if (request.state === "signed")
        request = store.transition(
          requestId,
          "broadcast-unknown",
          Math.floor(Date.now() / 1_000),
        );
      request = store.transition(
        requestId,
        "pending",
        Math.floor(Date.now() / 1_000),
      );
    } else if (preflight.action === "broadcast") {
      request = store.transition(
        requestId,
        "broadcast-unknown",
        Math.floor(Date.now() / 1_000),
      );
      const result = await broadcastTransaction({
        transaction,
        network: "testnet",
      });
      const txId = acceptedTxId(result, "Domain attestation broadcast");
      if (txId.replace(/^0x/, "") !== request.txId?.replace(/^0x/, ""))
        throw new Error("Domain broadcast transaction ID mismatch");
      request = store.transition(
        requestId,
        "pending",
        Math.floor(Date.now() / 1_000),
      );
    } else {
      throw new Error(
        `Domain broadcast preflight ${preflight.action}: ${preflight.reason}`,
      );
    }
    console.log(
      JSON.stringify({ state: request.state, requestId, txId: request.txId }),
    );
  }
} finally {
  store.close();
}
