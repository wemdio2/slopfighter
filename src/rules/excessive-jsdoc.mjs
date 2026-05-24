import { walk, lineCol } from './_util.mjs';

// 8+ line JSDoc over a trivial getter / setter / one-line function is
// almost always AI padding. Threshold tuned to not flag genuine API docs
// for non-trivial functions.
const MIN_JSDOC_LINES = 6;
const MAX_BODY_LINES = 3;

export default {
  id: 'excessive-jsdoc',
  severity: 'info',
  description: 'JSDoc blocks longer than the function body itself',
  check(ctx) {
    const { sourceFile, source, ts } = ctx;
    const findings = [];

    walk(sourceFile, (node) => {
      if (
        node.kind !== ts.SyntaxKind.FunctionDeclaration &&
        node.kind !== ts.SyntaxKind.MethodDeclaration &&
        node.kind !== ts.SyntaxKind.ArrowFunction
      ) return;

      const leading = ts.getLeadingCommentRanges(source, node.getFullStart()) || [];
      const jsdoc = leading.find(
        (c) => c.kind === ts.SyntaxKind.MultiLineCommentTrivia && source.slice(c.pos, c.pos + 3) === '/**'
      );
      if (!jsdoc) return;

      const docText = source.slice(jsdoc.pos, jsdoc.end);
      const docLines = docText.split(/\r?\n/).length;
      if (docLines < MIN_JSDOC_LINES) return;

      const body = node.body;
      if (!body) return;
      const bodyStart = lineCol(sourceFile, body.getStart(sourceFile)).line;
      const bodyEnd = lineCol(sourceFile, body.getEnd()).line;
      const bodyLines = bodyEnd - bodyStart;
      if (bodyLines > MAX_BODY_LINES) return;

      const loc = lineCol(sourceFile, jsdoc.pos);
      findings.push({
        message: `${docLines}-line JSDoc for ${bodyLines}-line body — trim or drop`,
        line: loc.line,
        column: loc.column,
      });
    });
    return findings;
  },
};
