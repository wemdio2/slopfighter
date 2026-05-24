import path from 'node:path';
import pc from 'picocolors';
import { scanPath } from './scanner.mjs';
import { renderReport, renderScore } from './reporter.mjs';
import { computeScore } from './score.mjs';
import { applyFixes } from './fixer.mjs';
import { runInstall } from './installer.mjs';

const VERSION = '0.1.0';

const HELP = `slopfighter v${VERSION} — anti-AI-slop refactor tool

Usage:
  slopfighter scan [path]           Scan files and report findings
  slopfighter score [path]          Print only the slop score (0-100)
  slopfighter fix [path] --safe     Apply safe auto-fixes
  slopfighter install [root]        Install the skill into .claude / .cursor / AGENTS.md
  slopfighter --help                Show this help
  slopfighter --version             Show version

Options:
  --json                 Output JSON instead of human report
  --strict               Enable noisier rules
  --rules a,b,c          Run only these rules
  --ignore pattern       Skip files matching glob (repeatable)
  --only a,b,c           install only into these targets (claude,cursor,agents)
  --skip a,b,c           install skips these targets
  --force                install into all targets even if not auto-detected

Examples:
  slopfighter scan ./src
  slopfighter score . --json
  slopfighter fix ./src --safe
  slopfighter install               # detects .claude/.cursor/AGENTS.md and writes
  slopfighter install --force       # writes to every target
`;

export async function runCli(argv) {
  if (argv.length === 0 || argv.includes('--help') || argv.includes('-h')) {
    process.stdout.write(HELP);
    return;
  }
  if (argv.includes('--version') || argv.includes('-v')) {
    process.stdout.write(`slopfighter ${VERSION}\n`);
    return;
  }

  const command = argv[0];
  const rest = argv.slice(1);
  const positional = rest.filter((a) => !a.startsWith('--'));
  const target = path.resolve(positional[0] || '.');
  const flags = parseFlags(rest);

  if (command === 'scan') {
    await cmdScan(target, flags);
  } else if (command === 'score') {
    await cmdScore(target, flags);
  } else if (command === 'fix') {
    await cmdFix(target, flags);
  } else if (command === 'install') {
    await cmdInstall(target, flags);
  } else {
    process.stderr.write(pc.red(`Unknown command: ${command}\n\n`));
    process.stdout.write(HELP);
    process.exitCode = 1;
  }
}

function parseFlags(rest) {
  const flags = {
    json: false, strict: false, safe: false, rules: null, ignore: [],
    only: null, skip: null, force: false,
  };
  for (let i = 0; i < rest.length; i++) {
    const a = rest[i];
    if (a === '--json') flags.json = true;
    else if (a === '--strict') flags.strict = true;
    else if (a === '--safe') flags.safe = true;
    else if (a === '--force') flags.force = true;
    else if (a === '--rules') flags.rules = (rest[++i] || '').split(',').filter(Boolean);
    else if (a === '--ignore') flags.ignore.push(rest[++i] || '');
    else if (a === '--only') flags.only = rest[++i] || null;
    else if (a === '--skip') flags.skip = rest[++i] || null;
  }
  return flags;
}

async function cmdScan(target, flags) {
  const findings = await scanPath(target, flags);
  const score = computeScore(findings);
  if (flags.json) {
    process.stdout.write(JSON.stringify({ score, findings }, null, 2) + '\n');
  } else {
    process.stdout.write(renderReport(findings, score, target));
  }
  process.exitCode = score.value < 60 ? 1 : 0;
}

async function cmdScore(target, flags) {
  const findings = await scanPath(target, flags);
  const score = computeScore(findings);
  if (flags.json) {
    process.stdout.write(JSON.stringify(score, null, 2) + '\n');
  } else {
    process.stdout.write(renderScore(score) + '\n');
  }
}

async function cmdInstall(root, flags) {
  const result = await runInstall(root, {
    only: flags.only,
    skip: flags.skip,
    force: flags.force,
  });
  if (result.message) {
    process.stdout.write(pc.yellow(result.message) + '\n');
    if (!result.installed?.length) process.exitCode = 1;
    return;
  }
  process.stdout.write(`${pc.green('Installed slopfighter skill')} into:\n`);
  for (const i of result.installed) {
    const rel = path.relative(process.cwd(), i.file) || i.file;
    process.stdout.write(`  ${pc.dim('•')} ${i.label.padEnd(12)} ${pc.cyan(rel)}\n`);
  }
}

async function cmdFix(target, flags) {
  if (!flags.safe) {
    process.stderr.write(pc.yellow('Refusing to fix without --safe (auto-fix is opt-in).\n'));
    process.exitCode = 1;
    return;
  }
  const findings = await scanPath(target, flags);
  const result = await applyFixes(findings);
  process.stdout.write(
    `${pc.green('Fixed')} ${result.fixed} issue(s) in ${result.files} file(s). ` +
      `${pc.dim(`${result.skipped} unsafe issue(s) left for manual review.`)}\n`
  );
}
