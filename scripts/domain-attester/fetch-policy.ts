import { isIP } from "node:net";

import { addressInCidr, isGloballyRoutableAddress } from "./network-policy.ts";

export interface DomainFetchPolicy {
  serviceAddresses: ReadonlySet<string>;
  internalCidrs: readonly string[];
}

function commaSeparated(value: string | undefined) {
  return value
    ?.split(",")
    .map((item) => item.trim())
    .filter((item) => item.length > 0);
}

export function parseDomainFetchPolicy(environment: NodeJS.ProcessEnv) {
  const serviceAddresses = commaSeparated(
    environment.ORIGIN_ATTESTER_SERVICE_ADDRESSES,
  );
  if (!serviceAddresses?.length)
    throw new Error("Origin attester service addresses are required");
  for (const address of serviceAddresses)
    if (isIP(address) === 0 || !isGloballyRoutableAddress(address))
      throw new Error("Origin attester service address is invalid");

  const internalCidrs =
    commaSeparated(environment.ORIGIN_ATTESTER_INTERNAL_CIDRS) ?? [];
  for (const cidr of internalCidrs) {
    const [network, prefix, extra] = cidr.split("/");
    const family = network ? isIP(network) : 0;
    const maximum = family === 4 ? 32 : family === 6 ? 128 : -1;
    if (
      extra !== undefined ||
      prefix === undefined ||
      !/^\d+$/.test(prefix) ||
      Number(prefix) > maximum
    )
      throw new Error("Origin attester internal CIDR is invalid");
    addressInCidr(network!, cidr);
  }
  return {
    serviceAddresses: new Set(serviceAddresses),
    internalCidrs,
  } satisfies DomainFetchPolicy;
}
