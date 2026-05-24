import { walk, nodeRange } from './_util.mjs';

// `if (x) { return a; } else { return b; }` — the `else` is dead because
// the `if` branch already returned. Flatten it.
// Also catches `if (x) return; else doThing();`.
export default {
  id: 'else-after-return',
  severity: 'info',
  description: 'else-block after a returning if-block — unnecessary nesting',
  check(ctx) {
    const { sourceFile, ts } = ctx;
    const findings = [];

    walk(sourceFile, (node) => {
      if (node.kind !== ts.SyntaxKind.IfStatement) return;
      if (!node.elseStatement) return;
      if (!alwaysExits(node.thenStatement, ts)) return;

      const range = nodeRange(sourceFile, node.elseStatement);
      findings.push({
        message: '`else` after a returning `if` — drop the else and unindent',
        line: range.line,
        column: range.column,
      });
    });
    return findings;
  },
};

function alwaysExits(stmt, ts) {
  if (!stmt) return false;
  const k = stmt.kind;
  if (k === ts.SyntaxKind.ReturnStatement) return true;
  if (k === ts.SyntaxKind.ThrowStatement) return true;
  if (k === ts.SyntaxKind.ContinueStatement) return true;
  if (k === ts.SyntaxKind.BreakStatement) return true;
  if (k === ts.SyntaxKind.Block) {
    const stmts = stmt.statements;
    if (stmts.length === 0) return false;
    return alwaysExits(stmts[stmts.length - 1], ts);
  }
  return false;
}
