import { walk, nodeRange } from './_util.mjs';

// `async function foo() { return x }` — async with no await inside, no
// Promise return needed beyond what `async` adds. Either drop `async`
// or there's a missing await.
export default {
  id: 'unnecessary-async',
  severity: 'info',
  description: 'async function/method with no await in its body',
  check(ctx) {
    const { sourceFile, ts } = ctx;
    const findings = [];

    walk(sourceFile, (node) => {
      const isAsync =
        node.modifiers &&
        node.modifiers.some((m) => m.kind === ts.SyntaxKind.AsyncKeyword);
      if (!isAsync) return;

      const isFn =
        node.kind === ts.SyntaxKind.FunctionDeclaration ||
        node.kind === ts.SyntaxKind.MethodDeclaration ||
        node.kind === ts.SyntaxKind.ArrowFunction ||
        node.kind === ts.SyntaxKind.FunctionExpression;
      if (!isFn) return;
      if (!node.body) return;

      if (!hasAwait(node.body, ts)) {
        const range = nodeRange(sourceFile, node);
        const name = node.name && node.name.text ? `"${node.name.text}" ` : '';
        findings.push({
          message: `async ${name}has no \`await\` — drop \`async\` or add the missing await`,
          line: range.line,
          column: range.column,
        });
      }
    });
    return findings;
  },
};

function hasAwait(node, ts) {
  let found = false;
  visit(node);
  return found;

  function visit(n) {
    if (found || !n) return;
    // do not descend into nested function bodies — their awaits are theirs
    if (
      n !== node &&
      (n.kind === ts.SyntaxKind.FunctionDeclaration ||
        n.kind === ts.SyntaxKind.FunctionExpression ||
        n.kind === ts.SyntaxKind.ArrowFunction ||
        n.kind === ts.SyntaxKind.MethodDeclaration)
    ) return;
    if (n.kind === ts.SyntaxKind.AwaitExpression) { found = true; return; }
    if (n.kind === ts.SyntaxKind.ForOfStatement && n.awaitModifier) { found = true; return; }
    n.forEachChild(visit);
  }
}
