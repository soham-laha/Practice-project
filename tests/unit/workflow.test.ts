import { readFileSync } from 'node:fs';
import { createServer, type Server } from 'node:http';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { describe, expect, it } from 'vitest';

const workflow = readFileSync('.github/workflows/quality.yml', 'utf8');
const command = workflow.match(/npx wait-on ([^\n]+)/)?.[1] ?? '';
const resources = command.split(/\s+/).filter((part) => /^https?(?:-get)?:\/\//.test(part));

it('both browser workflows install the Python pipeline used by successful Forge fixtures', () => {
  const hosted = readFileSync('.github/workflows/hosted.yml', 'utf8');
  for (const source of [workflow, hosted]) {
    expect(source).toMatch(/actions\/setup-python@[a-f0-9]{40}/);
    const install = source.indexOf('python -m pip install -r backend/requirements');
    const browser = source.indexOf('run: npm run test:e2e');
    expect(install).toBeGreaterThan(-1);
    expect(browser).toBeGreaterThan(install);
  }
});

describe('CI readiness probes', () => {
  it('uses explicit GET for both production services', () => {
    expect(resources).toEqual(['http-get://127.0.0.1:3000', 'http-get://127.0.0.1:8000/health']);
    expect(workflow).toContain('/tmp/targetjee-api.log');
    expect(workflow).toContain('/tmp/targetjee-web.log');
  });

  it('the committed wait-on command succeeds against a GET-only health endpoint', async () => {
    const methods: string[] = [];
    const server = createServer((request, response) => {
      methods.push(request.method ?? '');
      response.writeHead(request.method === 'GET' ? 200 : 405, {
        'Content-Type': 'application/json',
      });
      response.end(JSON.stringify({ status: 'ok' }));
    });
    await new Promise<void>((resolve) => server.listen(0, '0.0.0.0', resolve));
    try {
      const address = server.address();
      if (!address || typeof address === 'string') throw new Error('No test port');
      const resource = resources[1].replace('127.0.0.1:8000', `127.0.0.1:${address.port}`);
      await promisify(execFile)(
        process.execPath,
        [
          'node_modules/wait-on/bin/wait-on',
          resource,
          '--timeout',
          '5000',
          '--httpTimeout',
          '1000',
          '--interval',
          '100',
        ],
        { timeout: 7000 },
      );
      expect(methods.length).toBeGreaterThan(0);
      expect(methods.every((method) => method === 'GET')).toBe(true);
    } finally {
      await new Promise<void>((resolve, reject) =>
        (server as Server).close((error) => (error ? reject(error) : resolve())),
      );
    }
  }, 10000);
});
