import { describe, expect, it } from 'vitest';
import { publicOrigin } from '../../scripts/check-hosted.mjs';

describe('hosted audit targets', () => {
  it('accepts a public HTTPS origin without changing its host', () => {
    expect(publicOrigin('https://targetjee-studio.vercel.app/')).toBe(
      'https://targetjee-studio.vercel.app',
    );
  });
  it.each([
    undefined,
    'invalid',
    'http://example.com',
    'https://localhost',
    'https://127.0.0.1',
    'https://[::1]',
    'https://api.internal',
    'https://example.invalid',
    'https://user:secret@example.com',
    'https://example.com/api',
    'https://example.com?key=must-not-be-a-url',
    'https://example.com#fragment',
    'https://example.com:8443',
  ])('rejects non-public or credential-bearing target %s before network use', (value) => {
    expect(() => publicOrigin(value)).toThrow();
  });
});
