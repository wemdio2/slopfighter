const WEIGHTS = { error: 5, warn: 2, info: 1 };

// Score is computed on penalty-per-file so a clean 2000-file repo isn't
// punished by sheer volume. Single-file scans use the penalty directly.
export function computeScore(findings, options = {}) {
  const counts = { error: 0, warn: 0, info: 0 };
  const byRule = {};
  const files = new Set();
  for (const f of findings) {
    counts[f.severity] = (counts[f.severity] || 0) + 1;
    byRule[f.ruleId] = (byRule[f.ruleId] || 0) + 1;
    if (f.file) files.add(f.file);
  }

  const penalty =
    counts.error * WEIGHTS.error +
    counts.warn * WEIGHTS.warn +
    counts.info * WEIGHTS.info;

  // normalize: prefer caller-supplied fileCount, else side-channel on the
  // findings array (set by scanner), else dirty-file count, else 1.
  const fileCount =
    options.fileCount || findings.fileCount || Math.max(files.size, 1);
  const perFilePenalty = penalty / fileCount;
  // tuned against real codebases: hallmark ~0.5 fpf → B, cline ~1.4 → D,
  // continue ~3.0 → F. Divisor 3.0 keeps clean codebases in A/B range.
  const value = Math.max(0, Math.round(100 * Math.exp(-perFilePenalty / 3)));
  let grade;
  if (value >= 90) grade = 'A';
  else if (value >= 75) grade = 'B';
  else if (value >= 60) grade = 'C';
  else if (value >= 40) grade = 'D';
  else grade = 'F';

  return {
    value,
    grade,
    total: findings.length,
    counts,
    byRule,
    fileCount,
    perFilePenalty: +perFilePenalty.toFixed(2),
  };
}
