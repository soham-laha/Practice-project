import assert from 'node:assert/strict';
const frontend = process.env.SMOKE_FRONTEND_URL || 'http://127.0.0.1:3000';
const backend = process.env.SMOKE_BACKEND_URL || 'http://127.0.0.1:8000';
for (const route of ['/', '/simulator', '/dashboard', '/forge', '/flashcards', '/science']) {
  const response = await fetch(new URL(route, frontend));
  assert.equal(response.status, 200, `${route} not healthy`);
  const text = await response.text();
  assert(text.includes('TargetJEE'), `${route} has no app content`);
  console.log(`✓ ${new URL(route, frontend)}`);
}
const health = await fetch(new URL('/health', backend));
assert.equal(health.status, 200);
assert.equal((await health.json()).status, 'ok');
console.log(`✓ ${new URL('/health', backend)}`);
for (const exam of ['main', 'advanced']) {
  const r = await fetch(new URL(`/v1/reference?exam=${exam}`, backend));
  assert.equal(r.status, 200);
  const { items } = await r.json();
  assert.equal(items.length, 6);
  assert(items.every((i) => i.exam === exam));
  console.log(`✓ reference mode ${exam}`);
}
for (const model of ['gemini-flash-latest', 'gemini-flash-lite-latest']) {
  const response = await fetch(new URL('/api/engine/v1/extractions', frontend), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      text: 'A complete textbook problem is supplied here.',
      exam: 'main',
      model,
    }),
  });
  assert.equal(
    response.status,
    401,
    `Keyless ${model} must prompt for BYOK, not spend a server key`,
  );
  console.log(`✓ ${model}: request-scoped key required (expected 401)`);
}
if (!process.env.SMOKE_FRONTEND_URL || !process.env.SMOKE_BACKEND_URL)
  console.log(
    'LOCAL smoke only. Set actual public HTTPS SMOKE_FRONTEND_URL/SMOKE_BACKEND_URL for production verification.',
  );
