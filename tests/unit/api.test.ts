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
