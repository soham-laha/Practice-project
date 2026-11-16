import type { NextConfig } from 'next';

const config: NextConfig = {
  poweredByHeader: false,
  allowedDevOrigins: ['*.e2b.app'],
  async headers() {
    let uploadOrigin = '';
    try {
      const backend = new URL(process.env.TARGETJEE_API_BASE_URL || '');
      if (
        backend.protocol === 'https:' &&
        !backend.username &&
        !backend.password &&
        !['localhost', '127.0.0.1', '[::1]'].includes(backend.hostname)
      )
        uploadOrigin = ` ${backend.origin}`;
    } catch {
      // Reference-only/local deployments retain a self-only connection policy.
    }
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
          {
            key: 'Content-Security-Policy',
            value: `default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; font-src 'self' data:; img-src 'self' data: blob:; connect-src 'self'${uploadOrigin}; object-src 'none'; base-uri 'self'; form-action 'self'`,
          },
        ],
      },
    ];
  },
};
export default config;
