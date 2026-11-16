import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
const root = process.cwd(),
  skip = new Set([
    'node_modules',
    '.git',
    '.next',
    '.venv',
    '.cache',
    // Installed development tools include deliberately bad design fixtures;
    // product app/components/styles remain fully scanned below.
    '.arena',
    '.agents',
    '.hallmark',
    '.ruff_cache',
    'artifacts',
    'test-results',
    'playwright-report',
  ]);
function walk(dir) {
  return fs
    .readdirSync(dir, { withFileTypes: true })
    .flatMap((e) =>
      skip.has(e.name)
        ? []
        : e.isDirectory()
          ? walk(path.join(dir, e.name))
          : [path.join(dir, e.name)],
    );
}
const banned = /#(?:00ffff|38bdf8|0ea5e9|06b6d4)\b|(?:cyan|sky|teal)-|blue-(?:300|400)\b/i;
for (const file of walk(root).filter((f) => /\.(css|scss|tsx)$/.test(f))) {
  const source = fs.readFileSync(file, 'utf8');
  assert(!banned.test(source), `Forbidden palette token in ${file}`);
  assert(
    !/font-family:[^;}]*\b(?:Inter|Roboto|Arial|Space Grotesk)\b/i.test(source),
    `Disallowed font in ${file}`,
  );
}
const css = fs.readFileSync('app/globals.css', 'utf8');
for (const width of ['480', '768', '1024', '1440'])
  assert(
    new RegExp(`@media\\s*\\([^)]*${width}px`).test(css),
    `Missing explicit breakpoint ${width}`,
  );
assert(
  /scroll-behavior:\s*smooth/.test(css) && css.includes('prefers-reduced-motion'),
  'Missing motion preferences',
);
assert(
  css.includes('--font-ui:') && css.includes('--font-editorial:'),
  'Fonts are not globally bound',
);
const research = fs.readFileSync('docs/DESIGN_RESEARCH.md', 'utf8');
for (const phrase of [
  'Tractinsky',
  'Nunes',
  'Masicampo',
  'Piepenbrock',
  'Weiser',
  'Apple',
  'Deci',
  '--accent',
  'FONT_STYLE',
  'SWITCHDESIGNPROMPT',
  'LANDINGPAGEPROMPT',
  'THINGSTOSHOWINDASHBOARD',
])
  assert(research.includes(phrase), `Missing research/default rationale: ${phrase}`);
function rgb(hex) {
  return hex
    .match(/\w\w/g)
    .map((v) => parseInt(v, 16) / 255)
    .map((c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
}
function luminance(hex) {
  const [r, g, b] = rgb(hex.replace('#', ''));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
function contrast(a, b) {
  const x = luminance(a),
    y = luminance(b);
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
}
const blocks = [
  ...css.matchAll(/:root(?:\[data-theme=['"]?(dark|contrast)['"]?\])?\s*\{([^}]+)\}/g),
];
assert.equal(blocks.length, 3, 'Expected exactly three root semantic palettes');
for (const [, name = 'light', body] of blocks) {
  const tokens = Object.fromEntries(
    [...body.matchAll(/--([\w-]+):\s*(#[a-f0-9]{6})/g)].map((m) => [m[1], m[2]]),
  );
  const pairs = [
    ['ink', 'bg'],
    ['muted', 'bg'],
    ['ink', 'surface'],
    ['muted', 'surface'],
    ['ink', 'surface-alt'],
    ['muted', 'surface-alt'],
    ['accent', 'surface'],
    ['accent', 'accent-soft'],
    ['on-accent', 'accent'],
    ['clay', 'surface'],
    ['plum', 'surface'],
  ];
  for (const [a, b] of pairs) {
    const ratio = contrast(tokens[a], tokens[b]);
    assert(
      ratio >= (name === 'contrast' ? 7 : 4.5),
      `${name}: ${a}/${b} contrast ${ratio.toFixed(2)} is insufficient`,
    );
  }
  for (const background of ['surface', 'surface-alt', 'bg'])
    assert(
      contrast(tokens['control-line'], tokens[background]) >= 3,
      `${name}: form-control boundary fails 3:1 against ${background}`,
    );
  console.log(
    `✓ ${name}: ${pairs.length} semantic text pairs ${name === 'contrast' ? 'AAA' : 'AA'} compliant; form boundaries ≥3:1`,
  );
}
const files = walk(root).filter(
  (f) => /\.(?:ts|tsx|py|json|ya?ml)$/.test(f) && !f.endsWith('package-lock.json'),
);
for (const file of files) {
  const s = fs.readFileSync(file, 'utf8');
  assert(!/AIza[A-Za-z0-9_-]{30,}/.test(s), `Possible Gemini credential in ${file}`);
  assert(!/NEXT_PUBLIC_[A-Z_]*(?:KEY|SECRET|TOKEN)/.test(s), `Public secret variable in ${file}`);
}
console.log(
  '✓ palette prohibition, typography, research mapping, responsive breakpoints, reduced motion and source secret scan passed',
);
console.log(
  'ℹ Four user template fields were unspecified; documented defaults are checked, not claimed exact user-supplied designs.',
);
