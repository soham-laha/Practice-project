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
