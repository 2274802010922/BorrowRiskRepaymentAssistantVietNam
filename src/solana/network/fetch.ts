export async function rpcFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const deadline = AbortSignal.timeout(15000),
    signal = init?.signal ? AbortSignal.any([init.signal, deadline]) : deadline;
  for (let attempt = 0; attempt < 4; attempt++) {
    const response = await fetch(input, { ...init, signal });
    if (response.status !== 429 || attempt === 3) return response;
    await response.body?.cancel();
    await new Promise<void>((resolve, reject) => {
      signal.throwIfAborted();
      const abort = () => {
        clearTimeout(timer);
        reject(signal.reason);
      };
      const timer = setTimeout(
        () => {
          signal.removeEventListener("abort", abort);
          resolve();
        },
        1500 * 2 ** attempt,
      );
      signal.addEventListener("abort", abort, { once: true });
    });
  }
  throw new Error("RPC_RETRY_EXHAUSTED");
}
export async function retryKitRpc<T>(
  operation: () => Promise<T>,
  signal?: AbortSignal,
): Promise<T> {
  for (let attempt = 0; attempt < 4; attempt++) {
    signal?.throwIfAborted();
    try {
      return await operation();
    } catch (error) {
      const status = (error as { context?: { statusCode?: unknown } })?.context?.statusCode;
      if (status !== 429 || attempt === 3) throw error;
      signal?.throwIfAborted();
      await new Promise<void>((resolve, reject) => {
        const abort = () => {
          clearTimeout(timer);
          reject(signal?.reason);
        };
        const timer = setTimeout(
          () => {
            signal?.removeEventListener("abort", abort);
            resolve();
          },
          1500 * 2 ** attempt,
        );
        signal?.addEventListener("abort", abort, { once: true });
      });
    }
  }
  throw new Error("RPC_RETRY_EXHAUSTED");
}
