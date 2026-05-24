// Generates bench/index.html — a single self-contained dark-mode page
// with the bench data baked in. No external CSS/JS, ready to open in any
// browser, host on GitHub Pages, or screenshot for an X-thread.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const RESULTS_DIR = path.join(__dirname, 'results');
const OUT_FILE = path.join(__dirname, 'index.html');

// Aggregate from per-repo result JSONs
const repos = [];
for (const file of fs.readdirSync(RESULTS_DIR).filter((f) => f.endsWith('.json'))) {
  const data = JSON.parse(fs.readFileSync(path.join(RESULTS_DIR, file), 'utf8'));
  const findings = data.findings || [];
  const filesSet = new Set(findings.map((f) => f.file));
  const slug = file.replace(/\.json$/, '').replace('_', '/');
  const top = findings.slice(0, 10).map((f) => ({
    rule: f.ruleId,
    sev: f.severity,
    file: f.file.split(/[\\/]/).slice(-3).join('/'),
    line: f.line,
    msg: f.message,
  }));
  // bench/report.md has the authoritative file-count (incl. clean files);
  // we approximate here from findings — fileCount on the score side-channel
  // doesn't survive JSON serialization, so use what's in score.fileCount if set
  const fileCount = data.score?.fileCount || filesSet.size;
  repos.push({
    slug,
    files: fileCount,
    findings: findings.length,
    perFile: fileCount ? +(findings.length / fileCount).toFixed(2) : 0,
    score: data.score?.value ?? 0,
    grade: data.score?.grade ?? 'F',
    byRule: data.score?.byRule || {},
    filesWithFindings: filesSet.size,
    top,
  });
}

repos.sort((a, b) => a.score - b.score);

const totalFiles = repos.reduce((s, r) => s + r.files, 0);
const totalFindings = repos.reduce((s, r) => s + r.findings, 0);
const avgScore = Math.round(repos.reduce((s, r) => s + r.score, 0) / repos.length);
const fpf = (totalFindings / totalFiles).toFixed(2);

const grades = { A: 0, B: 0, C: 0, D: 0, F: 0 };
for (const r of repos) grades[r.grade]++;

const totalByRule = {};
for (const r of repos) {
  for (const [k, n] of Object.entries(r.byRule)) {
    totalByRule[k] = (totalByRule[k] || 0) + n;
  }
}
const sortedRules = Object.entries(totalByRule)
  .map(([rule, n]) => ({ rule, n, pct: +(100 * n / totalFindings).toFixed(1) }))
  .sort((a, b) => b.n - a.n);

const payload = {
  meta: {
    generated: new Date().toISOString(),
    totalRepos: repos.length,
    totalFiles,
    totalFindings,
    avgScore,
    fpf,
  },
  grades,
  repos,
  sortedRules,
};

const html = render(payload);
fs.writeFileSync(OUT_FILE, html, 'utf8');
console.log(`wrote ${OUT_FILE} (${(html.length / 1024).toFixed(1)} KB)`);

// -------- HTML template --------

function render(data) {
  const dataJson = JSON.stringify(data);
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>slopfighter — anatomy of vibe-coded TypeScript (${data.repos.length} trending repos)</title>
<meta property="og:title" content="We scanned ${data.repos.length} trending AI coding repos. ${data.grades.F} got an F.">
<meta property="og:description" content="${data.meta.totalFindings.toLocaleString()} slop findings across ${data.meta.totalFiles.toLocaleString()} files. Average score: ${data.meta.avgScore}/100. Reproducible.">
<meta name="twitter:card" content="summary_large_image">
<style>
  :root {
    --bg: #0b0d12;
    --panel: #11141b;
    --panel2: #161a23;
    --line: #232733;
    --text: #e6e8ee;
    --dim: #8b94a8;
    --accent: #ffce4f;
    --green: #4ec9b0;
    --red: #ff6b6b;
    --orange: #ffa657;
    --blue: #79c0ff;
  }
  * { box-sizing: border-box; }
  html, body { margin: 0; padding: 0; background: var(--bg); color: var(--text); font: 15px/1.5 ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif; }
  code, .mono { font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; }
  a { color: var(--blue); text-decoration: none; }
  a:hover { text-decoration: underline; }
  .wrap { max-width: 1100px; margin: 0 auto; padding: 32px 24px 80px; }
  header { padding: 48px 0 32px; text-align: center; }
  h1 { font-size: clamp(28px, 4vw, 44px); font-weight: 800; letter-spacing: -0.02em; margin: 0 0 12px; }
  h1 .num { color: var(--accent); }
  h1 .red { color: var(--red); }
  .subhead { color: var(--dim); font-size: 17px; max-width: 720px; margin: 0 auto 28px; }
  .cta { display: inline-flex; align-items: center; gap: 8px; background: var(--panel); border: 1px solid var(--line); padding: 10px 16px; border-radius: 8px; font-family: ui-monospace, monospace; font-size: 14px; }
  .cta button { background: transparent; color: var(--dim); border: 0; cursor: pointer; font-family: inherit; font-size: 12px; padding: 4px 8px; border-radius: 4px; }
  .cta button:hover { background: var(--panel2); color: var(--text); }
  section { background: var(--panel); border: 1px solid var(--line); border-radius: 12px; padding: 24px; margin: 24px 0; }
  section h2 { margin: 0 0 18px; font-size: 18px; font-weight: 600; letter-spacing: -0.01em; }
  .stats { display: grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); gap: 16px; }
  .stat { background: var(--panel2); border-radius: 8px; padding: 16px; }
  .stat .label { color: var(--dim); font-size: 12px; text-transform: uppercase; letter-spacing: 0.05em; }
  .stat .value { font-size: 28px; font-weight: 700; margin-top: 4px; }
  .stat .value.accent { color: var(--accent); }
  .stat .value.red { color: var(--red); }
  .stat .value.green { color: var(--green); }
  table { width: 100%; border-collapse: collapse; font-size: 14px; }
  th { text-align: left; color: var(--dim); font-weight: 500; padding: 10px 8px; border-bottom: 1px solid var(--line); cursor: pointer; user-select: none; }
  th:hover { color: var(--text); }
  th.right, td.right { text-align: right; }
  th.center, td.center { text-align: center; }
  td { padding: 10px 8px; border-bottom: 1px solid var(--line); }
  tr.row { cursor: pointer; }
  tr.row:hover td { background: var(--panel2); }
  tr.detail { display: none; }
  tr.detail.open { display: table-row; }
  .detail-body { background: var(--bg); padding: 16px; border-radius: 8px; font-size: 13px; }
  .detail-body .f { font-family: ui-monospace, monospace; display: grid; grid-template-columns: auto auto 1fr; gap: 12px; align-items: baseline; padding: 4px 0; border-bottom: 1px solid var(--line); }
  .detail-body .f:last-child { border: 0; }
  .detail-body .sev { color: var(--dim); }
  .detail-body .sev.warn { color: var(--orange); }
  .detail-body .sev.error { color: var(--red); }
  .detail-body .sev.info { color: var(--blue); }
  .detail-body .rule { color: var(--dim); font-size: 11px; }
  .grade { display: inline-block; padding: 2px 8px; border-radius: 4px; font-size: 12px; font-weight: 600; min-width: 22px; text-align: center; }
  .grade.A { background: rgba(78, 201, 176, 0.15); color: var(--green); }
  .grade.B { background: rgba(78, 201, 176, 0.1); color: var(--green); }
  .grade.C { background: rgba(255, 206, 79, 0.15); color: var(--accent); }
  .grade.D { background: rgba(255, 166, 87, 0.15); color: var(--orange); }
  .grade.F { background: rgba(255, 107, 107, 0.15); color: var(--red); }
  .filter { width: 100%; background: var(--panel2); border: 1px solid var(--line); color: var(--text); padding: 10px 12px; border-radius: 8px; font-family: inherit; font-size: 14px; margin-bottom: 12px; }
  .filter:focus { outline: none; border-color: var(--blue); }
  .bars .bar { display: grid; grid-template-columns: 200px 1fr 70px; align-items: center; gap: 12px; padding: 6px 0; font-family: ui-monospace, monospace; font-size: 13px; }
  .bars .bar .track { background: var(--panel2); border-radius: 4px; height: 12px; overflow: hidden; }
  .bars .bar .fill { background: var(--accent); height: 100%; }
  .bars .bar .num { color: var(--dim); text-align: right; font-size: 12px; }
  .grades { display: grid; grid-template-columns: repeat(5, 1fr); gap: 12px; }
  .grades .g { background: var(--panel2); padding: 16px 12px; border-radius: 8px; text-align: center; }
  .grades .g .label { font-size: 18px; font-weight: 700; margin-bottom: 4px; }
  .grades .g .count { font-size: 24px; font-weight: 800; }
  .grades .g.A .count { color: var(--green); }
  .grades .g.B .count { color: var(--green); }
  .grades .g.C .count { color: var(--accent); }
  .grades .g.D .count { color: var(--orange); }
  .grades .g.F .count { color: var(--red); }
  footer { padding: 32px 0 0; color: var(--dim); font-size: 13px; text-align: center; border-top: 1px solid var(--line); margin-top: 32px; }
  footer a { color: var(--dim); }
  .hint { color: var(--dim); font-size: 12px; margin-top: 8px; }
</style>
</head>
<body>
<div class="wrap">

<header>
  <h1>We scanned <span class="num">${data.repos.length}</span> trending AI coding repos.<br><span class="red">${data.grades.F}</span> got an F.</h1>
  <p class="subhead">Every TypeScript repo created in the last 3 months that gained 4k+ stars. ${data.meta.totalFindings.toLocaleString()} structural slop findings across ${data.meta.totalFiles.toLocaleString()} files. Average score: <strong>${data.meta.avgScore}/100</strong>.</p>
  <div class="cta">
    <span class="mono">npx slopfighter scan .</span>
    <button onclick="navigator.clipboard.writeText('npx slopfighter scan .');this.textContent='copied';setTimeout(()=>this.textContent='copy',1500)">copy</button>
  </div>
</header>

<section>
  <h2>The numbers</h2>
  <div class="stats">
    <div class="stat"><div class="label">Repos scanned</div><div class="value">${data.repos.length}</div></div>
    <div class="stat"><div class="label">Files</div><div class="value">${data.meta.totalFiles.toLocaleString()}</div></div>
    <div class="stat"><div class="label">Findings</div><div class="value accent">${data.meta.totalFindings.toLocaleString()}</div></div>
    <div class="stat"><div class="label">Per file (avg)</div><div class="value">${data.meta.fpf}</div></div>
    <div class="stat"><div class="label">Average score</div><div class="value red">${data.meta.avgScore}/100</div></div>
  </div>
</section>

<section>
  <h2>Grade distribution</h2>
  <div class="grades">
    ${['A','B','C','D','F'].map((g) => `<div class="g ${g}"><div class="label">${g}</div><div class="count">${data.grades[g]}</div></div>`).join('')}
  </div>
  <p class="hint">A: 90+ &middot; B: 75-89 &middot; C: 60-74 &middot; D: 40-59 &middot; F: &lt;40. Score = <code>100 &times; exp(-perFilePenalty / 3)</code>, normalized per-file so big clean repos aren't punished by volume.</p>
</section>

<section>
  <h2>Findings by rule (across all repos)</h2>
  <div class="bars">
    ${data.sortedRules.map((r) => {
      const max = data.sortedRules[0].n;
      const width = ((r.n / max) * 100).toFixed(1);
      return `<div class="bar"><div>${r.rule}</div><div class="track"><div class="fill" style="width:${width}%"></div></div><div class="num">${r.n.toLocaleString()} &middot; ${r.pct}%</div></div>`;
    }).join('')}
  </div>
  <p class="hint">Top three rules account for <strong>${(data.sortedRules.slice(0,3).reduce((s,r)=>s+r.pct,0)).toFixed(1)}%</strong> of all findings.</p>
</section>

<section>
  <h2>Per-repo results <span style="color:var(--dim);font-weight:400;font-size:13px">click a row to see top findings</span></h2>
  <input class="filter" placeholder="Filter by name…" id="filter">
  <table id="t">
    <thead>
      <tr>
        <th>Repo</th>
        <th class="right" data-sort="files">Files</th>
        <th class="right" data-sort="findings">Findings</th>
        <th class="right" data-sort="perFile">/file</th>
        <th class="right" data-sort="score">Score</th>
        <th class="center">Grade</th>
      </tr>
    </thead>
    <tbody id="rows"></tbody>
  </table>
</section>

<footer>
  Reproducible: <code>node bench/run.mjs</code> &middot; data generated ${data.meta.generated.slice(0, 10)} &middot;
  <a href="https://github.com/wemdio2/slopfighter">GitHub</a> &middot;
  <a href="https://www.npmjs.com/package/slopfighter">npm</a> &middot;
  MIT
</footer>

</div>

<script>
const DATA = ${dataJson};
const $rows = document.getElementById('rows');
const $filter = document.getElementById('filter');
let sortKey = 'score';
let sortDir = 1;

function render() {
  const q = $filter.value.toLowerCase();
  let rows = DATA.repos.filter((r) => r.slug.toLowerCase().includes(q));
  rows.sort((a, b) => (a[sortKey] - b[sortKey]) * sortDir);
  $rows.innerHTML = rows.map((r, i) => {
    const detail = r.top.map((f) => \`<div class="f"><span class="sev \${f.sev}">\${f.sev}</span><span>\${f.file}:\${f.line}</span><div><span>\${escape(f.msg)}</span> <span class="rule">(\${f.rule})</span></div></div>\`).join('');
    return \`
      <tr class="row" data-i="\${i}">
        <td><a href="https://github.com/\${r.slug}" target="_blank" class="mono">\${r.slug}</a></td>
        <td class="right">\${r.files.toLocaleString()}</td>
        <td class="right">\${r.findings.toLocaleString()}</td>
        <td class="right">\${r.perFile}</td>
        <td class="right">\${r.score}</td>
        <td class="center"><span class="grade \${r.grade}">\${r.grade}</span></td>
      </tr>
      <tr class="detail" data-i="\${i}"><td colspan="6"><div class="detail-body">\${detail || '<em>No findings — clean.</em>'}</div></td></tr>
    \`;
  }).join('');
  for (const tr of $rows.querySelectorAll('tr.row')) {
    tr.addEventListener('click', () => {
      const det = $rows.querySelector(\`tr.detail[data-i="\${tr.dataset.i}"]\`);
      det.classList.toggle('open');
    });
  }
}

function escape(s) { return String(s).replace(/[&<>"']/g, (c) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[c]); }

for (const th of document.querySelectorAll('th[data-sort]')) {
  th.addEventListener('click', () => {
    const k = th.dataset.sort;
    if (sortKey === k) sortDir *= -1; else { sortKey = k; sortDir = 1; }
    render();
  });
}
$filter.addEventListener('input', render);
render();
</script>
</body>
</html>
`;
}
