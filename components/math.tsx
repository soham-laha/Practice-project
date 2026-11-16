import katex from 'katex';
export function MathExpr({ value, block = false }: { value: string; block?: boolean }) {
  if (/\\(?:href|url|includegraphics|html\w*|color|textcolor|definecolor)\b/i.test(value))
    return <code className="math-inline">{value}</code>;
  const html = katex.renderToString(value, {
    throwOnError: false,
    errorColor: 'currentColor',
    trust: false,
    strict: 'ignore',
    displayMode: block,
    output: 'htmlAndMathml',
  });
  return (
    <span
      tabIndex={block ? 0 : undefined}
      role={block ? 'region' : undefined}
      aria-label={block ? 'Mathematical equation. Scroll horizontally if needed.' : undefined}
      className={block ? 'math-block' : 'math-inline'}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
export function MathText({ text }: { text: string }) {
  return (
    <>
      {text
        .split(/(\$\$[\s\S]*?\$\$|\$[^$\n]+?\$)/g)
        .map((part, i) =>
          part.startsWith('$$') ? (
            <MathExpr key={i} value={part.slice(2, -2)} block />
          ) : part.startsWith('$') ? (
            <MathExpr key={i} value={part.slice(1, -1)} />
          ) : (
            <span key={i}>{part}</span>
          ),
        )}
    </>
  );
}
