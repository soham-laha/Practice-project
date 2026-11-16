import { afterEach, describe, expect, it, vi } from 'vitest';
import config from '@/next.config';

afterEach(() => vi.unstubAllEnvs());
const csp = async () =>
  (await config.headers!())[0].headers.find((header) => header.key === 'Content-Security-Policy')!
    .value;
const directive = (policy: string, name: string) =>
  policy
    .split(';')
    .find((part) => part.trim().startsWith(`${name} `))!
    .trim()
    .split(/\s+/)
    .slice(1);
const downloads = [
  'https://huggingface.co',
  'https://us.aws.cdn.hf.co',
  'https://us.gcp.cdn.hf.co',
  'https://cas-bridge.xethub.hf.co',
  'https://cdn-lfs.huggingface.co',
  'https://cdn-lfs-us-1.hf.co',
  'https://cdn-lfs-eu-1.hf.co',
  'https://raw.githubusercontent.com',
];

describe('fixed upload and opt-in local model connection policy', () => {
  it('permits only self, the public upload origin and the exact model-download hosts', async () => {
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('TARGETJEE_API_BASE_URL', 'https://api.example.invalid/ignored-path');
    const policy = await csp();
    expect(directive(policy, 'connect-src')).toEqual([
      "'self'",
      'https://api.example.invalid',
      ...downloads,
    ]);
    expect(directive(policy, 'script-src')).not.toContain("'unsafe-eval'");
    expect(directive(policy, 'script-src')).toContain("'wasm-unsafe-eval'");
    expect(directive(policy, 'worker-src')).toEqual(["'self'"]);
    expect(directive(policy, 'script-src')).not.toContain('https:');
    expect(directive(policy, 'connect-src')).not.toContain('*');
  });
  it.each([
    'http://127.0.0.1:8000',
    'http://untrusted.invalid',
    'https://localhost',
    'invalid-url',
  ])('never exposes an insecure/loopback upload connection for %s', async (base) => {
    vi.stubEnv('TARGETJEE_API_BASE_URL', base);
    expect(directive(await csp(), 'connect-src')).toEqual(["'self'", ...downloads]);
  });
  it('permits Next development evaluation only in development', async () => {
    vi.stubEnv('NODE_ENV', 'development');
    expect(directive(await csp(), 'script-src')).toContain("'unsafe-eval'");
    vi.stubEnv('NODE_ENV', 'production');
    expect(directive(await csp(), 'script-src')).not.toContain("'unsafe-eval'");
  });
});
