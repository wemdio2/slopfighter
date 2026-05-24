import fs from 'node:fs';
import path from 'node:path';
import ts from 'typescript';
import { allRules } from './rules/index.mjs';

const DEFAULT_EXTENSIONS = new Set(['.js', '.jsx', '.ts', '.tsx', '.mjs', '.cjs']);
const SKIP_DIRS = new Set([
  'node_modules', '.git', 'dist', 'build', '.next', 'out', 'coverage', '.cache',
  'vendor', 'vendored', 'third_party', 'thirdparty', 'generated', '__generated__',
  '.svelte-kit', '.nuxt', '.turbo', '.parcel-cache',
]);

export async function scanPath(target, flags = {}) {
  const stat = fs.statSync(target);
  const files = stat.isDirectory() ? collectFiles(target, flags.ignore || []) : [target];
  const activeRules = filterRules(allRules, flags);

  const findings = [];
  for (const file of files) {
    const fileFindings = scanFile(file, activeRules);
    findings.push(...fileFindings);
  }
  // Return both findings (array — callers that destructure or just use
  // .length keep working) AND a side-channel fileCount via a non-enumerable
  // property, so the score can normalize correctly.
  Object.defineProperty(findings, 'fileCount', { value: files.length, enumerable: false });
  return findings;
}

function collectFiles(dir, ignorePatterns) {
  const out = [];
  walk(dir);
  return out;

  function walk(d) {
    let entries;
    try {
      entries = fs.readdirSync(d, { withFileTypes: true });
    } catch {
      return;
    }
    for (const e of entries) {
      const full = path.join(d, e.name);
      if (e.isDirectory()) {
        if (SKIP_DIRS.has(e.name)) continue;
        walk(full);
      } else if (e.isFile()) {
        const ext = path.extname(e.name);
        if (!DEFAULT_EXTENSIONS.has(ext)) continue;
        if (shouldIgnore(full, ignorePatterns)) continue;
        out.push(full);
      }
    }
  }
}

function shouldIgnore(file, patterns) {
  if (!patterns.length) return false;
  const norm = file.replace(/\\/g, '/');
  return patterns.some((p) => norm.includes(p));
}

function filterRules(rules, flags) {
  let r = rules;
  if (flags.rules && flags.rules.length) {
    const set = new Set(flags.rules);
    r = r.filter((rule) => set.has(rule.id));
  }
  if (!flags.strict) {
    r = r.filter((rule) => !rule.strictOnly);
  }
  return r;
}

function scanFile(file, rules) {
  let source;
  try {
    source = fs.readFileSync(file, 'utf8');
  } catch {
    return [];
  }
  const ext = path.extname(file);
  const scriptKind =
    ext === '.tsx' ? ts.ScriptKind.TSX :
    ext === '.ts' ? ts.ScriptKind.TS :
    ext === '.jsx' ? ts.ScriptKind.JSX : ts.ScriptKind.JS;
  const sourceFile = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true, scriptKind);
  const lines = source.split(/\r?\n/);

  const ctx = { file, source, lines, sourceFile, ts };
  const findings = [];
  for (const rule of rules) {
    try {
      const results = rule.check(ctx) || [];
      for (const r of results) {
        findings.push({
          ruleId: rule.id,
          severity: r.severity || rule.severity || 'warn',
          message: r.message,
          file,
          line: r.line,
          column: r.column || 1,
          endLine: r.endLine || r.line,
          endColumn: r.endColumn || (r.column || 1) + 1,
          fixable: !!r.fix,
          fix: r.fix || null,
        });
      }
    } catch (err) {
      // never crash the scan on a buggy rule
      findings.push({
        ruleId: rule.id,
        severity: 'error',
        message: `rule crashed: ${err.message}`,
        file,
        line: 1,
        column: 1,
      });
    }
  }
  return findings;
}
