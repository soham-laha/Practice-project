import { defineConfig, globalIgnores } from 'eslint/config';
import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import globals from 'globals';
import next from '@next/eslint-plugin-next';
import hooks from 'eslint-plugin-react-hooks';

// Use the supported ESLint 10 plugins directly. The aggregate Next preset still
// pulls legacy React/import plugins whose peer ranges stop at ESLint 9.
export default defineConfig([
  globalIgnores([
    '.next/**',
    'node_modules/**',
    '.venv/**',
    '.cache/**',
    '.arena/**',
    '.agents/**',
    '.hallmark/**',
    '.ruff_cache/**',
    'next-env.d.ts',
    'artifacts/**',
    'test-results/**',
    'playwright-report/**',
  ]),
  { languageOptions: { globals: { ...globals.node, ...globals.browser } } },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['**/*.{ts,tsx}'],
    plugins: { '@next/next': next, 'react-hooks': hooks },
    rules: {
      ...next.configs.recommended.rules,
      ...next.configs['core-web-vitals'].rules,
      ...hooks.configs.flat.recommended.rules,
    },
  },
]);
