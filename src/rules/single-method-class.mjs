import { walk, nodeRange } from './_util.mjs';

// Class with no fields and exactly one public method that doesn't reference
// `this` — it's just a namespace for a function. Convert to a function.
export default {
  id: 'single-method-class',
  severity: 'info',
  description: 'Class with one method that doesn\'t use `this` — should be a function',
  check(ctx) {
    const { sourceFile, ts } = ctx;
    const findings = [];

    walk(sourceFile, (node) => {
      if (node.kind !== ts.SyntaxKind.ClassDeclaration) return;
      if (!node.name) return;
      // subclasses and interface implementations are intentionally classes
      if (node.heritageClauses && node.heritageClauses.length > 0) return;
      const members = node.members || [];
      const props = members.filter((m) => m.kind === ts.SyntaxKind.PropertyDeclaration);
      const methods = members.filter((m) => m.kind === ts.SyntaxKind.MethodDeclaration);
      const ctors = members.filter((m) => m.kind === ts.SyntaxKind.Constructor);
      if (props.length > 0) return;
      if (methods.length !== 1) return;
      if (ctors.length > 0 && ctors[0].body && ctors[0].body.statements.length > 0) return;

      const method = methods[0];
      if (usesThis(method, ts)) return;

      const range = nodeRange(sourceFile, node);
      findings.push({
        message: `class "${node.name.text}" wraps a single this-free method — make it a function`,
        line: range.line,
        column: range.column,
      });
    });
    return findings;
  },
};

function usesThis(node, ts) {
  let found = false;
  visit(node);
  return found;
  function visit(n) {
    if (found || !n) return;
    if (n.kind === ts.SyntaxKind.ThisKeyword) { found = true; return; }
    n.forEachChild(visit);
  }
}
