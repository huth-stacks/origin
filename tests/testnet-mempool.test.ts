import { describe, expect, test } from "vitest";

import { parsePrincipalMempoolTransaction } from "../scripts/testnet-mempool.ts";

describe(parsePrincipalMempoolTransaction.name, () => {
  test("parses the documented v3 nested sender and deployment shape", () => {
    expect(
      parsePrincipalMempoolTransaction({
        tx_id: `0x${"ab".repeat(32)}`,
        sender: { address: "ST123", nonce: 7 },
        type: "smart_contract",
        smart_contract: { contract_id: "ST123.example" },
      }),
    ).toEqual({
      txId: `0x${"ab".repeat(32)}`,
      sender: "ST123",
      nonce: 7,
      contractPrincipal: "ST123.example",
    });
  });

  test("rejects the flat v1 sender shape at the v3 boundary", () => {
    expect(
      parsePrincipalMempoolTransaction({
        tx_id: `0x${"ab".repeat(32)}`,
        sender_address: "ST123",
        nonce: 7,
      }),
    ).toBeNull();
  });
});
