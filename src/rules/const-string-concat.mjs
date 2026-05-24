import { walk, nodeRange } from './_util.mjs';

// `"foo" + "bar"` — two string literals concatenated. Either it should
// be a single literal, or a template if it's going to grow. AI often
// fragments strings for readability and forgets to merge.
export default {
  id: 'const-string-concat',
  severity: 'info',
  description: 'Two adjacent string literals joined with `+` — merge them',
  check(ctx) {
    const { sourceFile, ts } = ctx;
    const findings = [];

    walk(sourceFile, (node) => {
      if (node.kind !== ts.SyntaxKind.BinaryExpression) return;
      if (node.operatorToken.kind !== ts.SyntaxKind.PlusToken) return;
      if (!isStringLit(node.left, ts)) return;
      if (!isStringLit(node.right, ts)) return;

      const range = nodeRange(sourceFile, node);
      findings.push({
        message: 'two string literals joined with `+` — write a single literal or template',
        line: range.line,
        column: range.column,
      });
    });
    return findings;
  },
};

function isStringLit(n, ts) {
  if (!n) return false;
  return (
    n.kind === ts.SyntaxKind.StringLiteral ||
    n.kind === ts.SyntaxKind.NoSubstitutionTemplateLiteral
  );
}
