import { walk, lineCol, deCamel } from './_util.mjs';

// A comment is "padding" when its content tokens overlap fully with the
// following declaration's name (allowing verb-form variation).
// Classic AI tic: `// Get user name` over `function getUserName()`.
const STOPWORDS = new Set([
  'this', 'a', 'an', 'the', 'is', 'are', 'that', 'which', 'to', 'of', 'in', 'on',
  'and', 'or', 'for', 'with', 'function', 'method', 'class', 'helper', 'simple',
  'utility', 'just', 'simply', 'used',
]);
const VERBS = new Set([
  'get', 'gets', 'set', 'sets', 'return', 'returns', 'fetch', 'fetches',
  'retrieve', 'retrieves', 'compute', 'computes', 'calculate', 'calculates',
  'create', 'creates', 'build', 'builds', 'make', 'makes', 'handle', 'handles',
  'process', 'processes', 'check', 'checks', 'validate', 'validates',
  'parse', 'parses', 'load', 'loads', 'save', 'saves', 'read', 'reads',
  'write', 'writes', 'find', 'finds', 'add', 'adds', 'remove', 'removes',
]);

export default {
  id: 'padding-comments',
  severity: 'warn',
  description: 'Comments that just restate the function/variable name',
  check(ctx) {
    const { sourceFile, source, ts } = ctx;
    const findings = [];

    walk(sourceFile, (node) => {
      const name = getDeclName(node, ts);
      if (!name) return;

      const leading = ts.getLeadingCommentRanges(source, node.getFullStart()) || [];
      for (const c of leading) {
        const raw = source.slice(c.pos, c.end);
        // skip JSDoc — excessive-jsdoc covers it
        if (raw.startsWith('/**')) continue;
        const inner = stripCommentMarkers(raw);
        if (!inner) continue;
        if (looksLikePadding(inner, name)) {
          const loc = lineCol(sourceFile, c.pos);
          findings.push({
            message: `Comment "${truncate(inner, 50)}" just restates "${name}". Drop it.`,
            line: loc.line,
            column: loc.column,
            fix: { start: c.pos, end: c.end + skipTrailingNewline(source, c.end), replacement: '' },
          });
        }
      }
    });
    return findings;
  },
};

function getDeclName(node, ts) {
  if (!node) return null;
  const k = node.kind;
  if (k === ts.SyntaxKind.FunctionDeclaration && node.name) return node.name.text;
  if (k === ts.SyntaxKind.ClassDeclaration && node.name) return node.name.text;
  if (k === ts.SyntaxKind.MethodDeclaration && node.name && node.name.text) return node.name.text;
  if (k === ts.SyntaxKind.VariableStatement) {
    // only match `const foo = () => ...` / `const foo = function() ...`,
    // NOT `const Typescript = { ... }` (section labels in config objects)
    const decl = node.declarationList?.declarations?.[0];
    if (!decl || !decl.name || !decl.name.text) return null;
    const init = decl.initializer;
    if (!init) return null;
    if (
      init.kind === ts.SyntaxKind.ArrowFunction ||
      init.kind === ts.SyntaxKind.FunctionExpression
    ) {
      return decl.name.text;
    }
    return null;
  }
  return null;
}

function stripCommentMarkers(text) {
  return text
    .replace(/^\/\*+/, '')
    .replace(/\*+\/$/, '')
    .replace(/^\/\/+/, '')
    .split('\n')
    .map((l) => l.replace(/^\s*\*+\s?/, '').trim())
    .filter(Boolean)
    .join(' ')
    .trim();
}

function tokenize(text) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]+/g, ' ')
    .split(/\s+/)
    .filter(Boolean);
}

function looksLikePadding(commentText, name) {
  const cwords = tokenize(commentText);
  if (cwords.length === 0 || cwords.length > 14) return false;

  const nameWords = tokenize(deCamel(name));
  const nset = new Set(nameWords.filter((w) => !STOPWORDS.has(w)));
  const cset = new Set(cwords.filter((w) => !STOPWORDS.has(w)));
  if (nset.size === 0) return false;

  const commentHasVerb = [...cset].some((w) => VERBS.has(w));
  for (const w of nset) {
    if (cset.has(w)) continue;
    if (cset.has(w + 's')) continue;
    if (cset.has(w.replace(/s$/, ''))) continue;
    if (VERBS.has(w) && commentHasVerb) continue;
    return false; // name token absent → not padding
  }

  // Comment may add at most a couple of "extra" content words.
  const extras = [...cset].filter(
    (c) => !nset.has(c) && !VERBS.has(c) && !nset.has(c.replace(/s$/, ''))
  );
  return extras.length <= 2;
}

function truncate(s, n) {
  return s.length > n ? s.slice(0, n - 1) + '…' : s;
}

function skipTrailingNewline(source, pos) {
  if (source[pos] === '\r' && source[pos + 1] === '\n') return 2;
  if (source[pos] === '\n' || source[pos] === '\r') return 1;
  return 0;
}
