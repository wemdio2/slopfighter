import { walk, nodeRange } from './_util.mjs';

// Manager/Helper/Utils/Service-suffixed class with <= 1 real method is a
// premature abstraction. Common AI tic: wraps a single function in a class
// "for future expansion".
const SUFFIXES = ['Manager', 'Helper', 'Utils', 'Util', 'Handler', 'Wrapper', 'Provider'];

export default {
  id: 'future-proof-naming',
  severity: 'warn',
  description: 'Manager/Helper/Utils-class with only one method — just use a function',
  check(ctx) {
    const { sourceFile, ts } = ctx;
    const findings = [];

    walk(sourceFile, (node) => {
      if (node.kind !== ts.SyntaxKind.ClassDeclaration) return;
      if (!node.name) return;
      // implements/extends → polymorphic, the suffix is meaningful
      if (node.heritageClauses && node.heritageClauses.length > 0) return;
      const name = node.name.text;
      const suffix = SUFFIXES.find((s) => name.endsWith(s));
      if (!suffix) return;

      const members = node.members || [];
      const methods = members.filter(
        (m) => m.kind === ts.SyntaxKind.MethodDeclaration || m.kind === ts.SyntaxKind.PropertyDeclaration
      );
      const realMethods = methods.filter((m) => m.kind === ts.SyntaxKind.MethodDeclaration);
      if (realMethods.length > 1) return;
      // ignore if it has stored state (multiple property declarations)
      const props = methods.filter((m) => m.kind === ts.SyntaxKind.PropertyDeclaration);
      if (props.length >= 2) return;

      const range = nodeRange(sourceFile, node);
      findings.push({
        message: `class "${name}" has ${realMethods.length} method(s) — convert to a plain function`,
        line: range.line,
        column: range.column,
        endLine: range.endLine,
        endColumn: range.endColumn,
      });
    });
    return findings;
  },
};
