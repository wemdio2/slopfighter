import { walk, lineCol } from './_util.mjs';

// Explicit `: any` is almost always AI-generated laziness when a more
// specific type was knowable. Skipped if there's a `// eslint-disable` /
// `// slopfighter-disable` style comment on the same line.
export default {
  id: 'explicit-any',
  severity: 'warn',
  description: 'Explicit `any` type annotations',
  check(ctx) {
    const { sourceFile, source, ts } = ctx;
    if (!sourceFile.fileName.match(/\.(ts|tsx)$/)) return [];
    const findings = [];

    walk(sourceFile, (node) => {
      if (node.kind !== ts.SyntaxKind.AnyKeyword) return;
      const pos = node.getStart(sourceFile);
      const loc = lineCol(sourceFile, pos);
      // skip if the line has a disable marker
      const lineText = source.split(/\r?\n/)[loc.line - 1] || '';
      if (/slopfighter-disable|eslint-disable|@ts-ignore|@ts-expect-error/.test(lineText)) return;
      findings.push({
        message: 'avoid `any` — pick a real type or use `unknown`',
        line: loc.line,
        column: loc.column,
      });
    });
    return findings;
  },
};
