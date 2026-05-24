import { walk, nodeRange } from './_util.mjs';

// if (true) {...}  — pure padding.
// if (x == x) — same.
// Skipped: while (true) / for(;;) since they are legitimate event loops.
export default {
  id: 'always-true-conditional',
  severity: 'warn',
  description: 'if-conditions that are statically true (or trivially redundant)',
  check(ctx) {
    const { sourceFile, ts } = ctx;
    const findings = [];

    walk(sourceFile, (node) => {
      if (node.kind !== ts.SyntaxKind.IfStatement) return;
      const cond = node.expression;
      if (isAlwaysTrue(cond, ts)) {
        const range = nodeRange(sourceFile, cond);
        findings.push({
          message: 'if-condition is always true — drop the wrapper',
          line: range.line,
          column: range.column,
        });
      }
    });
    return findings;
  },
};

function isAlwaysTrue(node, ts) {
  if (!node) return false;
  if (node.kind === ts.SyntaxKind.TrueKeyword) return true;
  if (node.kind === ts.SyntaxKind.NumericLiteral && node.text !== '0') return true;
  if (
    node.kind === ts.SyntaxKind.BinaryExpression &&
    (node.operatorToken.kind === ts.SyntaxKind.EqualsEqualsToken ||
      node.operatorToken.kind === ts.SyntaxKind.EqualsEqualsEqualsToken) &&
    node.left.kind === ts.SyntaxKind.Identifier &&
    node.right.kind === ts.SyntaxKind.Identifier &&
    node.left.text === node.right.text
  ) {
    return true;
  }
  return false;
}
