// Installer tests: simulate fake project layouts, run install, verify
// that the right files end up in the right places.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { runInstall } from '../src/installer.mjs';

let pass = 0, fail = 0;
const failures = [];

function mkProject(name) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), `slopfighter-install-${name}-`));
  return dir;
}

async function run(label, fn) {
  try {
    await fn();
    pass++;
    console.log(`  PASS  ${label}`);
  } catch (e) {
    fail++;
    failures.push({ label, error: e.message });
    console.log(`  FAIL  ${label}\n        ${e.message}`);
  }
}

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

console.log('install:');

await run('detects .claude and writes SKILL.md', async () => {
  const dir = mkProject('claude');
  fs.mkdirSync(path.join(dir, '.claude'));
  const r = await runInstall(dir);
  assert(r.installed?.some((i) => i.key === 'claude'), 'claude not in installed list');
  const skillPath = path.join(dir, '.claude', 'skills', 'slopfighter', 'SKILL.md');
  assert(fs.existsSync(skillPath), 'SKILL.md not written');
  const content = fs.readFileSync(skillPath, 'utf8');
  assert(content.includes('name: slopfighter'), 'frontmatter missing');
  assert(content.includes('npx slopfighter scan'), 'instructions missing');
});

await run('detects .cursor and writes command', async () => {
  const dir = mkProject('cursor');
  fs.mkdirSync(path.join(dir, '.cursor'));
  const r = await runInstall(dir);
  assert(r.installed?.some((i) => i.key === 'cursor'), 'cursor not in installed list');
  const cmdPath = path.join(dir, '.cursor', 'commands', 'slopfighter.md');
  assert(fs.existsSync(cmdPath), 'cursor command not written');
});

await run('detects AGENTS.md and appends section', async () => {
  const dir = mkProject('agents');
  fs.writeFileSync(path.join(dir, 'AGENTS.md'), '# Project rules\n\nUse TypeScript.\n');
  const r = await runInstall(dir);
  assert(r.installed?.some((i) => i.key === 'agents'), 'agents not in installed list');
  const md = fs.readFileSync(path.join(dir, 'AGENTS.md'), 'utf8');
  assert(md.includes('Use TypeScript.'), 'existing content lost');
  assert(md.includes('slopfighter:start'), 'section markers missing');
  assert(md.includes('Code quality (slopfighter)'), 'section heading missing');
});

await run('--force writes all three even on empty project', async () => {
  const dir = mkProject('force');
  const r = await runInstall(dir, { force: true });
  assert(r.installed?.length === 3, `expected 3 installs, got ${r.installed?.length}`);
  assert(fs.existsSync(path.join(dir, '.claude', 'skills', 'slopfighter', 'SKILL.md')));
  assert(fs.existsSync(path.join(dir, '.cursor', 'commands', 'slopfighter.md')));
  assert(fs.existsSync(path.join(dir, 'AGENTS.md')));
});

await run('--only claude installs only claude', async () => {
  const dir = mkProject('only-claude');
  const r = await runInstall(dir, { only: 'claude' });
  assert(r.installed?.length === 1, `expected 1 install, got ${r.installed?.length}`);
  assert(r.installed[0].key === 'claude');
  assert(!fs.existsSync(path.join(dir, '.cursor')), '.cursor should not exist');
  assert(!fs.existsSync(path.join(dir, 'AGENTS.md')), 'AGENTS.md should not exist');
});

await run('AGENTS.md section is idempotent (no duplication)', async () => {
  const dir = mkProject('idempotent');
  fs.writeFileSync(path.join(dir, 'AGENTS.md'), '# Rules\n');
  await runInstall(dir);
  await runInstall(dir);
  const md = fs.readFileSync(path.join(dir, 'AGENTS.md'), 'utf8');
  const startCount = (md.match(/slopfighter:start/g) || []).length;
  assert(startCount === 1, `expected 1 start marker, got ${startCount}`);
});

await run('empty project without --force returns a message', async () => {
  const dir = mkProject('empty');
  const r = await runInstall(dir);
  assert(!r.installed?.length, 'should not install into empty project without --force');
  assert(r.message && r.message.includes('No AI-tool config'), 'expected guidance message');
});

await run('--skip excludes a target', async () => {
  const dir = mkProject('skip');
  const r = await runInstall(dir, { force: true, skip: 'agents' });
  assert(r.installed?.length === 2, `expected 2 installs, got ${r.installed?.length}`);
  assert(!r.installed.some((i) => i.key === 'agents'));
  assert(!fs.existsSync(path.join(dir, 'AGENTS.md')));
});

console.log(`\ninstall: ${pass} passed${fail ? `, ${fail} failed` : ''}`);
process.exit(fail === 0 ? 0 : 1);
