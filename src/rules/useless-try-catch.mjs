import { walk, nodeRange } from './_util.mjs';

// catch (e) { throw e } — useless wrapping.
// catch (e) { console.log(e); throw e } — only slightly less useless.
export default {
  id: 'useless-try-catch',
  severity: 'warn',
  description: 'try/catch that just rethrows or logs-then-rethrows',
  check(ctx) {
    const { sourceFile, ts } = ctx;
    const findings = [];

    walk(sourceFile, (node) => {
      if (node.kind !== ts.SyntaxKind.TryStatement) return;
      const cc = node.catchClause;
      if (!cc || !cc.block) return;
      const stmts = cc.block.statements || [];
      if (stmts.length === 0) {
        // swallow: also bad but a different smell — skip here
        return;
      }
      const last = stmts[stmts.length - 1];
      const errName = cc.variableDeclaration && cc.variableDeclaration.name && cc.variableDeclaration.name.text;

      // is the last statement `throw e` referencing the catch var?
      const lastIsRethrow =
        last.kind === ts.SyntaxKind.ThrowStatement &&
        last.expression &&
        last.expression.kind === ts.SyntaxKind.Identifier &&
        last.expression.text === errName;

      if (!lastIsRethrow) return;

      const others = stmts.slice(0, -1);
      const allOthersAreLogs = others.every((s) => isJustLog(s, ts));
      if (others.length === 0 || allOthersAreLogs) {
        const range = nodeRange(sourceFile, cc);
        findings.push({
          message:
            others.length === 0
              ? `catch only rethrows ${errName} — drop the try/catch entirely.`
              : `catch logs and rethrows — caller can handle it, the log just spams noise.`,
          ...range,
        });
      }
    });
    return findings;
  },
};

function isJustLog(stmt, ts) {
  if (stmt.kind !== ts.SyntaxKind.ExpressionStatement) return false;
  const expr = stmt.expression;
  if (expr.kind !== ts.SyntaxKind.CallExpression) return false;
  const callee = expr.expression;
  // console.<anything>(...)
  if (callee.kind === ts.SyntaxKind.PropertyAccessExpression) {
    const obj = callee.expression;
    if (obj.kind === ts.SyntaxKind.Identifier && obj.text === 'console') return true;
  }
  return false;
}
