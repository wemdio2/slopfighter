import fs from 'node:fs';

export async function applyFixes(findings) {
  const byFile = new Map();
  let skipped = 0;
  for (const f of findings) {
    if (!f.fixable || !f.fix) { skipped++; continue; }
    if (!byFile.has(f.file)) byFile.set(f.file, []);
    byFile.get(f.file).push(f);
  }

  let fixed = 0;
  for (const [file, items] of byFile) {
    const source = fs.readFileSync(file, 'utf8');
    // apply from bottom to top to keep offsets stable
    const sorted = items
      .filter((i) => i.fix && Number.isInteger(i.fix.start) && Number.isInteger(i.fix.end))
      .sort((a, b) => b.fix.start - a.fix.start);
    let out = source;
    for (const item of sorted) {
      out = out.slice(0, item.fix.start) + (item.fix.replacement || '') + out.slice(item.fix.end);
      fixed++;
    }
    if (out !== source) fs.writeFileSync(file, out, 'utf8');
  }

  return { fixed, files: byFile.size, skipped };
}
