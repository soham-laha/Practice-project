import type { NextConfig } from 'next';

const config: NextConfig = {
  poweredByHeader: false,
  env: {
    NEXT_PUBLIC_APP_REVISION: /^[a-f0-9]{40}$/.test(
      process.env.VERCEL_GIT_COMMIT_SHA || process.env.GITHUB_SHA || '',
    )
      ? (process.env.VERCEL_GIT_COMMIT_SHA || process.env.GITHUB_SHA)!.slice(0, 8)
      : 'workspace',
  },
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
            value: `default-src 'self'; script-src 'self' 'unsafe-inline' 'wasm-unsafe-eval'${process.env.NODE_ENV === 'development' ? " 'unsafe-eval'" : ''}; style-src 'self' 'unsafe-inline'; font-src 'self' data:; img-src 'self' data: blob:; connect-src 'self'${uploadOrigin} https://huggingface.co https://us.aws.cdn.hf.co https://us.gcp.cdn.hf.co https://cas-bridge.xethub.hf.co https://cdn-lfs.huggingface.co https://cdn-lfs-us-1.hf.co https://cdn-lfs-eu-1.hf.co https://raw.githubusercontent.com; worker-src 'self'; object-src 'none'; base-uri 'self'; form-action 'self'`,
          },
        ],
      },
    ];
  },
};
export default config;
