function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

export function parsePrincipalMempoolTransaction(value: unknown) {
  if (
    !isObject(value) ||
    typeof value.tx_id !== "string" ||
    !isObject(value.sender) ||
    typeof value.sender.address !== "string" ||
    typeof value.sender.nonce !== "number" ||
    !Number.isSafeInteger(value.sender.nonce) ||
    value.sender.nonce < 0
  )
    return null;
  const contractPrincipal =
    value.type === "smart_contract" &&
    isObject(value.smart_contract) &&
    typeof value.smart_contract.contract_id === "string"
      ? value.smart_contract.contract_id
      : undefined;
  return {
    txId: value.tx_id,
    sender: value.sender.address,
    nonce: value.sender.nonce,
    ...(contractPrincipal ? { contractPrincipal } : {}),
  };
}
