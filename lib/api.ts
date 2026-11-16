import { KEYS } from './storage';

async function transport(url: string, options: RequestInit) {
  let timedOut: boolean;
  try {
    return await fetch(url, options);
  } catch (error) {
    // Native errors can expose URLs/echoed input. Retain only their category,
    // not the raw exception (including as a cause on the public error).
    timedOut =
      error instanceof Error && (error.name === 'TimeoutError' || error.name === 'AbortError');
  }
  throw new Error(
    timedOut
      ? 'The request timed out. The service may still be finishing it; no automatic retry was made. Wait before retrying, or use a reference drill.'
      : 'Could not reach the AI service. Check your connection or try later. Reference drills still work; your saved key was not changed.',
  );
}

async function readResponse(response: Response) {
  try {
    const result = await response.json();
    if (result === null || typeof result !== 'object' || Array.isArray(result)) throw new Error();
    return result;
  } catch {
    // Cold-start/gateway error pages are sometimes HTML, even when the proxy
    // labels them JSON. Never display that page or a parser stack to a learner.
    throw new Error(
      response.status === 413
        ? 'The hosting service rejected this upload as too large. Use a smaller file or paste the problem text.'
        : 'The AI service returned an unreadable response. No generated result was loaded. Try later or use a reference drill.',
    );
  }
}

export async function apiRequest(path: string, body: object | FormData) {
  let key: string | null;
  try {
    key = localStorage.getItem(KEYS.key);
  } catch {
    throw new Error(
      'Browser storage is blocked. Allow local storage to use your saved Gemini key.',
    );
  }
  if (!key)
    throw new Error(
      'Add your Gemini key to use the forge or AI coach. Reference drills never need a key.',
    );
  let endpoint = `/api/engine/${path}`;
  if (body instanceof FormData) {
    const config = await transport('/api/engine/upload-target', {
      cache: 'no-store',
      credentials: 'omit',
      redirect: 'error',
      signal: AbortSignal.timeout(10000),
    });
    if (!config.ok) throw new Error('The upload backend is not configured for secure uploads.');
    const { url } = await readResponse(config);
    if (typeof url !== 'string')
      throw new Error('The upload backend did not provide a secure, fixed upload endpoint.');
    if (url !== '/api/engine/v1/extractions/upload') {
      let target: URL;
      try {
        target = new URL(url);
        if (
          target.protocol !== 'https:' ||
          target.username ||
          target.password ||
          target.search ||
          target.hash ||
          target.pathname !== '/v1/extractions/upload' ||
          ['localhost', '127.0.0.1', '[::1]'].includes(target.hostname)
        )
          throw new Error();
      } catch {
        throw new Error('The upload backend did not provide a secure, fixed upload endpoint.');
      }
    }
    endpoint = url;
  }
  const headers: Record<string, string> = { 'X-Gemini-Api-Key': key };
  if (!(body instanceof FormData)) headers['Content-Type'] = 'application/json';
  const response = await transport(endpoint, {
    method: 'POST',
    headers,
    body: body instanceof FormData ? body : JSON.stringify(body),
    cache: 'no-store',
    credentials: 'omit',
    redirect: 'error',
    signal: AbortSignal.timeout(115000),
  });
  const result = await readResponse(response);
  if (!response.ok)
    throw new Error(
      typeof result.detail === 'string'
        ? result.detail
        : 'The request could not be completed. Check your source and try again.',
    );
  return result;
}
