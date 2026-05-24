// Validation harness: clones a list of trending repos (shallow), runs
// slopfighter scan --json on each, aggregates findings into a Markdown
// report + raw per-repo JSON. Designed to be the data artifact behind a
// "we scanned N trending AI repos" launch post.
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPOS_FILE = path.join(__dirname, 'repos.txt');
const RESULTS_DIR = path.join(__dirname, 'results');
const REPORT_FILE = path.join(__dirname, 'report.md');
const BIN = path.join(__dirname, '..', 'bin', 'slopfighter.mjs');
const WORK_DIR = path.join(os.tmpdir(), 'slopfighter-bench');

fs.mkdirSync(RESULTS_DIR, { recursive: true });
fs.mkdirSync(WORK_DIR, { recursive: true });

const repos = fs.readFileSync(REPOS_FILE, 'utf8')
  .split(/\r?\n/)
  .map((l) => l.trim())
  .filter((l) => l && !l.startsWith('#'))
  .map((l) => {
    const parts = l.split(/\s+/);
    return { slug: parts[0], subpath: parts[1] || '' };
  });

const summary = [];
const t0 = Date.now();

for (const r of repos) {
  const safeName = r.slug.replace('/', '_');
  const dest = path.join(WORK_DIR, safeName);
  process.stdout.write(`\n=== ${r.slug}${r.subpath ? ' / ' + r.subpath : ''} ===\n`);

  // shallow clone
  if (!fs.existsSync(dest)) {
    const url = `https://github.com/${r.slug}.git`;
    const tClone = Date.now();
    const clone = spawnSync('git', ['clone', '--depth', '1', '--single-branch', '--quiet', url, dest], {
      stdio: 'inherit',
      timeout: 180_000,
    });
    if (clone.status !== 0) {
      summary.push({ slug: r.slug, status: 'CLONE_FAIL' });
      continue;
    }
    process.stdout.write(`  cloned in ${((Date.now() - tClone) / 1000).toFixed(1)}s\n`);
  } else {
    process.stdout.write('  (cached)\n');
  }

  const scanTarget = r.subpath ? path.join(dest, r.subpath) : dest;
  if (!fs.existsSync(scanTarget)) {
    process.stdout.write(`  subpath missing: ${r.subpath}\n`);
    summary.push({ slug: r.slug, status: 'SUBPATH_MISSING' });
    continue;
  }

  const tScan = Date.now();
  const scan = spawnSync(process.execPath, [BIN, 'scan', scanTarget, '--json'], {
    encoding: 'utf8',
    maxBuffer: 200 * 1024 * 1024,
    timeout: 300_000,
  });
  const scanMs = Date.now() - tScan;

  if (scan.status === null) {
    process.stdout.write(`  scan TIMEOUT after ${(scanMs / 1000).toFixed(1)}s\n`);
    summary.push({ slug: r.slug, status: 'SCAN_TIMEOUT' });
    continue;
  }

  let parsed;
  try {
    parsed = JSON.parse(scan.stdout);
  } catch (e) {
    process.stdout.write(`  scan output unparseable: ${e.message}\n`);
    summary.push({ slug: r.slug, status: 'PARSE_FAIL' });
    continue;
  }

  const fileCount = countFiles(scanTarget);
  const findings = parsed.findings || [];
  const byRule = parsed.score?.byRule || {};
  const fileWithFindings = new Set(findings.map((f) => f.file)).size;

  const row = {
    slug: r.slug,
    status: 'OK',
    files: fileCount,
    filesWithFindings: fileWithFindings,
    findingsTotal: findings.length,
    findingsPerFile: fileCount > 0 ? +(findings.length / fileCount).toFixed(2) : 0,
    score: parsed.score?.value,
    grade: parsed.score?.grade,
    byRule,
    scanSec: +(scanMs / 1000).toFixed(2),
  };
  summary.push(row);

  // save full per-repo json
  fs.writeFileSync(path.join(RESULTS_DIR, `${safeName}.json`), JSON.stringify(parsed, null, 2));

  process.stdout.write(
    `  files: ${fileCount}, findings: ${findings.length} ` +
    `(${row.findingsPerFile}/file), score: ${row.score}/100 (${row.grade}), ` +
    `time: ${row.scanSec}s\n`
  );
}

const elapsed = ((Date.now() - t0) / 1000).toFixed(1);
process.stdout.write(`\n--- bench complete in ${elapsed}s ---\n\n`);

writeReport(summary, elapsed);
process.stdout.write(`report → ${REPORT_FILE}\n`);

function countFiles(dir) {
  const exts = new Set(['.js', '.jsx', '.ts', '.tsx', '.mjs', '.cjs']);
  const skip = new Set(['node_modules', '.git', 'dist', 'build', '.next', 'out', 'coverage', '.cache']);
  let count = 0;
  walk(dir);
  return count;
  function walk(d) {
    let entries;
    try { entries = fs.readdirSync(d, { withFileTypes: true }); } catch { return; }
    for (const e of entries) {
      if (e.isDirectory()) {
        if (skip.has(e.name)) continue;
        walk(path.join(d, e.name));
      } else if (e.isFile() && exts.has(path.extname(e.name))) {
        count++;
      }
    }
  }
}

function writeReport(rows, elapsedSec) {
  const okRows = rows.filter((r) => r.status === 'OK');
  const failed = rows.filter((r) => r.status !== 'OK');

  const totalFiles = okRows.reduce((s, r) => s + r.files, 0);
  const totalFindings = okRows.reduce((s, r) => s + r.findingsTotal, 0);
  const avgScore = okRows.length > 0
    ? Math.round(okRows.reduce((s, r) => s + (r.score || 0), 0) / okRows.length)
    : 0;
  const findingsPerFile = totalFiles > 0 ? (totalFindings / totalFiles).toFixed(2) : '0';

  // aggregate by rule
  const totalByRule = {};
  for (const r of okRows) {
    for (const [rule, n] of Object.entries(r.byRule || {})) {
      totalByRule[rule] = (totalByRule[rule] || 0) + n;
    }
  }
  const sortedRules = Object.entries(totalByRule).sort((a, b) => b[1] - a[1]);

  let md = `# slopfighter validation: ${okRows.length} trending AI repos\n\n`;
  md += `**Total files scanned:** ${totalFiles.toLocaleString()}  \n`;
  md += `**Total findings:** ${totalFindings.toLocaleString()}  \n`;
  md += `**Findings per file (avg):** ${findingsPerFile}  \n`;
  md += `**Average slop score:** ${avgScore}/100  \n`;
  md += `**Bench time:** ${elapsedSec}s\n\n`;

  md += `## Per-repo\n\n`;
  md += `| Repo | Files | Findings | /file | Score | Grade | Scan (s) |\n`;
  md += `|---|---:|---:|---:|---:|:---:|---:|\n`;
  for (const r of okRows.sort((a, b) => (a.score || 0) - (b.score || 0))) {
    md += `| \`${r.slug}\` | ${r.files} | ${r.findingsTotal} | ${r.findingsPerFile} | ${r.score} | ${r.grade} | ${r.scanSec} |\n`;
  }

  if (failed.length) {
    md += `\n## Failed\n\n`;
    for (const r of failed) md += `- \`${r.slug}\`: ${r.status}\n`;
  }

  md += `\n## Findings by rule (across all repos)\n\n`;
  md += `| Rule | Total | Share |\n|---|---:|---:|\n`;
  for (const [rule, n] of sortedRules) {
    const pct = ((n / totalFindings) * 100).toFixed(1);
    md += `| \`${rule}\` | ${n.toLocaleString()} | ${pct}% |\n`;
  }

  fs.writeFileSync(REPORT_FILE, md, 'utf8');
}
