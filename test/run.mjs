// Top-level test orchestrator. Spawns each suite as a child process so a
// crash in one doesn't take down the others, and aggregates exit codes.
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const suites = [
  ['fixtures',    'fixtures.mjs'],
  ['unit-rules',  'unit-rules.mjs'],
  ['fix',         'fix.mjs'],
  ['edge-cases',  'edge-cases.mjs'],
  ['cli',         'cli.mjs'],
  ['install',     'install.mjs'],
];

let totalFailed = 0;
const start = Date.now();

for (const [label, file] of suites) {
  const r = spawnSync(process.execPath, [path.join(__dirname, file)], { encoding: 'utf8' });
  process.stdout.write(r.stdout || '');
  if (r.stderr) process.stderr.write(r.stderr);
  if (r.status !== 0) totalFailed++;
}

const elapsed = ((Date.now() - start) / 1000).toFixed(2);
console.log(`\n${totalFailed === 0 ? 'ALL GREEN' : `${totalFailed} suite(s) FAILED`}  (${elapsed}s)`);
process.exit(totalFailed === 0 ? 0 : 1);
