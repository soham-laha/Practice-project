import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const inventory = JSON.parse(readFileSync('public/notices/index.json', 'utf8')) as {
  packages: Array<{ name: string; declaredLicense: string; noticeFiles: string[] }>;
};
describe('bundled font notice preservation', () => {
  it.each(['manrope', 'newsreader'])('preserves the original %s OFL notice unchanged', (family) => {
    const name = `@fontsource-variable/${family}`;
    const entry = inventory.packages.find((item) => item.name === name)!;
    expect(entry.declaredLicense).toBe('OFL-1.1');
    expect(entry.noticeFiles).toHaveLength(1);
    const original = readFileSync(`node_modules/${name}/LICENSE`);
    const published = readFileSync(`public/notices/${entry.noticeFiles[0]}`);
    expect(published.equals(original)).toBe(true);
  });
});

describe('current production dependency inventory', () => {
  it('includes the pinned in-browser runtime and its original Apache license', () => {
    const entry = inventory.packages.find((item) => item.name === '@mlc-ai/web-llm')!;
    expect(entry.declaredLicense).toBe('Apache-2.0');
    const original = readFileSync('node_modules/@mlc-ai/web-llm/LICENSE');
    expect(
      entry.noticeFiles.some((file) => readFileSync(`public/notices/${file}`).equals(original)),
    ).toBe(true);
  });
  it('has an entry for every installed non-development lockfile package', async () => {
    const { existsSync } = await import('node:fs');
    const lock = JSON.parse(readFileSync('package-lock.json', 'utf8'));
    const expected: string[] = [];
    for (const [location, record] of Object.entries(lock.packages) as Array<
      [string, { dev?: boolean }]
    >) {
      if (!location || record.dev || !existsSync(`${location}/package.json`)) continue;
      const metadata = JSON.parse(readFileSync(`${location}/package.json`, 'utf8'));
      expected.push(metadata.name);
    }
    expect(inventory.packages.map((item) => item.name).sort()).toEqual(
      [...new Set(expected)].sort(),
    );
  });
});
