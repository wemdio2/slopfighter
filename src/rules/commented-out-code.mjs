import { lineCol } from './_util.mjs';

// Blocks of 2+ consecutive `//` lines whose stripped content parses like
// code (has `=`, `;`, `(`, `{`, etc.) → classic AI artifact left after
// "let me also try" iterations.
const MIN_BLOCK = 2;
const CODE_TOKENS = /[=;(){}[\]]|=>|\?\?|::|<-/;

export default {
  id: 'commented-out-code',
  severity: 'warn',
  description: 'Blocks of commented-out code left after AI iterations',
  check(ctx) {
    const { source, sourceFile } = ctx;
    const findings = [];
    const lines = source.split(/\r?\n/);

    let blockStart = -1;
    let blockLines = 0;
    let blockCodeLines = 0;
    let blockEndPos = 0;

    for (let i = 0; i < lines.length; i++) {
      const trimmed = lines[i].trim();
      const isComment = trimmed.startsWith('//');
      const stripped = isComment ? trimmed.replace(/^\/\/+\s?/, '').trim() : '';
      const looksLikeCode = isComment && stripped.length > 0 && CODE_TOKENS.test(stripped);
      // commented-out import/export/return/etc. → also code-like
      const looksLikeKeyword = isComment && /^(import|export|return|if|else|for|while|const|let|var|function|class|throw)\b/.test(stripped);

      if (isComment && (looksLikeCode || looksLikeKeyword)) {
        if (blockStart === -1) blockStart = i;
        blockLines++;
        blockCodeLines++;
      } else if (isComment) {
        // ordinary comment line — extend block but don't count as code
        if (blockStart !== -1) blockLines++;
      } else {
        flush(i - 1);
        blockStart = -1;
        blockLines = 0;
        blockCodeLines = 0;
      }
    }
    flush(lines.length - 1);
    return findings;

    function flush(endLine) {
      if (blockStart === -1) return;
      if (blockCodeLines >= MIN_BLOCK) {
        findings.push({
          message: `${blockCodeLines}-line commented-out code block — remove or restore`,
          line: blockStart + 1,
          column: 1,
          endLine: endLine + 1,
          endColumn: 1,
        });
      }
    }
  },
};
