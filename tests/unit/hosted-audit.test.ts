import { readFileSync } from 'node:fs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { checkHostedFrontend } from '../../scripts/check-hosted.mjs';

const frontend = 'https://targetjee-studio.vercel.app';

beforeEach(() => {
  // Unit fixtures must not append pretend public results to the real CI summary.
  vi.stubEnv('GITHUB_STEP_SUMMARY', '');
  vi.spyOn(console, 'log').mockImplementation(() => {});
});
afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

function mockAudit(status = 401, detail = 'Add a Gemini key in your browser settings.') {
  const budgets = new WeakMap<AbortSignal, number>();
  vi.spyOn(AbortSignal, 'timeout').mockImplementation((milliseconds) => {
    const signal = new AbortController().signal;
    budgets.set(signal, milliseconds);
    return signal;
  });
  const transport = vi.fn(async (input: RequestInfo | URL, options?: RequestInit) => {
    const path = new URL(String(input)).pathname;
    if (path === '/api/engine/v1/extractions') return Response.json({ detail }, { status });
    if (path.startsWith('/notices/')) {
      return new Response(readFileSync(new URL(`../../public${path}`, import.meta.url), 'utf8'));
    }
    expect(['/', '/simulator', '/dashboard', '/forge', '/flashcards', '/science']).toContain(path);
    expect(options?.method).not.toBe('POST');
    return new Response('<html>TargetJEE</html>', {
      headers: {
        'Content-Type': 'text/html',
        'X-Content-Type-Options': 'nosniff',
        'Content-Security-Policy': "default-src 'self'",
      },
    });
  });
  vi.stubGlobal('fetch', transport);
  return { transport, budgets };
}

describe('hosted audit cold-start budgets without provider spend', () => {
  it('allows the bounded proxy cold start for both keyless models, not static pages', async () => {
    const { transport, budgets } = mockAudit();
    await expect(checkHostedFrontend(frontend)).resolves.toEqual({
      frontend,
      backendConfigured: true,
    });
    expect(transport).toHaveBeenCalledTimes(10);
    const models: string[] = [];
    for (const [input, options] of transport.mock.calls) {
      const isAuthProbe = new URL(String(input)).pathname === '/api/engine/v1/extractions';
      expect(budgets.get(options!.signal!)).toBe(isAuthProbe ? 120000 : 20000);
      expect(options?.redirect).toBe('error');
      expect(options?.cache).toBe('no-store');
      if (isAuthProbe) {
        expect(options?.method).toBe('POST');
        expect(new Headers(options?.headers).get('origin')).toBe(frontend);
        expect(new Headers(options?.headers).has('x-gemini-api-key')).toBe(false);
        models.push(JSON.parse(String(options?.body)).model);
      }
    }
    expect(models).toEqual(['gemini-flash-latest', 'gemini-flash-lite-latest']);
  });

  it('labels a specifically unconfigured backend as reference-only, not connected', async () => {
    mockAudit(503, 'The AI backend is not configured on this host.');
    await expect(checkHostedFrontend(frontend)).resolves.toEqual({
      frontend,
      backendConfigured: false,
    });
  });

  it('does not hide an unavailable configured backend behind the longer timeout', async () => {
    mockAudit(503, 'The AI backend is unavailable or timed out.');
    await expect(checkHostedFrontend(frontend)).rejects.toThrow(/backend is not configured/);
  });

  it('does not accept an unexpected status or retry to turn a failure green', async () => {
    const { transport } = mockAudit(500, 'Unexpected failure.');
    await expect(checkHostedFrontend(frontend)).rejects.toThrow(/unexpected keyless status/);
    expect(transport).toHaveBeenCalledTimes(9);
  });

  it('rejects credential-bearing origins before any network request', async () => {
    const { transport } = mockAudit();
    await expect(checkHostedFrontend('https://user:secret@example.com')).rejects.toThrow(
      /without credentials/,
    );
    expect(transport).not.toHaveBeenCalled();
  });

  it('propagates an auth-probe timeout instead of reporting backend success', async () => {
    const { transport } = mockAudit();
    const normal = transport.getMockImplementation()!;
    transport.mockImplementation(async (input, options) => {
      if (new URL(String(input)).pathname === '/api/engine/v1/extractions')
        throw new DOMException('Public auth-probe deadline exceeded', 'TimeoutError');
      return normal(input, options);
    });
    await expect(checkHostedFrontend(frontend)).rejects.toThrow('Public auth-probe deadline');
  });
});
