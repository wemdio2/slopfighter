import { walk, nodeRange } from './_util.mjs';

// `return undefined` — equivalent to `return` and `return undefined` is
// pure noise that AI loves to add for "explicitness".
// Also catches `return void 0;`.
export default {
  id: 'return-undefined',
  severity: 'info',
  description: '`return undefined` is identical to bare `return`',
  check(ctx) {
    const { sourceFile, ts } = ctx;
    const findings = [];

    walk(sourceFile, (node) => {
      if (node.kind !== ts.SyntaxKind.ReturnStatement) return;
      const e = node.expression;
      if (!e) return;
      const isUndefined = e.kind === ts.SyntaxKind.Identifier && e.text === 'undefined';
      const isVoid0 =
        e.kind === ts.SyntaxKind.VoidExpression &&
        e.expression &&
        e.expression.kind === ts.SyntaxKind.NumericLiteral &&
        e.expression.text === '0';
      if (!isUndefined && !isVoid0) return;
      const range = nodeRange(sourceFile, node);
      findings.push({
        message: 'drop the explicit `undefined` — bare `return;` is equivalent',
        line: range.line,
        column: range.column,
        fix: { start: node.getStart(sourceFile), end: node.getEnd(), replacement: 'return;' },
      });
    });
    return findings;
  },
};
