import { walk, nodeRange } from './_util.mjs';

// `arr.map(x => fn(x))` — useless lambda, just pass `fn`.
// Catches `(x) => fn(x)` and `(x, y) => fn(x, y)` style wrappers where
// param list exactly matches the call arg list.
export default {
  id: 'trivial-arrow-wrapper',
  severity: 'info',
  description: 'Arrow function that just forwards its args to another call',
  check(ctx) {
    const { sourceFile, ts } = ctx;
    const findings = [];

    walk(sourceFile, (node) => {
      if (node.kind !== ts.SyntaxKind.ArrowFunction) return;
      const params = node.parameters || [];
      if (params.length === 0) return;
      // skip params with default values, destructuring, rest, type-only modifiers
      for (const p of params) {
        if (p.dotDotDotToken) return;
        if (p.initializer) return;
        if (p.name && p.name.kind !== ts.SyntaxKind.Identifier) return;
      }

      // body must be a single call expression (or block with `return call;`)
      const call = unwrapCall(node.body, ts);
      if (!call) return;

      const args = call.arguments || [];
      if (args.length !== params.length) return;
      for (let i = 0; i < args.length; i++) {
        const arg = args[i];
        if (arg.kind !== ts.SyntaxKind.Identifier) return;
        if (arg.text !== params[i].name.text) return;
      }
      // callee can be any expression; we'll just suggest replacing the wrapper
      const range = nodeRange(sourceFile, node);
      const calleeText = call.expression.getText(sourceFile);
      findings.push({
        message: `trivial wrapper — replace \`${truncate(node.getText(sourceFile), 40)}\` with \`${truncate(calleeText, 40)}\``,
        line: range.line,
        column: range.column,
      });
    });
    return findings;
  },
};

function unwrapCall(body, ts) {
  if (!body) return null;
  if (body.kind === ts.SyntaxKind.CallExpression) return body;
  if (body.kind === ts.SyntaxKind.Block) {
    const stmts = body.statements;
    if (stmts.length !== 1) return null;
    const s = stmts[0];
    if (s.kind === ts.SyntaxKind.ReturnStatement && s.expression && s.expression.kind === ts.SyntaxKind.CallExpression) {
      return s.expression;
    }
    if (s.kind === ts.SyntaxKind.ExpressionStatement && s.expression.kind === ts.SyntaxKind.CallExpression) {
      // (x) => { fn(x); } — only flag if return type is void-ish; we'll be conservative and skip
      return null;
    }
  }
  return null;
}

function truncate(s, n) {
  s = s.replace(/\s+/g, ' ');
  return s.length > n ? s.slice(0, n - 1) + '…' : s;
}
