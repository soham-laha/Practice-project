import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { apiRequest } from '@/lib/api';
import { KEYS } from '@/lib/storage';

const KEY = 'api_fixture_not_a_real_key_123456';
beforeEach(() =>
  vi.stubGlobal('localStorage', { getItem: (name: string) => (name === KEYS.key ? KEY : null) }),
);
afterEach(() => vi.unstubAllGlobals());
const form = () => {
  const data = new FormData();
  data.set('file', new Blob(['fixture']), 'fixture.png');
  return data;
};

describe('safe client failure states', () => {
  it.each([null, [], 'not an object'])(
    'rejects malformed JSON response roots: %j',
    async (body) => {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue(Response.json(body)));
      await expect(apiRequest('v1/coach', { message: 'Help me' })).rejects.toThrow(
        'unreadable response',
      );
    },
  );
  it.each([200, 502, 503])(
    'handles a non-JSON gateway page (%s) without exposing its content',
    async (status) => {
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue(new Response(`<html>${KEY}</html>`, { status })),
      );
      const failure = apiRequest('v1/coach', { message: 'Help me' });
      await expect(failure).rejects.toThrow('unreadable response');
      await expect(failure).rejects.not.toThrow(KEY);
    },
  );
  it('explains hosting body limits when a gateway returns HTML', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('too large', { status: 413 })));
    await expect(apiRequest('v1/coach', { message: 'Help me' })).rejects.toThrow('too large');
  });
  it.each(['TimeoutError', 'AbortError'])(
    'explains a %s without automatically retrying a paid request',
    async (name) => {
      const transport = vi.fn().mockRejectedValue(new DOMException(KEY, name));
      vi.stubGlobal('fetch', transport);
      const failure = apiRequest('v1/coach', { message: 'Help me' });
      await expect(failure).rejects.toThrow('no automatic retry');
      await expect(failure).rejects.not.toThrow(KEY);
      expect(transport).toHaveBeenCalledOnce();
    },
  );
  it('sanitizes network failures instead of leaking the native exception', async () => {
    const transport = vi.fn().mockRejectedValue(new TypeError(KEY));
    vi.stubGlobal('fetch', transport);
    const failure = apiRequest('v1/coach', { message: 'Help me' });
    await expect(failure).rejects.toThrow('Could not reach');
    await expect(failure).rejects.not.toThrow(KEY);
    expect(transport).toHaveBeenCalledOnce();
  });
  it('does not make a request when browser storage is blocked', async () => {
    const transport = vi.fn();
    vi.stubGlobal('fetch', transport);
    vi.stubGlobal('localStorage', {
      getItem: () => {
        throw new Error(KEY);
      },
    });
    await expect(apiRequest('v1/coach', { message: 'Help me' })).rejects.toThrow(
      'storage is blocked',
    );
    expect(transport).not.toHaveBeenCalled();
  });
  it('preserves a safe, actionable backend error', async () => {
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValue(
          Response.json({ detail: 'Gemini rate or quota limit reached.' }, { status: 429 }),
        ),
    );
    await expect(apiRequest('v1/coach', { message: 'Help me' })).rejects.toThrow('quota limit');
  });
  it('validates discovery before forwarding the key', async () => {
    const transport = vi.fn().mockResolvedValue(Response.json({ url: null }));
    vi.stubGlobal('fetch', transport);
    await expect(apiRequest('v1/extractions/upload', form())).rejects.toThrow('secure, fixed');
    expect(transport).toHaveBeenCalledOnce();
    expect(JSON.stringify(transport.mock.calls[0])).not.toContain(KEY);
  });
});

describe('secure runtime file transport', () => {
  it('keeps text requests relative and keys scoped to headers', async () => {
    const transport = vi.fn().mockResolvedValue(Response.json({ reply: 'Use a domain check.' }));
    vi.stubGlobal('fetch', transport);
    await apiRequest('v1/coach', { message: 'Help me' });
    expect(transport).toHaveBeenCalledOnce();
    const [url, options] = transport.mock.calls[0];
    expect(url).toBe('/api/engine/v1/coach');
    expect(options.headers['X-Gemini-Api-Key']).toBe(KEY);
    expect(options.body).not.toContain(KEY);
  });
  it.each([
    '/api/engine/v1/extractions/upload',
    'https://api.example.invalid/v1/extractions/upload',
  ])('uses the fixed upload target %s without sending a key in discovery', async (url) => {
    const transport = vi
      .fn()
      .mockResolvedValueOnce(Response.json({ url }))
      .mockResolvedValueOnce(Response.json({ items: [] }));
    vi.stubGlobal('fetch', transport);
    const data = form();
    await apiRequest('v1/extractions/upload', data);
    const [configUrl, configOptions] = transport.mock.calls[0];
    expect(configUrl).toBe('/api/engine/upload-target');
    expect(JSON.stringify(configOptions)).not.toContain(KEY);
    const [target, options] = transport.mock.calls[1];
    expect(target).toBe(url);
    expect(options.headers['X-Gemini-Api-Key']).toBe(KEY);
    expect(options.headers['Content-Type']).toBeUndefined(); // Browser supplies multipart boundary.
    expect(options.body).toBe(data);
    expect(options.credentials).toBe('omit');
    expect(options.redirect).toBe('error');
  });
  it.each([
    'http://api.example.invalid/v1/extractions/upload',
    'https://localhost/v1/extractions/upload',
    'https://api.example.invalid/wrong',
    '//untrusted.invalid/upload',
  ])('never sends a key to an unsafe target %s', async (url) => {
    const transport = vi.fn().mockResolvedValueOnce(Response.json({ url }));
    vi.stubGlobal('fetch', transport);
    await expect(apiRequest('v1/extractions/upload', form())).rejects.toThrow('secure, fixed');
    expect(transport).toHaveBeenCalledOnce();
  });
});
