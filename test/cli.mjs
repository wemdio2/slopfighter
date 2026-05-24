// Integration tests: spawn the actual bin and verify stdout/exit-code/JSON.
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BIN = path.join(__dirname, '..', 'bin', 'slopfighter.mjs');
const FIXTURES = path.join(__dirname, 'fixtures');

function run(args) {
  const r = spawnSync(process.execPath, [BIN, ...args], { encoding: 'utf8' });
  return { code: r.status, stdout: r.stdout || '', stderr: r.stderr || '' };
}

const cases = [
  {
    name: '--help prints usage and exits 0',
    args: ['--help'],
    check: (r) => r.code === 0 && r.stdout.includes('slopfighter'),
  },
  {
    name: '--version prints version and exits 0',
    args: ['--version'],
    check: (r) => r.code === 0 && /\d+\.\d+\.\d+/.test(r.stdout),
  },
  {
    name: 'no args prints help',
    args: [],
    check: (r) => r.code === 0 && r.stdout.includes('Usage:'),
  },
  {
    name: 'unknown command exits non-zero',
    args: ['blorp'],
    check: (r) => r.code !== 0 && /unknown/i.test(r.stderr),
  },
  {
    name: 'scan on slop fixture: exit 1 (score < 60 floor) or 0',
    args: ['scan', path.join(FIXTURES, 'slop-heavy.ts')],
    check: (r) => r.stdout.includes('slop score') && r.stdout.includes('getUserName'),
  },
  {
    name: 'scan on clean fixture: exit 0',
    args: ['scan', path.join(FIXTURES, 'clean.ts')],
    check: (r) => r.code === 0 && r.stdout.includes('No slop detected'),
  },
  {
    name: 'score --json returns parseable JSON',
    args: ['score', path.join(FIXTURES, 'slop-heavy.ts'), '--json'],
    check: (r) => {
      try {
        const j = JSON.parse(r.stdout);
        return typeof j.value === 'number' && j.value >= 0 && j.value <= 100 && typeof j.grade === 'string';
      } catch { return false; }
    },
  },
  {
    name: 'scan --json returns parseable JSON with findings array',
    args: ['scan', path.join(FIXTURES, 'slop-heavy.ts'), '--json'],
    check: (r) => {
      try {
        const j = JSON.parse(r.stdout);
        return Array.isArray(j.findings) && j.findings.length > 0 && j.findings.every((f) => f.ruleId && f.file);
      } catch { return false; }
    },
  },
  {
    name: '--rules filter narrows findings',
    args: ['scan', path.join(FIXTURES, 'slop-heavy.ts'), '--rules', 'explicit-any', '--json'],
    check: (r) => {
      try {
        const j = JSON.parse(r.stdout);
        return j.findings.length > 0 && j.findings.every((f) => f.ruleId === 'explicit-any');
      } catch { return false; }
    },
  },
  {
    name: 'fix without --safe refuses',
    args: ['fix', path.join(FIXTURES, 'clean.ts')],
    check: (r) => r.code !== 0 && /--safe/i.test(r.stderr),
  },
  {
    name: 'directory scan walks fixtures dir',
    args: ['scan', FIXTURES, '--json'],
    check: (r) => {
      try {
        const j = JSON.parse(r.stdout);
        // should pick up both files; slop-heavy yields >= 8 findings, clean yields 0
        const files = new Set(j.findings.map((f) => f.file));
        return j.findings.length >= 8 && [...files].some((f) => f.includes('slop-heavy'));
      } catch { return false; }
    },
  },
];

let pass = 0, fail = 0;
const failures = [];

for (const c of cases) {
  const r = run(c.args);
  if (c.check(r)) {
    pass++;
  } else {
    fail++;
    failures.push({ name: c.name, args: c.args, code: r.code, stdout: r.stdout.slice(0, 300), stderr: r.stderr.slice(0, 300) });
  }
}

if (failures.length) {
  console.log(`cli: ${pass} passed, ${fail} failed`);
  for (const f of failures) {
    console.log(`  FAIL  ${f.name}`);
    console.log(`        args: ${JSON.stringify(f.args)}`);
    console.log(`        code: ${f.code}`);
    if (f.stdout) console.log(`        stdout: ${f.stdout}`);
    if (f.stderr) console.log(`        stderr: ${f.stderr}`);
  }
  process.exit(1);
} else {
  console.log(`cli: ${pass} passed`);
}
