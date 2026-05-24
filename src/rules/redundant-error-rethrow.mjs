import { walk, nodeRange } from './_util.mjs';

// `throw new Error(err.message)` — strips stack and type for no reason.
// `throw new Error(String(err))` — same.
export default {
  id: 'redundant-error-rethrow',
  severity: 'warn',
  description: 'Re-wrapping an Error in `new Error(err.message)` destroys the stack',
  check(ctx) {
    const { sourceFile, ts } = ctx;
    const findings = [];

    walk(sourceFile, (node) => {
      if (node.kind !== ts.SyntaxKind.ThrowStatement) return;
      const expr = node.expression;
      if (!expr || expr.kind !== ts.SyntaxKind.NewExpression) return;
      const callee = expr.expression;
      if (callee.kind !== ts.SyntaxKind.Identifier) return;
      if (callee.text !== 'Error') return;
      const args = expr.arguments || [];
      if (args.length !== 1) return;
      const arg = args[0];
      // foo.message
      const isDotMessage =
        arg.kind === ts.SyntaxKind.PropertyAccessExpression &&
        arg.name &&
        arg.name.text === 'message';
      // String(foo)
      const isStringWrap =
        arg.kind === ts.SyntaxKind.CallExpression &&
        arg.expression &&
        arg.expression.kind === ts.SyntaxKind.Identifier &&
        arg.expression.text === 'String';
      if (!isDotMessage && !isStringWrap) return;

      const range = nodeRange(sourceFile, node);
      findings.push({
        message: 'rewrapping an Error destroys the stack — just `throw err` or use `{ cause: err }`',
        ...range,
      });
    });
    return findings;
  },
};
