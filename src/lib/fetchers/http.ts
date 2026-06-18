type FetchInit = RequestInit & {
  next?: {
    revalidate?: number;
  };
};

export async function fetchWithTimeout(
  url: string,
  init: FetchInit = {},
  timeoutMs = 10_000
): Promise<Response> {
  const controller = new AbortController();
  let timeout: ReturnType<typeof setTimeout> | undefined;

  try {
    const request = fetch(url, {
      ...init,
      signal: controller.signal,
    });

    const timer = new Promise<never>((_, reject) => {
      timeout = setTimeout(() => {
        controller.abort();
        reject(new Error(`Fetch timeout after ${timeoutMs}ms`));
      }, timeoutMs);
    });

    return await Promise.race([request, timer]);
  } finally {
    if (timeout) clearTimeout(timeout);
  }
}
