import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { GET, POST } from '@/app/api/engine/[...path]/route';

const KEY = 'proxy_fixture_not_a_real_key_123456';
const params = () => ({ params: Promise.resolve({ path: ['v1', 'coach'] }) });
const request = (headers: Record<string, string> = {}) =>
  new NextRequest('http://localhost:3000/api/engine/v1/coach', {
    method: 'POST',
    headers: {
      host: 'localhost:3000',
      origin: 'http://localhost:3000',
      'content-type': 'application/json',
      ...headers,
    },
    body: JSON.stringify({ message: 'Help me focus', context: 'Domain mistakes' }),
  });
beforeEach(() => {
  vi.stubEnv('TARGETJEE_API_BASE_URL', 'http://127.0.0.1:8000');
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe('fixed-origin BYOK proxy', () => {
  it.each([
    ['http://127.0.0.1:8000', '/api/engine/v1/extractions/upload'],
    ['https://api.example.invalid', 'https://api.example.invalid/v1/extractions/upload'],
  ])('discloses only a fixed upload path for %s', async (base, expected) => {
    vi.stubEnv('TARGETJEE_API_BASE_URL', base);
    const response = await GET(request(), { params: Promise.resolve({ path: ['upload-target'] }) });
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ url: expected });
    expect(response.headers.get('cache-control')).toBe('no-store');
  });
  it('does not disclose an insecure external upload target', async () => {
    vi.stubEnv('TARGETJEE_API_BASE_URL', 'http://api.example.invalid');
    const response = await GET(request(), { params: Promise.resolve({ path: ['upload-target'] }) });
    expect(response.status).toBe(503);
  });
  it.each(['https://untrusted.invalid', 'null', 'not a URL'])(
    'rejects foreign or malformed Origin: %s',
    async (origin) => {
      const upstream = vi.fn();
      vi.stubGlobal('fetch', upstream);
      const response = await POST(request({ origin }), params());
      expect(response.status).toBe(403);
      expect(upstream).not.toHaveBeenCalled();
    },
  );
  it('forwards a key only as the scoped header, never body or URL', async () => {
    const upstream = vi
      .fn()
      .mockResolvedValue(
        new Response(JSON.stringify({ reply: 'Check the domain.' }), { status: 200 }),
      );
    vi.stubGlobal('fetch', upstream);
    const response = await POST(request({ 'x-gemini-api-key': KEY }), params());
    expect(response.status).toBe(200);
    const [url, options] = upstream.mock.calls[0];
    expect(url).toBe('http://127.0.0.1:8000/v1/coach');
    expect(url).not.toContain(KEY);
    expect(options.headers['X-Gemini-Api-Key']).toBe(KEY);
    expect(options.body.toString()).not.toContain(KEY);
    expect(options.redirect).toBe('error');
    expect(response.headers.get('cache-control')).toBe('no-store');
  });
  it('rejects oversized bodies before reading or forwarding them', async () => {
    const upstream = vi.fn();
    vi.stubGlobal('fetch', upstream);
    const response = await POST(
      request({ 'content-length': String(21 * 1024 * 1024 + 1) }),
      params(),
    );
    expect(response.status).toBe(413);
    expect(upstream).not.toHaveBeenCalled();
  });
  it('does not proxy arbitrary endpoints', async () => {
    const response = await POST(request(), { params: Promise.resolve({ path: ['admin'] }) });
    expect(response.status).toBe(404);
  });
  it('sanitizes transport errors instead of reflecting request secrets', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error(KEY)));
    const response = await POST(request({ 'x-gemini-api-key': KEY }), params());
    expect(response.status).toBe(503);
    expect(await response.text()).not.toContain(KEY);
  });
});

describe('fixed keyless health proxy', () => {
  it('never forwards incoming key/cookies or unapproved response data', async () => {
    const fetch = vi.fn().mockResolvedValue(
      Response.json({
        status: 'ok',
        service: 'targetjee-engine',
        schema: 'targetjee.item.v2',
        revision: 'a'.repeat(8),
        secret: KEY,
      }),
    );
    vi.stubGlobal('fetch', fetch);
    const response = await GET(request({ 'x-gemini-api-key': KEY, cookie: KEY }), {
      params: Promise.resolve({ path: ['health'] }),
    });
    expect(await response.json()).toEqual({
      status: 'ok',
      schema: 'targetjee.item.v2',
      revision: 'a'.repeat(8),
    });
    expect(JSON.stringify(fetch.mock.calls)).not.toContain(KEY);
    expect(fetch.mock.calls[0][0]).toBe('http://127.0.0.1:8000/health');
  });
  it('never forwards keys or raw exceptions when health fails', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error(KEY)));
    const response = await GET(request(), { params: Promise.resolve({ path: ['health'] }) });
    expect(response.status).toBe(503);
    expect(await response.text()).not.toContain(KEY);
  });
});
