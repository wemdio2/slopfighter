import { walk, nodeRange } from './_util.mjs';

// `return await x` outside of a try/catch adds an extra microtask and a
// useless stack frame. Inside try/catch it's meaningful (catches the
// rejection), so we exclude that case.
export default {
  id: 'redundant-await',
  severity: 'info',
  description: '`return await x` outside try — drop the await',
  check(ctx) {
    const { sourceFile, ts } = ctx;
    const findings = [];

    walk(sourceFile, (node) => {
      if (node.kind !== ts.SyntaxKind.ReturnStatement) return;
      if (!node.expression || node.expression.kind !== ts.SyntaxKind.AwaitExpression) return;
      // walk up the parent chain — if any TryStatement contains us inside its tryBlock, skip
      if (insideTryBlock(node, ts)) return;
      const range = nodeRange(sourceFile, node);
      findings.push({
        message: '`return await x` outside try/catch — just `return x`',
        line: range.line,
        column: range.column,
      });
    });
    return findings;
  },
};

function insideTryBlock(node, ts) {
  let p = node.parent;
  while (p) {
    if (p.kind === ts.SyntaxKind.TryStatement && p.tryBlock && containsNode(p.tryBlock, node)) {
      return true;
    }
    // stop at function boundary — await is scoped to enclosing fn
    if (
      p.kind === ts.SyntaxKind.FunctionDeclaration ||
      p.kind === ts.SyntaxKind.FunctionExpression ||
      p.kind === ts.SyntaxKind.ArrowFunction ||
      p.kind === ts.SyntaxKind.MethodDeclaration
    ) return false;
    p = p.parent;
  }
  return false;
}

function containsNode(parent, target) {
  if (!parent || !target) return false;
  return target.pos >= parent.pos && target.end <= parent.end;
}
