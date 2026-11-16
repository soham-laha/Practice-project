import { test, expect } from '@playwright/test';
import { publicOrigin } from '../../scripts/check-hosted.mjs';

// Local quality runs deliberately skip this suite. It must be dispatched with
// two real public origins; passing reference-only tests is not API acceptance.
test.describe('public two-service integration without provider spend', () => {
  test.skip(!process.env.SMOKE_BACKEND_URL, 'A real public backend origin is required.');

  test('health, both exam certificates, proxy key gates, exact CORS and upload-aware CSP', async ({
    request,
  }) => {
    test.setTimeout(180000); // Render Free can take 50+ seconds to wake up.
    const frontend = publicOrigin(process.env.SMOKE_FRONTEND_URL);
    const backend = publicOrigin(process.env.SMOKE_BACKEND_URL);
    const health = await request.get(`${backend}/health`, {
      maxRedirects: 0,
      timeout: 120000,
    });
    expect(health.status()).toBe(200);
    expect(await health.json()).toEqual({
      status: 'ok',
      service: 'targetjee-engine',
      schema: 'targetjee.item.v2',
      persistence: 'none',
    });
    expect(health.headers()['cache-control']).toBe('no-store');
    for (const exam of ['main', 'advanced']) {
      const reference = await request.get(`${backend}/v1/reference?exam=${exam}`, {
        maxRedirects: 0,
      });
      expect(reference.status()).toBe(200);
      const { items } = await reference.json();
      expect(items).toHaveLength(6);
      expect(items.every((item: { exam: string }) => item.exam === exam)).toBe(true);
      const validated = await request.post(`${backend}/v1/items/validate`, {
        data: { items },
        headers: { Origin: frontend },
        maxRedirects: 0,
        timeout: 30000,
      });
      expect(validated.status()).toBe(200);
      const { results } = await validated.json();
      expect(results).toHaveLength(6);
      expect(results.every((result: { valid: boolean }) => result.valid)).toBe(true);
    }
    for (const model of ['gemini-flash-latest', 'gemini-flash-lite-latest']) {
      for (const [path, data] of [
        [
          'v1/extractions',
          { text: 'A complete textbook problem is supplied here.', exam: 'main', model },
        ],
        [
          'v1/coach',
          { message: 'Help me plan a reference drill.', context: '', exam: 'main', model },
        ],
      ] as const) {
        const response = await request.post(`${frontend}/api/engine/${path}`, {
          data,
          headers: { Origin: frontend },
          maxRedirects: 0,
          timeout: 120000,
        });
        expect(response.status(), `${path}: ${model} must require a browser key`).toBe(401);
        expect((await response.json()).detail).toContain('Gemini key');
      }
    }
    const foreignWrite = await request.post(`${frontend}/api/engine/v1/extractions`, {
      data: { text: 'A complete textbook problem is supplied here.', exam: 'main' },
      headers: { Origin: 'https://untrusted.invalid' },
      maxRedirects: 0,
    });
    expect(foreignWrite.status()).toBe(403);
    const preflightHeaders = {
      'Access-Control-Request-Method': 'POST',
      'Access-Control-Request-Headers': 'Content-Type, X-Gemini-Api-Key',
    };
    const good = await request.fetch(`${backend}/v1/extractions/upload`, {
      method: 'OPTIONS',
      headers: { ...preflightHeaders, Origin: frontend },
      maxRedirects: 0,
    });
    expect(good.status()).toBe(200);
    expect(good.headers()['access-control-allow-origin']).toBe(frontend);
    expect(good.headers()['access-control-allow-credentials']).not.toBe('true');
    expect(good.headers()['access-control-allow-headers'].toLowerCase()).toContain(
      'x-gemini-api-key',
    );
    const bad = await request.fetch(`${backend}/v1/extractions/upload`, {
      method: 'OPTIONS',
      headers: { ...preflightHeaders, Origin: 'https://untrusted.invalid' },
      maxRedirects: 0,
    });
    expect(bad.status()).toBe(400);
    expect(bad.headers()['access-control-allow-origin']).toBeUndefined();
    const discovery = await request.get(`${frontend}/api/engine/upload-target`, {
      maxRedirects: 0,
    });
    expect(discovery.status()).toBe(200);
    expect(await discovery.json()).toEqual({ url: `${backend}/v1/extractions/upload` });
    const forge = await request.get(`${frontend}/forge`, { maxRedirects: 0 });
    expect(forge.status()).toBe(200);
    const csp = forge.headers()['content-security-policy'];
    const connections = csp.split(';').map((part) => part.trim());
    expect(connections.find((part) => part.startsWith('connect-src '))).toBe(
      `connect-src 'self' ${backend}`,
    );
  });

  test('20 MiB browser upload crosses actual CORS/CSP and reaches the auth guard', async ({
    page,
  }) => {
    test.setTimeout(180000);
    const backend = publicOrigin(process.env.SMOKE_BACKEND_URL);
    await page.goto('/forge');
    const result = await page.evaluate(async (expectedBackend) => {
      const discovery = await fetch('/api/engine/upload-target', {
        credentials: 'omit',
        redirect: 'error',
        cache: 'no-store',
        signal: AbortSignal.timeout(30000),
      });
      if (!discovery.ok) throw new Error('Public upload discovery failed');
      const { url } = await discovery.json();
      if (url !== `${expectedBackend}/v1/extractions/upload`)
        throw new Error('Upload discovery did not match the new authorized API');
      const size = 20 * 1024 * 1024;
      const body = new FormData();
      body.append(
        'file',
        new Blob([new Uint8Array(size)], { type: 'image/png' }),
        'transport-test-not-a-source.png',
      );
      body.append('exam', 'main');
      body.append('model', 'gemini-flash-latest');
      // Deliberately invalid format: rejected before decoding/provider calls.
      // This proves 20 MiB transport, NOT successful AI image extraction.
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'X-Gemini-Api-Key': 'invalid' },
        body,
        credentials: 'omit',
        redirect: 'error',
        cache: 'no-store',
        signal: AbortSignal.timeout(120000),
      });
      return { size, status: response.status, payload: await response.json() };
    }, backend);
    expect(result.size).toBe(20 * 1024 * 1024);
    expect(result.status).toBe(401);
    expect(result.payload.detail).toContain('Invalid key format');
    console.log(
      '20 MiB public browser transport passed; malformed-key rejection only, no provider extraction or spend.',
    );
  });
});
