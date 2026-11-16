import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { MathExpr } from '@/components/math';

describe('safe and legible math rendering', () => {
  it('inherits theme contrast even for invalid model LaTeX', () => {
    const html = renderToStaticMarkup(createElement(MathExpr, { value: '\\notARealMathCommand' }));
    expect(html).toContain('\\notARealMathCommand');
    expect(html).toContain('color:currentColor');
  });
  it('renders risky colour/link commands as escaped text, never trusted HTML', () => {
    const html = renderToStaticMarkup(
      createElement(MathExpr, { value: '\\href{https://untrusted.invalid}{<script>}' }),
    );
    expect(html).toContain('<code');
    expect(html).toContain('&lt;script&gt;');
    expect(html).not.toContain('<a ');
    expect(html).not.toContain('<script>');
  });
  it('makes overflowing block equations keyboard-focusable', () => {
    const html = renderToStaticMarkup(createElement(MathExpr, { value: 'x^2+y^2', block: true }));
    expect(html).toContain('tabindex="0"');
    expect(html).toContain('role="region"');
    expect(html).toContain('MathML');
  });
});
