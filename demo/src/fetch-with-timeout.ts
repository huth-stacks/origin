export async function fetchWithTimeout(
  fetchFn: typeof fetch,
  input: Parameters<typeof fetch>[0],
  init: RequestInit | undefined,
  timeoutMs: number,
) {
  if (!Number.isFinite(timeoutMs) || timeoutMs <= 0)
    throw new Error("Fetch deadline exhausted");
  const controller = new AbortController();
  const requestSignal = init?.signal ?? undefined;
  const signal = requestSignal
    ? AbortSignal.any([controller.signal, requestSignal])
    : controller.signal;
  let timeout: ReturnType<typeof setTimeout> | undefined;
  const deadline = new Promise<never>((_, reject) => {
    timeout = setTimeout(() => {
      controller.abort();
      reject(new Error("Fetch deadline exceeded"));
    }, timeoutMs);
  });
  try {
    return await Promise.race([fetchFn(input, { ...init, signal }), deadline]);
  } finally {
    if (timeout) clearTimeout(timeout);
  }
}
