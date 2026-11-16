import { afterEach, describe, expect, it, vi } from 'vitest';
import config from '@/next.config';

afterEach(() => vi.unstubAllEnvs());
const csp = async () =>
  (await config.headers!())[0].headers.find((header) => header.key === 'Content-Security-Policy')!
    .value;

describe('upload-aware restrictive connection policy', () => {
  it('permits only self and the configured public HTTPS upload origin', async () => {
    vi.stubEnv('TARGETJEE_API_BASE_URL', 'https://api.example.invalid/ignored-path');
    expect(await csp()).toContain("connect-src 'self' https://api.example.invalid;");
    expect(await csp()).not.toContain('unsafe-eval');
  });
  it.each([
    'http://127.0.0.1:8000',
    'http://untrusted.invalid',
    'https://localhost',
    'invalid-url',
  ])('does not expose a browser loopback/insecure connection for %s', async (base) => {
    vi.stubEnv('TARGETJEE_API_BASE_URL', base);
    expect(await csp()).toContain("connect-src 'self';");
  });
});
