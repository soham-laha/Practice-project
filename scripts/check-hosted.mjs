import assert from 'node:assert/strict';
import { appendFile, readFile } from 'node:fs/promises';
import { isIP } from 'node:net';
import { pathToFileURL } from 'node:url';

// This audit is deliberately separate from the two-service smoke. A passing
// reference-frontend audit must not imply that an AI backend is deployed.
export function publicOrigin(value) {
  let url;
  try {
    url = new URL(value);
  } catch {
    throw new Error('A public HTTPS origin is required.');
  }
  const hostname = url.hostname.toLowerCase();
  assert(
    url.protocol === 'https:' &&
      !url.username &&
      !url.password &&
      !url.search &&
      !url.hash &&
      url.pathname === '/' &&
      !url.port &&
      !isIP(hostname.replace(/^\[|\]$/g, '')) &&
      hostname.includes('.') &&
      !['localhost', 'local', 'internal', 'invalid'].some(
        (suffix) => hostname === suffix || hostname.endsWith(`.${suffix}`),
      ),
    'Use a public HTTPS origin without credentials, a path, query, fragment or nonstandard port.',
  );
  return url.origin;
}

export async function checkHostedFrontend(value) {
  const frontend = publicOrigin(value);
  const request = (path, options = {}) =>
    fetch(new URL(path, frontend), {
      cache: 'no-store',
      redirect: 'error',
      signal: AbortSignal.timeout(20000),
      ...options,
    });
  for (const route of ['/', '/simulator', '/dashboard', '/forge', '/flashcards', '/science']) {
    const response = await request(route);
    assert.equal(response.status, 200, `${route}: public HTTP status`);
    assert.match(response.headers.get('content-type') || '', /text\/html/);
    assert.equal(response.headers.get('x-content-type-options'), 'nosniff');
    assert.match(response.headers.get('content-security-policy') || '', /default-src 'self'/);
    assert((await response.text()).includes('TargetJEE'), `${route}: missing app content`);
    console.log(`✓ public frontend ${new URL(route, frontend)}`);
  }
  for (const font of ['manrope', 'newsreader']) {
    const filename = `fontsource-variable--${font}-5.3.0-LICENSE.txt`;
    const expected = await readFile(new URL(`../public/notices/${filename}`, import.meta.url));
    const response = await request(`/notices/${filename}`);
    assert.equal(response.status, 200, `${font}: published font notice`);
    assert(
      Buffer.from(await response.arrayBuffer()).equals(expected),
      `${font}: public font notice must preserve upstream bytes`,
    );
    console.log(`✓ public ${font} OFL notice`);
  }
  let backendConfigured;
  for (const model of ['gemini-flash-latest', 'gemini-flash-lite-latest']) {
    const response = await request('/api/engine/v1/extractions', {
      method: 'POST',
      // Render Free can take 50s+ to wake. Keep static page probes at 20s,
      // but outlast the proxy's bounded 110s upstream timeout for this
      // keyless auth check. No retry or acceptance of unavailable responses.
      signal: AbortSignal.timeout(120000),
      headers: { 'Content-Type': 'application/json', Origin: frontend },
      body: JSON.stringify({
        text: 'A complete textbook problem is supplied here.',
        exam: 'main',
        model,
      }),
    });
    const payload = await response.json();
    // No key is sent, so neither branch can invoke a paid/provider request.
    const configured = response.status === 401;
    if (!configured) {
      assert.equal(response.status, 503, `${model}: unexpected keyless status`);
      assert.match(payload.detail, /backend is not configured/);
    }
    if (backendConfigured !== undefined) assert.equal(configured, backendConfigured);
    backendConfigured = configured;
    console.log(
      configured
        ? `✓ ${model}: request key required (401); no provider request spent`
        : `! ${model}: backend unconfigured (503); reference-only deployment`,
    );
  }
  const summary = [
    '## Hosted reference frontend audit',
    `- Public origin: ${frontend}`,
    '- Six public pages, security headers and original font notices verified.',
    `- AI backend: **${backendConfigured ? 'key-gated response observed; full health/smoke still required' : 'NOT CONFIGURED — forge/coach unavailable'}**.`,
    '- This is not two-service production acceptance. No real Gemini key was used.',
    '',
  ].join('\n');
  console.log(summary);
  if (process.env.GITHUB_STEP_SUMMARY) await appendFile(process.env.GITHUB_STEP_SUMMARY, summary);
  return { frontend, backendConfigured };
}

if (process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url) {
  checkHostedFrontend(process.env.SMOKE_FRONTEND_URL).catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}
