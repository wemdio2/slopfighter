import path from 'node:path';
import pc from 'picocolors';

const SEVERITY_COLOR = {
  error: pc.red,
  warn: pc.yellow,
  info: pc.cyan,
};

const GRADE_COLOR = {
  A: pc.green,
  B: pc.green,
  C: pc.yellow,
  D: pc.yellow,
  F: pc.red,
};

export function renderReport(findings, score, target) {
  if (findings.length === 0) {
    return `${pc.green('✓')} No slop detected in ${pc.dim(target)}\n` + renderScore(score) + '\n';
  }

  const byFile = groupByFile(findings);
  let out = '';
  for (const [file, items] of byFile) {
    const rel = path.relative(process.cwd(), file) || file;
    out += `\n${pc.bold(rel)}\n`;
    for (const f of items) {
      const sev = (SEVERITY_COLOR[f.severity] || pc.white)(f.severity.padEnd(5));
      const loc = pc.dim(`${f.line}:${f.column}`);
      const ruleId = pc.dim(`(${f.ruleId})`);
      const fixable = f.fixable ? pc.green(' [fixable]') : '';
      out += `  ${loc}  ${sev}  ${f.message}  ${ruleId}${fixable}\n`;
    }
  }
  out += '\n' + renderScore(score) + '\n';
  return out;
}

export function renderScore(score) {
  const color = GRADE_COLOR[score.grade] || pc.white;
  const bar = renderBar(score.value);
  const breakdown =
    `errors: ${pc.red(score.counts.error || 0)}  ` +
    `warns: ${pc.yellow(score.counts.warn || 0)}  ` +
    `infos: ${pc.cyan(score.counts.info || 0)}`;
  return `${pc.bold('slop score:')} ${color(`${score.value}/100 (${score.grade})`)} ${bar}\n${breakdown}`;
}

function renderBar(value) {
  const width = 20;
  const filled = Math.round((value / 100) * width);
  return pc.dim('[') + pc.green('█'.repeat(filled)) + pc.dim('░'.repeat(width - filled) + ']');
}

function groupByFile(findings) {
  const m = new Map();
  for (const f of findings) {
    if (!m.has(f.file)) m.set(f.file, []);
    m.get(f.file).push(f);
  }
  for (const arr of m.values()) {
    arr.sort((a, b) => a.line - b.line || a.column - b.column);
  }
  return m;
}
