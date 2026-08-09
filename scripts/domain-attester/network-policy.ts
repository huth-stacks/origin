import { isIP } from "node:net";

export interface ResolvedAddress {
  address: string;
  family: 4 | 6;
}

function ipv4Number(address: string) {
  if (isIP(address) !== 4) throw new Error(`Invalid IPv4 address: ${address}`);
  return (
    address
      .split(".")
      .reduce((value, octet) => (value << 8) + Number(octet), 0) >>> 0
  );
}

function ipv6Number(address: string) {
  if (isIP(address) !== 6) throw new Error(`Invalid IPv6 address: ${address}`);
  let source = address.toLowerCase();
  if (source.includes("%"))
    throw new Error("Scoped IPv6 addresses are forbidden");
  if (source.includes(".")) {
    const separator = source.lastIndexOf(":");
    const v4 = ipv4Number(source.slice(separator + 1));
    source = `${source.slice(0, separator)}:${(v4 >>> 16).toString(16)}:${(v4 & 0xffff).toString(16)}`;
  }
  const halves = source.split("::");
  if (halves.length > 2) throw new Error(`Invalid IPv6 address: ${address}`);
  const left = halves[0] ? halves[0].split(":") : [];
  const right = halves[1] ? halves[1].split(":") : [];
  const missing = 8 - left.length - right.length;
  if ((halves.length === 1 && missing !== 0) || missing < 0)
    throw new Error(`Invalid IPv6 address: ${address}`);
  const segments = [
    ...left,
    ...Array.from({ length: missing }, () => "0"),
    ...right,
  ];
  if (
    segments.length !== 8 ||
    segments.some((segment) => !/^[0-9a-f]{1,4}$/.test(segment))
  )
    throw new Error(`Invalid IPv6 address: ${address}`);
  return segments.reduce(
    (value, segment) => (value << 16n) | BigInt(`0x${segment}`),
    0n,
  );
}

function inIpv4Cidr(address: string, cidr: string) {
  const [network, prefixSource] = cidr.split("/");
  const prefix = Number(prefixSource);
  if (!network || !Number.isInteger(prefix) || prefix < 0 || prefix > 32)
    throw new Error(`Invalid IPv4 CIDR: ${cidr}`);
  const mask = prefix === 0 ? 0 : (0xffffffff << (32 - prefix)) >>> 0;
  return (ipv4Number(address) & mask) === (ipv4Number(network) & mask);
}

function inIpv6Cidr(address: string, cidr: string) {
  const [network, prefixSource] = cidr.split("/");
  const prefix = Number(prefixSource);
  if (!network || !Number.isInteger(prefix) || prefix < 0 || prefix > 128)
    throw new Error(`Invalid IPv6 CIDR: ${cidr}`);
  const shift = BigInt(128 - prefix);
  return ipv6Number(address) >> shift === ipv6Number(network) >> shift;
}

export function addressInCidr(address: string, cidr: string) {
  const family = isIP(address);
  const network = cidr.split("/")[0] ?? "";
  if (family === 4 && isIP(network) === 4) return inIpv4Cidr(address, cidr);
  if (family === 6 && isIP(network) === 6) return inIpv6Cidr(address, cidr);
  return false;
}

function addressesEqual(left: string, right: string) {
  const family = isIP(left);
  if (family !== isIP(right)) return false;
  if (family === 4) return ipv4Number(left) === ipv4Number(right);
  if (family === 6) return ipv6Number(left) === ipv6Number(right);
  return false;
}

const BLOCKED_IPV4 = [
  "0.0.0.0/8",
  "10.0.0.0/8",
  "100.64.0.0/10",
  "127.0.0.0/8",
  "169.254.0.0/16",
  "172.16.0.0/12",
  "192.0.0.0/24",
  "192.0.2.0/24",
  "192.88.99.0/24",
  "192.168.0.0/16",
  "198.18.0.0/15",
  "198.51.100.0/24",
  "203.0.113.0/24",
  "224.0.0.0/4",
  "240.0.0.0/4",
];

const BLOCKED_IPV6 = [
  "::/128",
  "::1/128",
  "::ffff:0:0/96",
  "64:ff9b::/96",
  "64:ff9b:1::/48",
  "100::/64",
  "2001::/23",
  "2001:db8::/32",
  "2002::/16",
  "3ffe::/16",
  "fc00::/7",
  "fe80::/10",
  "ff00::/8",
];

export function isGloballyRoutableAddress(address: string) {
  const family = isIP(address);
  if (family === 4)
    return !BLOCKED_IPV4.some((cidr) => addressInCidr(address, cidr));
  if (family === 6) {
    if (!addressInCidr(address, "2000::/3")) return false;
    return !BLOCKED_IPV6.some((cidr) => addressInCidr(address, cidr));
  }
  return false;
}

export function validateResolvedAddresses(
  addresses: readonly ResolvedAddress[],
  options: {
    serviceAddresses?: ReadonlySet<string>;
    internalCidrs?: readonly string[];
  } = {},
) {
  if (addresses.length === 0) throw new Error("Domain returned no addresses");
  const unique = new Map<string, ResolvedAddress>();
  for (const answer of addresses) {
    if (isIP(answer.address) !== answer.family)
      throw new Error("DNS answer family does not match its address");
    if (!isGloballyRoutableAddress(answer.address))
      throw new Error("Domain resolved to a non-public address");
    if (
      [...(options.serviceAddresses ?? [])].some((address) =>
        addressesEqual(address, answer.address),
      )
    )
      throw new Error("Domain resolved to an attester service address");
    if (
      options.internalCidrs?.some((cidr) => addressInCidr(answer.address, cidr))
    )
      throw new Error("Domain resolved to a configured internal network");
    unique.set(`${answer.family}:${answer.address}`, answer);
  }
  return [...unique.values()].sort(
    (left, right) =>
      left.family - right.family || left.address.localeCompare(right.address),
  );
}
