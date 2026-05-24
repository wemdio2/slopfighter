import { walk, nodeRange } from './_util.mjs';

// `!!x` inside an `if`/`while`/`?:`/`&&`/`||` — already coerces.
// `Boolean(x)` in same contexts — same.
// AI loves to add these for "explicitness".
export default {
  id: 'redundant-boolean-cast',
  severity: 'info',
  description: '`!!x` or `Boolean(x)` where the value is already coerced',
  check(ctx) {
    const { sourceFile, ts } = ctx;
    const findings = [];

    walk(sourceFile, (node) => {
      if (!isBooleanContext(node, ts)) return;
      // for if/while/?: the expression is `node.expression` or `node.condition`
      const expr =
        node.expression || node.condition;
      if (!expr) return;
      const reason = describeRedundantCast(expr, ts);
      if (!reason) return;
      const range = nodeRange(sourceFile, expr);
      findings.push({
        message: `${reason} — already coerced to boolean by the surrounding context`,
        line: range.line,
        column: range.column,
      });
    });
    return findings;
  },
};

function isBooleanContext(node, ts) {
  return (
    node.kind === ts.SyntaxKind.IfStatement ||
    node.kind === ts.SyntaxKind.WhileStatement ||
    node.kind === ts.SyntaxKind.DoStatement ||
    node.kind === ts.SyntaxKind.ConditionalExpression ||
    (node.kind === ts.SyntaxKind.PrefixUnaryExpression && node.operator === ts.SyntaxKind.ExclamationToken)
  );
}

function describeRedundantCast(expr, ts) {
  // `!!x`
  if (
    expr.kind === ts.SyntaxKind.PrefixUnaryExpression &&
    expr.operator === ts.SyntaxKind.ExclamationToken &&
    expr.operand &&
    expr.operand.kind === ts.SyntaxKind.PrefixUnaryExpression &&
    expr.operand.operator === ts.SyntaxKind.ExclamationToken
  ) {
    return '`!!x`';
  }
  // `Boolean(x)`
  if (
    expr.kind === ts.SyntaxKind.CallExpression &&
    expr.expression &&
    expr.expression.kind === ts.SyntaxKind.Identifier &&
    expr.expression.text === 'Boolean' &&
    (expr.arguments || []).length === 1
  ) {
    return '`Boolean(x)`';
  }
  return null;
}
