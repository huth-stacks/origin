import { promises as dns } from "node:dns";
import { request as httpsRequest } from "node:https";
import { Readable } from "node:stream";
import { createBrotliDecompress, createGunzip, createInflate } from "node:zlib";

import { normalizeRegistrableDomain } from "./domain-policy.ts";
import {
  validateResolvedAddresses,
  type ResolvedAddress,
} from "./network-policy.ts";
import { parseStrictJsonObject } from "./strict-json.ts";

export const DOMAIN_PROOF_PATH = "/.well-known/stacks-origin.json";
export const DOMAIN_FETCH_TOTAL_TIMEOUT_MS = 5_000;
export const DOMAIN_FETCH_CONNECT_TIMEOUT_MS = 1_500;
export const DOMAIN_FETCH_FIRST_BYTE_TIMEOUT_MS = 2_500;
export const DOMAIN_FETCH_MAX_BODY_BYTES = 64 * 1024;
export const DOMAIN_FETCH_MAX_HEADER_BYTES = 16 * 1024;

export interface PinnedRequest {
  method: "GET";
  hostname: string;
  servername: string;
  address: string;
  family: 4 | 6;
  port: 443;
  path: typeof DOMAIN_PROOF_PATH;
  headers: Readonly<Record<string, string>>;
  rejectUnauthorized: true;
  useEnvironmentProxy: false;
  timeoutMs: number;
  connectTimeoutMs: number;
  firstByteTimeoutMs: number;
}

export interface PinnedResponse {
  statusCode: number;
  headers: Readonly<Record<string, string | string[] | undefined>>;
  headerBytes: number;
  body: AsyncIterable<Uint8Array>;
  abort: () => void;
}

export interface SecureFetchDependencies {
  resolve: (hostname: string) => Promise<ResolvedAddress[]>;
  request: (request: PinnedRequest) => Promise<PinnedResponse>;
  serviceAddresses?: ReadonlySet<string>;
  internalCidrs?: readonly string[];
  nowMs?: () => number;
  totalTimeoutMs?: number;
}

async function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  message: string,
) {
  if (timeoutMs <= 0) throw new Error(message);
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      promise,
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => reject(new Error(message)), timeoutMs);
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

async function defaultResolve(hostname: string) {
  const [v4, v6] = await Promise.allSettled([
    dns.resolve4(hostname),
    dns.resolve6(hostname),
  ]);
  return [
    ...(v4.status === "fulfilled"
      ? v4.value.map((address): ResolvedAddress => ({ address, family: 4 }))
      : []),
    ...(v6.status === "fulfilled"
      ? v6.value.map((address): ResolvedAddress => ({ address, family: 6 }))
      : []),
  ];
}

function estimateHeaderBytes(
  headers: Readonly<Record<string, string | string[] | undefined>>,
) {
  return Object.entries(headers).reduce(
    (total, [name, value]) =>
      total +
      Buffer.byteLength(name) +
      (Array.isArray(value)
        ? value.reduce((sum, item) => sum + Buffer.byteLength(item), 0)
        : Buffer.byteLength(value ?? "")),
    0,
  );
}

export function requestPinnedHttps(options: PinnedRequest) {
  return new Promise<PinnedResponse>((resolve, reject) => {
    const request = httpsRequest(
      {
        agent: false,
        family: options.family,
        headers: options.headers,
        hostname: options.hostname,
        lookup: (_hostname, _lookupOptions, callback) =>
          callback(null, options.address, options.family),
        maxHeaderSize: DOMAIN_FETCH_MAX_HEADER_BYTES,
        method: options.method,
        path: options.path,
        port: options.port,
        rejectUnauthorized: options.rejectUnauthorized,
        servername: options.servername,
      },
      (response) => {
        clearTimeout(firstByteTimer);
        resolve({
          statusCode: response.statusCode ?? 0,
          headers: response.headers,
          headerBytes: estimateHeaderBytes(response.headers),
          body: response,
          abort: () => response.destroy(new Error("Domain fetch aborted")),
        });
      },
    );
    const connectTimer = setTimeout(
      () =>
        request.destroy(new Error("Domain fetch connect deadline exceeded")),
      options.connectTimeoutMs,
    );
    const firstByteTimer = setTimeout(
      () =>
        request.destroy(new Error("Domain fetch first-byte deadline exceeded")),
      options.firstByteTimeoutMs,
    );
    request.once("socket", (socket) => {
      socket.once("secureConnect", () => clearTimeout(connectTimer));
    });
    request.once("error", (error) => {
      clearTimeout(connectTimer);
      clearTimeout(firstByteTimer);
      reject(error);
    });
    request.end();
  });
}

function oneHeader(
  headers: Readonly<Record<string, string | string[] | undefined>>,
  name: string,
) {
  const value = headers[name];
  if (Array.isArray(value))
    throw new Error(`Domain proof returned duplicate ${name} headers`);
  return value;
}

function decodedBody(
  body: AsyncIterable<Uint8Array>,
  contentEncoding: string | undefined,
) {
  const stream = Readable.from(body);
  if (!contentEncoding || contentEncoding === "identity") return stream;
  if (contentEncoding === "gzip") return stream.pipe(createGunzip());
  if (contentEncoding === "deflate") return stream.pipe(createInflate());
  if (contentEncoding === "br") return stream.pipe(createBrotliDecompress());
  throw new Error("Domain proof returned an unsupported content encoding");
}

async function consumeBoundedBody(response: PinnedResponse, timeoutMs: number) {
  const contentLength = oneHeader(response.headers, "content-length");
  if (
    contentLength &&
    (!/^\d+$/.test(contentLength) ||
      Number(contentLength) > DOMAIN_FETCH_MAX_BODY_BYTES)
  )
    throw new Error("Domain proof compressed body is too large");
  let compressedBytes = 0;
  async function* countCompressed() {
    for await (const chunk of response.body) {
      compressedBytes += chunk.byteLength;
      if (compressedBytes > DOMAIN_FETCH_MAX_BODY_BYTES)
        throw new Error("Domain proof compressed body is too large");
      yield chunk;
    }
  }
  const body = async () => {
    const chunks: Uint8Array[] = [];
    let decodedBytes = 0;
    for await (const chunk of decodedBody(
      countCompressed(),
      oneHeader(response.headers, "content-encoding")?.toLowerCase(),
    )) {
      decodedBytes += chunk.byteLength;
      if (decodedBytes > DOMAIN_FETCH_MAX_BODY_BYTES)
        throw new Error("Domain proof decompressed body is too large");
      chunks.push(chunk);
    }
    return Buffer.concat(chunks, decodedBytes);
  };
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      body(),
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => {
          reject(new Error("Domain fetch total deadline exceeded"));
        }, timeoutMs);
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

export async function secureFetchDomainProof(
  inputDomain: string,
  dependencies: Partial<SecureFetchDependencies> = {},
) {
  const domain = normalizeRegistrableDomain(inputDomain);
  const nowMs = dependencies.nowMs ?? (() => performance.now());
  const startedAt = nowMs();
  const totalTimeoutMs =
    dependencies.totalTimeoutMs ?? DOMAIN_FETCH_TOTAL_TIMEOUT_MS;
  const remaining = () => totalTimeoutMs - (nowMs() - startedAt);
  const resolveAddresses = dependencies.resolve ?? defaultResolve;
  const addresses = await withTimeout(
    resolveAddresses(domain),
    remaining(),
    "Domain DNS deadline exceeded",
  );
  const validated = validateResolvedAddresses(addresses, {
    serviceAddresses: dependencies.serviceAddresses,
    internalCidrs: dependencies.internalCidrs,
  });
  const selected = validated[0];
  if (!selected) throw new Error("Domain returned no validated addresses");
  const request: PinnedRequest = {
    method: "GET",
    hostname: domain,
    servername: domain,
    address: selected.address,
    family: selected.family,
    port: 443,
    path: DOMAIN_PROOF_PATH,
    headers: {
      accept: "application/json",
      "user-agent": "Origin-Testnet-Attester/1",
    },
    rejectUnauthorized: true,
    useEnvironmentProxy: false,
    timeoutMs: remaining(),
    connectTimeoutMs: Math.min(DOMAIN_FETCH_CONNECT_TIMEOUT_MS, remaining()),
    firstByteTimeoutMs: Math.min(
      DOMAIN_FETCH_FIRST_BYTE_TIMEOUT_MS,
      remaining(),
    ),
  };
  if (request.timeoutMs <= 0)
    throw new Error("Domain fetch deadline exhausted");
  const response = await withTimeout(
    (dependencies.request ?? requestPinnedHttps)(request),
    remaining(),
    "Domain fetch first-byte deadline exceeded",
  );
  try {
    if (response.statusCode >= 300 && response.statusCode < 400)
      throw new Error("Domain proof redirects are forbidden");
    if (response.statusCode < 200 || response.statusCode >= 300)
      throw new Error("Domain proof request was not successful");
    if (response.headerBytes > DOMAIN_FETCH_MAX_HEADER_BYTES)
      throw new Error("Domain proof response headers are too large");
    const contentType = oneHeader(response.headers, "content-type");
    if (
      !contentType ||
      !/^application\/json(?:\s*;\s*charset=utf-8)?$/i.test(contentType)
    )
      throw new Error("Domain proof response is not JSON");
    const bytes = await consumeBoundedBody(response, Math.max(1, remaining()));
    let source: string;
    try {
      source = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
    } catch {
      throw new Error("Domain proof response is not valid UTF-8");
    }
    return {
      domain,
      resolvedAddresses: validated,
      pinnedAddress: selected,
      responseBytes: bytes.byteLength,
      document: parseStrictJsonObject(source),
      request,
    };
  } catch (error) {
    try {
      response.abort();
    } catch {
      // Preserve the policy failure even if the transport is already closed.
    }
    throw error;
  }
}
