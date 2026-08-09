import { chmodSync } from "node:fs";
import { createConnection, createServer, type Server } from "node:net";
import { timingSafeEqual } from "node:crypto";

import { parseStrictJsonObject } from "./strict-json.ts";
import type { SignedAuthorization, SignerAuthorization } from "./types.ts";

const IPC_VERSION = 1;
const IPC_MAX_MESSAGE_BYTES = 32 * 1024;
const IPC_TIMEOUT_MS = 5_000;

interface IpcSigner {
  sign(authorization: SignerAuthorization): Promise<SignedAuthorization>;
}

function validToken(value: unknown) {
  return typeof value === "string" && /^[0-9a-f]{64}$/.test(value);
}

function tokensEqual(left: string, right: string) {
  if (!validToken(left) || !validToken(right)) return false;
  return timingSafeEqual(Buffer.from(left, "hex"), Buffer.from(right, "hex"));
}

export function parseSignerIpcRequest(source: string, expectedToken: string) {
  const value = parseStrictJsonObject(source);
  const keys = Object.keys(value).sort();
  if (keys.join(",") !== "authorization,operation,token,version")
    throw new Error("Invalid signer IPC request shape");
  if (value.version !== IPC_VERSION || value.operation !== "sign")
    throw new Error("Unsupported signer IPC request");
  if (
    typeof value.token !== "string" ||
    !tokensEqual(value.token, expectedToken)
  )
    throw new Error("Signer IPC authentication failed");
  if (
    typeof value.authorization !== "object" ||
    value.authorization === null ||
    Array.isArray(value.authorization)
  )
    throw new Error("Invalid signer IPC authorization");
  return value.authorization as unknown as SignerAuthorization;
}

export function parseSignerIpcResponse(source: string): SignedAuthorization {
  const response = parseStrictJsonObject(source);
  if (
    Object.keys(response).sort().join(",") !== "ok,signed" ||
    response.ok !== true ||
    typeof response.signed !== "object" ||
    response.signed === null ||
    Array.isArray(response.signed)
  )
    throw new Error("Signer rejected authorization");
  const signed = response.signed as Record<string, unknown>;
  if (
    Object.keys(signed).sort().join(",") !==
      "requestId,serializedTransaction,signerNonce,txId" ||
    typeof signed.requestId !== "string" ||
    !/^[0-9a-f]{64}$/.test(signed.requestId) ||
    typeof signed.signerNonce !== "number" ||
    !Number.isSafeInteger(signed.signerNonce) ||
    signed.signerNonce < 0 ||
    typeof signed.serializedTransaction !== "string" ||
    !/^(?:[0-9a-f]{2})+$/.test(signed.serializedTransaction) ||
    typeof signed.txId !== "string" ||
    !/^[0-9a-f]{64}$/.test(signed.txId)
  )
    throw new Error("Signer IPC returned invalid transaction data");
  return signed as unknown as SignedAuthorization;
}

export async function startSignerIpcServer(options: {
  socketPath: string;
  token: string;
  signer: IpcSigner;
  logger?: (entry: { disposition: string; requestId?: string }) => void;
  timeoutMs?: number;
}) {
  if (!validToken(options.token)) throw new Error("Invalid signer IPC token");
  const server = createServer((socket) => {
    let closed = false;
    const reply = (value: unknown) => {
      if (closed || socket.destroyed || !socket.writable) return;
      socket.end(`${JSON.stringify(value)}\n`);
    };
    socket.once("error", () => {
      closed = true;
      options.logger?.({ disposition: "connection-error" });
    });
    socket.once("close", () => {
      closed = true;
    });
    socket.setTimeout(options.timeoutMs ?? IPC_TIMEOUT_MS, () => {
      closed = true;
      socket.destroy();
    });
    let bytes = 0;
    let source = "";
    let handled = false;
    socket.setEncoding("utf8");
    socket.on("data", (chunk: string) => {
      if (handled) return;
      bytes += Buffer.byteLength(chunk);
      if (bytes > IPC_MAX_MESSAGE_BYTES) {
        handled = true;
        reply({ ok: false, error: "signer-rejected" });
        return;
      }
      source += chunk;
      const newline = source.indexOf("\n");
      if (newline < 0) return;
      handled = true;
      const line = source.slice(0, newline);
      source = "";
      void (async () => {
        try {
          const authorization = parseSignerIpcRequest(line, options.token);
          const signed = await options.signer.sign(authorization);
          options.logger?.({
            disposition: "signed",
            requestId: signed.requestId,
          });
          reply({ ok: true, signed });
        } catch {
          options.logger?.({ disposition: "rejected" });
          reply({ ok: false, error: "signer-rejected" });
        }
      })();
    });
  });
  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen(options.socketPath, () => {
      server.off("error", reject);
      resolve();
    });
  });
  chmodSync(options.socketPath, 0o600);
  return server;
}

export function closeSignerIpcServer(server: Server) {
  return new Promise<void>((resolve, reject) => {
    server.close((error) => (error ? reject(error) : resolve()));
  });
}

export function signOverIpc(options: {
  socketPath: string;
  token: string;
  authorization: SignerAuthorization;
  timeoutMs?: number;
}) {
  if (!validToken(options.token))
    return Promise.reject(new Error("Invalid signer IPC token"));
  return new Promise<SignedAuthorization>((resolve, reject) => {
    const socket = createConnection(options.socketPath);
    let source = "";
    let bytes = 0;
    let settled = false;
    const fail = (error: Error) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      socket.destroy();
      reject(error);
    };
    const timer = setTimeout(() => {
      fail(new Error("Signer IPC deadline exceeded"));
    }, options.timeoutMs ?? IPC_TIMEOUT_MS);
    socket.setEncoding("utf8");
    socket.once("error", (error) => {
      fail(error);
    });
    socket.once("connect", () => {
      socket.write(
        `${JSON.stringify({
          version: IPC_VERSION,
          operation: "sign",
          token: options.token,
          authorization: options.authorization,
        })}\n`,
      );
    });
    socket.on("data", (chunk: string) => {
      bytes += Buffer.byteLength(chunk);
      if (bytes > IPC_MAX_MESSAGE_BYTES) {
        fail(new Error("Signer IPC response is too large"));
        return;
      }
      source += chunk;
      const newline = source.indexOf("\n");
      if (newline < 0) return;
      try {
        const signed = parseSignerIpcResponse(source.slice(0, newline));
        settled = true;
        clearTimeout(timer);
        socket.end();
        resolve(signed);
      } catch (error) {
        fail(error instanceof Error ? error : new Error("Signer IPC failed"));
        return;
      }
    });
  });
}
