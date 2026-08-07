export async function fetchWithTimeout<T>(
  fetchFn: typeof fetch,
  input: Parameters<typeof fetch>[0],
  init: RequestInit | undefined,
  timeoutMs: number,
  consume: (response: Response) => Promise<T>,
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
    return await Promise.race([
      fetchFn(input, { ...init, signal }).then(consume),
      deadline,
    ]);
  } finally {
    if (timeout) clearTimeout(timeout);
  }
}

export function fetchJsonWithTimeout(
  fetchFn: typeof fetch,
  input: Parameters<typeof fetch>[0],
  init: RequestInit | undefined,
  timeoutMs: number,
) {
  return fetchWithTimeout(fetchFn, input, init, timeoutMs, async (response) => {
    if (!response.ok)
      return {
        ok: false,
        status: response.status,
        value: undefined,
        bodyError: false,
      };
    try {
      return {
        ok: true,
        status: response.status,
        value: (await response.json()) as unknown,
        bodyError: false,
      };
    } catch {
      return {
        ok: true,
        status: response.status,
        value: undefined,
        bodyError: true,
      };
    }
  });
}
