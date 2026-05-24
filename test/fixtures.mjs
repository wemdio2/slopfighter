// The original two-fixture tests, kept as a fast smoke check that the
// full corpus of rules cooperates on a realistic file.
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { scanPath } from '../src/scanner.mjs';
import { computeScore } from '../src/score.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FIXTURES = path.join(__dirname, 'fixtures');

const tests = [
  {
    name: 'slop-heavy.ts hits multiple rules',
    file: path.join(FIXTURES, 'slop-heavy.ts'),
    expectMinFindings: 8,
    expectRules: [
      'padding-comments',
      'explicit-any',
      'future-proof-naming',
      'useless-try-catch',
      'redundant-error-rethrow',
      'over-defensive-null-check',
      'always-true-conditional',
      'excessive-jsdoc',
    ],
    expectMaxScore: 5, // dense slop in a single file → F
  },
  {
    name: 'clean.ts has no findings',
    file: path.join(FIXTURES, 'clean.ts'),
    expectMaxFindings: 0,
    expectMinScore: 95,
  },
];

let pass = 0, fail = 0;

for (const t of tests) {
  const findings = await scanPath(t.file);
  const score = computeScore(findings);
  const ruleIds = new Set(findings.map((f) => f.ruleId));
  const problems = [];

  if (t.expectMinFindings != null && findings.length < t.expectMinFindings)
    problems.push(`expected ≥${t.expectMinFindings} findings, got ${findings.length}`);
  if (t.expectMaxFindings != null && findings.length > t.expectMaxFindings)
    problems.push(`expected ≤${t.expectMaxFindings} findings, got ${findings.length}`);
  if (t.expectRules) {
    const missing = t.expectRules.filter((r) => !ruleIds.has(r));
    if (missing.length) problems.push(`missing rule(s): ${missing.join(', ')}`);
  }
  if (t.expectMaxScore != null && score.value > t.expectMaxScore)
    problems.push(`expected score ≤${t.expectMaxScore}, got ${score.value}`);
  if (t.expectMinScore != null && score.value < t.expectMinScore)
    problems.push(`expected score ≥${t.expectMinScore}, got ${score.value}`);

  if (problems.length === 0) {
    pass++;
  } else {
    fail++;
    console.log(`  FAIL  ${t.name}`);
    for (const p of problems) console.log(`        ${p}`);
    console.log(`        findings: ${JSON.stringify(findings.map((f) => `${f.ruleId}@${f.line}`))}`);
  }
}

console.log(`fixtures: ${pass} passed${fail ? `, ${fail} failed` : ''}`);
process.exit(fail === 0 ? 0 : 1);
