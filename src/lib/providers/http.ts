type FetchJsonOptions = {
  headers?: Record<string, string>;
  signal?: AbortSignal;
  timeoutMs: number;
};

export class ProviderHttpError extends Error {
  constructor(
    message: string,
    readonly status: number | null
  ) {
    super(message);
    this.name = 'ProviderHttpError';
  }
}

export async function fetchProviderJson<T>(
  url: string,
  options: FetchJsonOptions
): Promise<T> {
  const controller = new AbortController();
  const abort = () => controller.abort();
  options.signal?.addEventListener('abort', abort, { once: true });
  const timeout = setTimeout(abort, options.timeoutMs);

  try {
    const response = await fetch(url, {
      headers: {
        Accept: 'application/json',
        ...options.headers,
      },
      signal: controller.signal,
      cache: 'no-store',
    });

    if (!response.ok) {
      throw new ProviderHttpError(`HTTP ${response.status}`, response.status);
    }
    return await response.json() as T;
  } catch (error) {
    if (error instanceof ProviderHttpError) throw error;
    const message = error instanceof Error ? error.message : 'Unknown provider request error';
    throw new ProviderHttpError(message, null);
  } finally {
    clearTimeout(timeout);
    options.signal?.removeEventListener('abort', abort);
  }
}
