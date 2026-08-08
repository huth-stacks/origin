import type { DomainAttesterService } from "./service.ts";
import type { DomainAttesterStore } from "./store.ts";

export type DomainAttesterOperatorCommand =
  | { kind: "help" }
  | {
      kind: "challenge";
      domain: string;
      subject: string;
      role: string;
      sourceAddress: string;
    }
  | { kind: "verify" | "sign" | "status"; requestId: string };

const HELP = `Origin domain attester (local operator only)

Commands:
  challenge --domain <eTLD+1> --subject <contract-principal> --role <role> --source-address <public-ip>
  verify --request-id <32-byte-lowercase-hex>
  sign --request-id <32-byte-lowercase-hex>
  status --request-id <32-byte-lowercase-hex>

This command never broadcasts a transaction.`;

function exactFlags(args: string[], names: readonly string[]) {
  const expected = new Set(names);
  const values = new Map<string, string>();
  for (let index = 0; index < args.length; index += 2) {
    const name = args[index];
    const value = args[index + 1];
    if (!name || !expected.has(name) || !value || value.startsWith("--"))
      throw new Error("Invalid domain attester operator arguments");
    if (values.has(name))
      throw new Error(`Duplicate domain attester operator flag: ${name}`);
    values.set(name, value);
  }
  const missing = names.find((name) => !values.has(name));
  if (missing)
    throw new Error(`Missing domain attester operator flag: ${missing}`);
  return values;
}

function requestCommand(
  kind: "verify" | "sign" | "status",
  args: string[],
): DomainAttesterOperatorCommand {
  const requestId = exactFlags(args, ["--request-id"]).get("--request-id")!;
  if (!/^[0-9a-f]{64}$/.test(requestId))
    throw new Error("Invalid domain attester request ID");
  return { kind, requestId };
}

export function parseDomainAttesterOperatorCommand(
  args: string[],
): DomainAttesterOperatorCommand {
  const [command, ...rest] = args;
  if (!command || command === "help" || command === "--help") {
    if (rest.length > 0)
      throw new Error("Help does not accept domain attester arguments");
    return { kind: "help" };
  }
  if (command === "challenge") {
    const values = exactFlags(rest, [
      "--domain",
      "--subject",
      "--role",
      "--source-address",
    ]);
    return {
      kind: "challenge",
      domain: values.get("--domain")!,
      subject: values.get("--subject")!,
      role: values.get("--role")!,
      sourceAddress: values.get("--source-address")!,
    };
  }
  if (command === "verify" || command === "sign" || command === "status")
    return requestCommand(command, rest);
  throw new Error(`Unsupported domain attester operator command: ${command}`);
}

export function domainAttesterOperatorHelp() {
  return HELP;
}

export async function runDomainAttesterOperatorCommand(
  command: Exclude<DomainAttesterOperatorCommand, { kind: "help" }>,
  service: DomainAttesterService,
  store: DomainAttesterStore,
) {
  if (command.kind === "challenge") {
    const challenge = await service.createChallenge(command);
    return { state: "challenge-issued", challenge };
  }
  if (command.kind === "verify") {
    const authorization = await service.verifyAndAuthorize(command.requestId);
    return { state: "authorized", authorization };
  }
  if (command.kind === "sign") {
    const signed = await service.sign(command.requestId);
    return {
      state: "signed",
      requestId: signed.requestId,
      signerNonce: signed.signerNonce,
      txId: signed.txId,
    };
  }
  store.expireStale(Math.floor(Date.now() / 1_000));
  const request = store.get(command.requestId);
  return {
    requestId: request.requestId,
    state: request.state,
    domain: request.domain,
    subject: request.subject,
    attester: request.attester,
    challengeExpiresAt: request.challenge.expiresAt,
    claimExpiresAt: request.challenge.claimExpiresAt,
    ...(request.authorization ? { authorization: request.authorization } : {}),
    ...(request.signerNonce === undefined
      ? {}
      : { signerNonce: request.signerNonce }),
    ...(request.txId ? { txId: request.txId } : {}),
    createdAt: request.createdAt,
    updatedAt: request.updatedAt,
    ...(request.disposition ? { disposition: request.disposition } : {}),
  };
}
