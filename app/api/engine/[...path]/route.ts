import { NextRequest, NextResponse } from 'next/server';
export const runtime = 'nodejs';
export const maxDuration = 120;
const routes = new Set([
  'v1/extractions',
  'v1/extractions/upload',
  'v1/items/validate',
  'v1/coach',
]);
// Large production uploads bypass frontend-function body caps. Only this fixed
// public HTTPS endpoint is disclosed; local/preview traffic keeps the relative
// proxy so a learner's browser never tries to reach the sandbox's loopback.
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> },
) {
  const path = (await params).path.join('/');
  if (path === 'health') {
    try {
      const target = new URL(process.env.TARGETJEE_API_BASE_URL || '');
      if (
        target.username ||
        target.password ||
        !['http:', 'https:'].includes(target.protocol) ||
        (target.protocol !== 'https:' &&
          !['localhost', '127.0.0.1', '[::1]'].includes(target.hostname))
      )
        throw new Error();
      const response = await fetch(`${target.origin}/health`, {
        cache: 'no-store',
        credentials: 'omit',
        redirect: 'error',
        signal: AbortSignal.timeout(15000),
      });
      const data = await response.json();
      if (
        !response.ok ||
        data?.status !== 'ok' ||
        data?.service !== 'targetjee-engine' ||
        data?.schema !== 'targetjee.item.v2'
      )
        throw new Error();
      return NextResponse.json(
        {
          status: 'ok',
          schema: 'targetjee.item.v2',
          revision:
            typeof data.revision === 'string' && /^(?:[a-f0-9]{8}|workspace)$/.test(data.revision)
              ? data.revision
              : null,
        },
        { headers: { 'Cache-Control': 'no-store' } },
      );
    } catch {
      return NextResponse.json(
        {
          detail:
            'The API is unavailable, warming up or not configured. This check did not contact Gemini.',
        },
        { status: 503, headers: { 'Cache-Control': 'no-store' } },
      );
    }
  }
  if (path !== 'upload-target')
    return NextResponse.json({ detail: 'Unknown endpoint' }, { status: 404 });
  let url = '/api/engine/v1/extractions/upload';
  const base = process.env.TARGETJEE_API_BASE_URL;
  if (base) {
    try {
      const target = new URL(base);
      if (target.username || target.password || !['http:', 'https:'].includes(target.protocol))
        throw new Error();
      if (!['localhost', '127.0.0.1', '[::1]'].includes(target.hostname)) {
        if (target.protocol !== 'https:') throw new Error();
        url = `${target.origin}/v1/extractions/upload`;
      }
    } catch {
      return NextResponse.json(
        { detail: 'The upload backend requires a valid HTTPS origin.' },
        { status: 503 },
      );
    }
  }
  return NextResponse.json({ url }, { headers: { 'Cache-Control': 'no-store' } });
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> },
) {
  const path = (await params).path.join('/');
  if (!routes.has(path)) return NextResponse.json({ detail: 'Unknown endpoint' }, { status: 404 });
  const base = process.env.TARGETJEE_API_BASE_URL;
  if (!base)
    return NextResponse.json(
      {
        detail:
          'The AI backend is not configured on this host. You can still use the complete reference drill and local review studio.',
      },
      { status: 503 },
    );
  let target: URL;
  try {
    target = new URL(base);
    if (!['http:', 'https:'].includes(target.protocol) || target.username || target.password)
      throw new Error();
  } catch {
    return NextResponse.json({ detail: 'Backend configuration is invalid.' }, { status: 503 });
  }
  if (
    process.env.NODE_ENV === 'production' &&
    target.protocol !== 'https:' &&
    !['127.0.0.1', 'localhost'].includes(target.hostname)
  )
    return NextResponse.json({ detail: 'The backend requires HTTPS.' }, { status: 503 });
  const origin = request.headers.get('origin');
  const host = request.headers.get('x-forwarded-host') || request.headers.get('host');
  if (origin) {
    try {
      const source = new URL(origin);
      if (!['http:', 'https:'].includes(source.protocol) || source.host !== host) throw new Error();
    } catch {
      return NextResponse.json({ detail: 'Cross-origin requests rejected' }, { status: 403 });
    }
  }
  const limit = 21 * 1024 * 1024;
  if (Number(request.headers.get('content-length') || 0) > limit)
    return NextResponse.json({ detail: 'Upload exceeds 20 MB' }, { status: 413 });
  try {
    const reader = request.body?.getReader(),
      chunks: Uint8Array[] = [];
    let size = 0;
    if (reader)
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        size += value.byteLength;
        if (size > limit) {
          await reader.cancel();
          return NextResponse.json({ detail: 'Upload exceeds 20 MB' }, { status: 413 });
        }
        chunks.push(value);
      }
    const body = Buffer.concat(chunks);
    const headers: Record<string, string> = {
      'Content-Type': request.headers.get('content-type') || 'application/json',
    };
    const key = request.headers.get('x-gemini-api-key');
    if (key) headers['X-Gemini-Api-Key'] = key;
    const upstream = await fetch(`${target.origin}/${path}`, {
      method: 'POST',
      headers,
      body,
      cache: 'no-store',
      redirect: 'error',
      signal: AbortSignal.timeout(110000),
    });
    const payload = await upstream.text();
    // No request or upstream body logging: providers may echo sensitive data.
    return new NextResponse(payload, {
      status: upstream.status,
      headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
    });
  } catch {
    return NextResponse.json(
      {
        detail:
          'The AI backend is unavailable or timed out. Your key was not stored. Try again, or continue with a reference drill.',
      },
      { status: 503 },
    );
  }
}
