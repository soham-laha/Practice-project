import { KEYS } from './storage';

const diagnosticCodes = new Set([
  'provider_timeout',
  'provider_network',
  'provider_access',
  'provider_quota',
  'provider_model',
  'provider_request',
  'provider_unavailable',
  'provider_blocked',
  'provider_output_limit',
  'provider_stopped',
  'provider_empty',
  'item_contract',
  'verification_timeout',
  'verification_rejected',
]);
export type Diagnostic = { code: string; stage: string; request_id: string; revision: string };
export class ApiError extends Error {
  diagnostic?: Diagnostic;
  constructor(
    message: string,
    readonly status: number,
    raw?: unknown,
  ) {
    super(message);
    this.name = 'ApiError';
    if (!raw || typeof raw !== 'object') return;
    const value = raw as Record<string, unknown>;
    if (
      typeof value.code === 'string' &&
      diagnosticCodes.has(value.code) &&
      typeof value.stage === 'string' &&
      ['provider', 'format', 'verification'].includes(value.stage) &&
      typeof value.request_id === 'string' &&
      /^[a-f0-9]{12}$/.test(value.request_id) &&
      typeof value.revision === 'string' &&
      /^(?:[a-f0-9]{8}|workspace)$/.test(value.revision)
    )
      this.diagnostic = {
        code: value.code,
        stage: value.stage,
        request_id: value.request_id,
        revision: value.revision,
      };
  }
}

export function diagnosticReceipt(error: ApiError, model: string) {
  // Only fixed/allowlisted metadata. Never include a key, exception message,
  // source text, filename, history or provider response in a support receipt.
  const selected = ['gemini-flash-latest', 'gemini-flash-lite-latest'].includes(model)
    ? model
    : 'unknown';
  return [
    `TargetJEE interface: ${process.env.NEXT_PUBLIC_APP_REVISION || 'workspace'}`,
    `Model: ${selected}`,
    `HTTP: ${error.status}`,
    `Stage: ${error.diagnostic?.stage || 'not reported'}`,
    `Code: ${error.diagnostic?.code || 'not reported (check deployed revisions)'}`,
    `Request: ${error.diagnostic?.request_id || 'not reported'}`,
    `API revision: ${error.diagnostic?.revision || 'not reported'}`,
  ].join('\n');
}

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
    throw new ApiError(
      typeof result.detail === 'string'
        ? result.detail
        : 'The request could not be completed. Check your source and try again.',
      response.status,
      result.diagnostic,
    );
  return result;
}

export async function checkEngine() {
  // Deliberately keyless. This tests our API, not Gemini, model access or quota.
  const response = await transport('/api/engine/health', {
    cache: 'no-store',
    credentials: 'omit',
    redirect: 'error',
    signal: AbortSignal.timeout(20000),
  });
  const result = await readResponse(response);
  if (!response.ok || result.status !== 'ok' || result.schema !== 'targetjee.item.v2')
    throw new Error(
      'The API is unavailable, warming up or on an incompatible build. This is not a Gemini quota check.',
    );
  return typeof result.revision === 'string' && /^(?:[a-f0-9]{8}|workspace)$/.test(result.revision)
    ? result.revision
    : 'not reported (older API build)';
}
