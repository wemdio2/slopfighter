import { walk, nodeRange } from './_util.mjs';

// `if (x !== null && x !== undefined && x)` — three checks where one
// suffices. Or `if (x != null) { if (x !== undefined) {...} }` — nested
// nullish guards.  AI loves these.
export default {
  id: 'over-defensive-null-check',
  severity: 'info',
  description: 'Redundant null/undefined checks chained or nested',
  check(ctx) {
    const { sourceFile, ts } = ctx;
    const findings = [];

    walk(sourceFile, (node) => {
      if (node.kind !== ts.SyntaxKind.IfStatement) return;
      const cond = node.expression;
      const nullishOps = countNullishOps(cond, ts);
      if (nullishOps.identifiers.size === 1 && nullishOps.count >= 3) {
        const range = nodeRange(sourceFile, cond);
        findings.push({
          message: `triple nullish check on the same identifier — \`if (${[...nullishOps.identifiers][0]} != null)\` is enough`,
          line: range.line,
          column: range.column,
        });
      }
    });
    return findings;
  },
};

function countNullishOps(node, ts) {
  const idents = new Set();
  let count = 0;
  visit(node);
  return { count, identifiers: idents };

  function visit(n) {
    if (!n) return;
    if (n.kind === ts.SyntaxKind.BinaryExpression) {
      const op = n.operatorToken.kind;
      if (
        op === ts.SyntaxKind.AmpersandAmpersandToken ||
        op === ts.SyntaxKind.BarBarToken
      ) {
        visit(n.left); visit(n.right);
        return;
      }
      if (
        op === ts.SyntaxKind.EqualsEqualsToken ||
        op === ts.SyntaxKind.EqualsEqualsEqualsToken ||
        op === ts.SyntaxKind.ExclamationEqualsToken ||
        op === ts.SyntaxKind.ExclamationEqualsEqualsToken
      ) {
        const ident = pickIdent(n, ts);
        const literal = pickNullishLiteral(n, ts);
        if (ident && literal) {
          idents.add(ident);
          count++;
        }
      }
      return;
    }
    // bare identifier as truthiness check on same var counts as one extra
    if (n.kind === ts.SyntaxKind.Identifier) {
      idents.add(n.text);
      count++;
    }
  }
}

function pickIdent(bin, ts) {
  if (bin.left.kind === ts.SyntaxKind.Identifier) return bin.left.text;
  if (bin.right.kind === ts.SyntaxKind.Identifier) return bin.right.text;
  return null;
}
function pickNullishLiteral(bin, ts) {
  const isNullish = (n) =>
    n.kind === ts.SyntaxKind.NullKeyword ||
    (n.kind === ts.SyntaxKind.Identifier && n.text === 'undefined');
  return isNullish(bin.left) || isNullish(bin.right);
}
