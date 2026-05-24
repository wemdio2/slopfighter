import { walk, lineCol } from './_util.mjs';

// Heuristic: an imported name is dead if it appears only once in the file
// (its own import statement). Cheap, no scope tracking, false-positive-low
// for typical AI code.
export default {
  id: 'dead-imports',
  severity: 'warn',
  description: 'Imported names that are never referenced in the file',
  check(ctx) {
    const { sourceFile, source, ts } = ctx;
    const findings = [];

    walk(sourceFile, (node) => {
      if (node.kind !== ts.SyntaxKind.ImportDeclaration) return;
      const clause = node.importClause;
      if (!clause) return; // side-effect import

      const names = [];
      // default import:  import Foo from 'x'
      if (clause.name) names.push(clause.name);
      // named bindings: import { a, b as c } from 'x'  OR  import * as ns from 'x'
      const nb = clause.namedBindings;
      if (nb) {
        if (nb.kind === ts.SyntaxKind.NamespaceImport) {
          names.push(nb.name);
        } else if (nb.kind === ts.SyntaxKind.NamedImports) {
          for (const el of nb.elements) names.push(el.name);
        }
      }

      for (const id of names) {
        const text = id.text;
        const re = new RegExp(`\\b${escapeRegex(text)}\\b`, 'g');
        let count = 0;
        let m;
        while ((m = re.exec(source)) !== null) {
          count++;
          if (count > 1) break;
        }
        if (count <= 1) {
          const pos = id.getStart(sourceFile);
          const loc = lineCol(sourceFile, pos);
          findings.push({
            message: `import "${text}" is never used in this file`,
            line: loc.line,
            column: loc.column,
          });
        }
      }
    });
    return findings;
  },
};

function escapeRegex(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
