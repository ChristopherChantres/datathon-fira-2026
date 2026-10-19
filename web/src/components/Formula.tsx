import katex from 'katex';
import 'katex/dist/katex.min.css';
import { useMemo } from 'react';

interface FormulaProps {
  tex: string;
  /** Display (block) math instead of inline. */
  block?: boolean;
  /** Spoken description; KaTeX's MathML is used when omitted. */
  label?: string;
  className?: string;
}

export function Formula({ tex, block = false, label, className }: FormulaProps) {
  const html = useMemo(
    () =>
      katex.renderToString(tex, {
        displayMode: block,
        throwOnError: false,
        output: 'htmlAndMathml',
        // Allow only \htmlClass, so formulas can use the palette's CSS tokens (e.g. tex-prediction).
        trust: (context) => context.command === '\\htmlClass',
        strict: (code: string) => (code === 'htmlExtension' ? 'ignore' : 'warn'),
      }),
    [tex, block],
  );
  const Tag = block ? 'div' : 'span';
  return (
    <Tag
      className={['formula', block ? 'formula--block' : '', className ?? ''].filter(Boolean).join(' ')}
      role={label ? 'img' : undefined}
      aria-label={label}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
