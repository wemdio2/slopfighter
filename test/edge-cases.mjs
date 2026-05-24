// Edge cases: empty file, syntax error, JS-only (no TS rules fire), comments
// only, ignored dirs. Scanner must never crash.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { scanPath } from '../src/scanner.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const TMP_DIR = path.join(__dirname, '_tmp-edge');
fs.mkdirSync(TMP_DIR, { recursive: true });

const cases = [
  {
    name: 'empty file produces no findings',
    files: { 'empty.ts': '' },
    check: (findings) => findings.length === 0,
  },
  {
    name: 'comment-only file produces no findings',
    files: { 'only-comments.ts': '// just a comment\n/* and a block */\n' },
    check: (findings) => findings.length === 0,
  },
  {
    name: 'plain JS file does not fire TS-only rules (explicit-any)',
    files: { 'plain.js': 'function f(x) { return x; }\n' },
    check: (findings) => findings.every((f) => f.ruleId !== 'explicit-any'),
  },
  {
    name: 'syntax-error file does not crash scanner',
    files: { 'broken.ts': 'function f( { return\n' },
    check: (findings) => Array.isArray(findings),
  },
  {
    name: 'node_modules is skipped',
    files: {
      'node_modules/garbage.ts': 'export function getX(): any { return null; }',
      'src.ts': 'export function getX(): string { return ""; }',
    },
    check: (findings) => findings.every((f) => !f.file.includes('node_modules')),
  },
  {
    name: 'TSX file scans without crashing',
    files: {
      'a.tsx': 'export const A = (p: { name: string }) => <div>{p.name}</div>;',
    },
    check: (findings) => Array.isArray(findings),
  },
  {
    name: 'file with side-effect-only import is not flagged',
    files: { 'side.ts': 'import "./styles.css";\nexport const x = 1;' },
    check: (findings) => findings.every((f) => f.ruleId !== 'dead-imports'),
  },
];

let pass = 0, fail = 0;
const failures = [];

for (const c of cases) {
  // wipe + repopulate tmp
  for (const f of fs.readdirSync(TMP_DIR)) {
    fs.rmSync(path.join(TMP_DIR, f), { recursive: true, force: true });
  }
  for (const [rel, content] of Object.entries(c.files)) {
    const full = path.join(TMP_DIR, rel);
    fs.mkdirSync(path.dirname(full), { recursive: true });
    fs.writeFileSync(full, content, 'utf8');
  }

  let findings;
  let err;
  try {
    findings = await scanPath(TMP_DIR);
  } catch (e) {
    err = e;
  }

  if (err) {
    fail++;
    failures.push({ name: c.name, problem: `scanner crashed: ${err.message}` });
    continue;
  }
  if (c.check(findings)) {
    pass++;
  } else {
    fail++;
    failures.push({
      name: c.name,
      problem: 'check returned false',
      findings: findings.map((f) => `${f.ruleId}@${path.basename(f.file)}:${f.line}`),
    });
  }
}

fs.rmSync(TMP_DIR, { recursive: true, force: true });

if (failures.length) {
  console.log(`edge-cases: ${pass} passed, ${fail} failed`);
  for (const f of failures) {
    console.log(`  FAIL  ${f.name}`);
    console.log(`        ${f.problem}`);
    if (f.findings) console.log(`        findings: ${JSON.stringify(f.findings)}`);
  }
  process.exit(1);
} else {
  console.log(`edge-cases: ${pass} passed`);
}
