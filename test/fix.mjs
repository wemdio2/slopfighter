// Fix-correctness tests: applying --safe must (a) reduce findings, (b) leave
// the source still parseable, (c) be idempotent on a second pass.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';
import { scanPath } from '../src/scanner.mjs';
import { applyFixes } from '../src/fixer.mjs';
import { computeScore } from '../src/score.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const TMP = path.join(__dirname, '_tmp-fix.ts');

const cases = [
  {
    name: 'padding comment is removed and file still parses',
    source: `// This function gets the user name
function getUserName(user: { name: string }): string {
  return user.name;
}
`,
    expectFindingsBefore: 1,
    expectFindingsAfter: 0,
  },
  {
    name: 'multiple padding comments fixed in one pass, idempotent',
    source: `// Get a
function getA() { return 1; }
// Get b
function getB() { return 2; }
// Get c
function getC() { return 3; }
`,
    expectFindingsBefore: 3,
    expectFindingsAfter: 0,
  },
];

let pass = 0, fail = 0;
const failures = [];

for (const c of cases) {
  fs.writeFileSync(TMP, c.source, 'utf8');

  const before = await scanPath(TMP);
  const beforeCount = before.length;

  await applyFixes(before);

  // re-scan
  const after = await scanPath(TMP);
  const afterCount = after.length;

  // still parses?
  const fixed = fs.readFileSync(TMP, 'utf8');
  const sf = ts.createSourceFile(TMP, fixed, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
  const parseErrors = sf.parseDiagnostics || [];

  // idempotent?
  await applyFixes(after);
  const after2 = await scanPath(TMP);

  const problems = [];
  if (beforeCount !== c.expectFindingsBefore) {
    problems.push(`before-findings expected ${c.expectFindingsBefore}, got ${beforeCount}`);
  }
  if (afterCount !== c.expectFindingsAfter) {
    problems.push(`after-findings expected ${c.expectFindingsAfter}, got ${afterCount}`);
  }
  if (parseErrors.length) {
    problems.push(`fixed source has ${parseErrors.length} parse error(s)`);
  }
  if (after2.length !== afterCount) {
    problems.push(`not idempotent: second fix changed finding count ${afterCount} → ${after2.length}`);
  }

  if (problems.length === 0) {
    pass++;
  } else {
    fail++;
    failures.push({ name: c.name, problems, fixed });
  }
}

try { fs.unlinkSync(TMP); } catch {}

if (failures.length) {
  console.log(`fix: ${pass} passed, ${fail} failed`);
  for (const f of failures) {
    console.log(`  FAIL  ${f.name}`);
    for (const p of f.problems) console.log(`        ${p}`);
    console.log(`        fixed source:\n${f.fixed.replace(/^/gm, '          ')}`);
  }
  process.exit(1);
} else {
  console.log(`fix: ${pass} passed`);
}
