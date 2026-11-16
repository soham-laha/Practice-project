import { KEYS } from './storage';
export async function apiRequest(path: string, body: object | FormData) {
  const key = localStorage.getItem(KEYS.key);
  if (!key)
    throw new Error(
      'Add your free Gemini key to use the forge or AI coach. Reference drills never need a key.',
    );
  let endpoint = `/api/engine/${path}`;
  if (body instanceof FormData) {
    const config = await fetch('/api/engine/upload-target', {
      cache: 'no-store',
      credentials: 'omit',
      redirect: 'error',
      signal: AbortSignal.timeout(10000),
    });
    if (!config.ok) throw new Error('The upload backend is not configured for secure uploads.');
    const { url } = await config.json();
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
  const response = await fetch(endpoint, {
    method: 'POST',
    headers,
    body: body instanceof FormData ? body : JSON.stringify(body),
    cache: 'no-store',
    credentials: 'omit',
    redirect: 'error',
    signal: AbortSignal.timeout(115000),
  });
  const result = await response.json();
  if (!response.ok)
    throw new Error(
      typeof result.detail === 'string'
        ? result.detail
        : 'The request could not be completed. Check your source and try again.',
    );
  return result;
}
