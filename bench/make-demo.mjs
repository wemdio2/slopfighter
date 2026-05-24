// Generates bench/demo.svg — a terminal-styled animated SVG of a real
// slopfighter scan, embeddable directly in the README and X-thread.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(__dirname, 'demo.svg');

// Tokens (text, color). null color = default body color.
const D = { warn: '#d29922', info: '#58a6ff', err: '#f85149', dim: '#6e7681',
            prompt: '#7ee787', cmd: '#d2a8ff', bold: '#f0f6fc', ok: '#3fb950',
            body: '#c9d1d9' };

const lines = [
  [[D.prompt, '$ '], [D.cmd, 'npx slopfighter scan ./src']],
  [], // blank
  [[D.bold, 'src/components/UserList.tsx']],
  [[D.dim, '  18:1  '], [D.warn, 'warn  '], [D.body, 'Comment "Get user name" just restates "getUserName"  '], [D.dim, '(padding-comments)'], [D.ok, ' [fixable]']],
  [[D.dim, '  26:14 '], [D.warn, 'warn  '], [D.body, 'avoid `any` — pick a real type or use `unknown`              '], [D.dim, '(explicit-any)']],
  [[D.dim, '  41:5  '], [D.info, 'info  '], [D.body, 'async "fetchUser" has no `await` — drop async or add it       '], [D.dim, '(unnecessary-async)']],
  [],
  [[D.bold, 'src/utils/parse.ts']],
  [[D.dim, '  12:3  '], [D.warn, 'warn  '], [D.body, 'catch only rethrows e — drop the try/catch entirely           '], [D.dim, '(useless-try-catch)']],
  [[D.dim, '  88:9  '], [D.warn, 'warn  '], [D.body, '3-line commented-out code block — remove or restore            '], [D.dim, '(commented-out-code)']],
  [[D.dim, '  120:10'], [D.info, 'info  '], [D.body, 'drop the explicit `undefined` — bare `return;` is equivalent  '], [D.dim, '(return-undefined)'], [D.ok, ' [fixable]']],
  [],
  [[D.bold, 'slop score: '], [D.err, '39/100 (F) '], [D.dim, '[█████████░░░░░░░░░░░░░░░]']],
  [[D.body, 'errors: 0  warns: 4  infos: 2     ('], [D.dim, 'sample of 12,843 findings across 29 trending AI repos'], [D.body, ')']],
];

const LH = 20;          // line-height
const PAD_X = 24;
const PAD_TOP = 52;
const W = 760;
const H = PAD_TOP + lines.length * LH + 24;
const PER_LINE = 0.45;  // sec between lines appearing
const TOTAL = lines.length * PER_LINE + 3;  // pause at end before loop

function tspan(color, text) {
  return `<tspan fill="${color}" xml:space="preserve">${esc(text)}</tspan>`;
}
function esc(s) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

const lineEls = lines.map((parts, i) => {
  const y = PAD_TOP + i * LH;
  const inner = parts.length
    ? parts.map(([c, t]) => tspan(c, t)).join('')
    : '';
  const begin = (i * PER_LINE).toFixed(2);
  return `
    <text x="${PAD_X}" y="${y}" opacity="0">
      ${inner}
      <animate attributeName="opacity" from="0" to="1" begin="${begin}s" dur="0.3s" fill="freeze"/>
      <animate attributeName="opacity" from="1" to="1" begin="${TOTAL - 0.1}s" dur="0.1s" fill="freeze"/>
      <animate attributeName="opacity" from="1" to="0" begin="${TOTAL}s" dur="0.01s" fill="freeze"/>
    </text>`;
}).join('');

// reset animations loop via a global timer trigger
const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" font-family="ui-monospace, SFMono-Regular, Menlo, Consolas, monospace" font-size="13">
  <style>text { dominant-baseline: middle; }</style>
  <!-- window -->
  <rect x="0" y="0" width="${W}" height="${H}" rx="10" fill="#0d1117"/>
  <rect x="0" y="0" width="${W}" height="32" rx="10" fill="#161b22"/>
  <rect x="0" y="22" width="${W}" height="10" fill="#161b22"/>
  <circle cx="18" cy="16" r="6" fill="#ff5f57"/>
  <circle cx="38" cy="16" r="6" fill="#febc2e"/>
  <circle cx="58" cy="16" r="6" fill="#28c840"/>
  <text x="${W/2}" y="16" text-anchor="middle" fill="#7d8590" font-size="11">slopfighter — zsh — ${lines.length} lines</text>
  <!-- looping driver: every TOTAL+0.5s, all the freeze-locked animations reset visually via repeatCount -->
  <g>
    ${lineEls}
    <animateTransform attributeName="transform" type="translate" from="0 0" to="0 0" dur="${(TOTAL + 0.5).toFixed(2)}s" repeatCount="indefinite" begin="0s"/>
  </g>
</svg>
`;

// SMIL `freeze` doesn't reset on loop; the cleanest reliable loop is to
// fall back to begin attributes referencing a chained event. Easiest fix:
// use repeating begin values via "0s;<TOTAL+0.5>s;<2*(TOTAL+0.5)>s;...".
// Let's do that instead for simplicity.
const CYCLES = 6;
function cycledBegin(base) {
  const cycle = TOTAL + 0.5;
  return Array.from({ length: CYCLES }, (_, k) => (base + k * cycle).toFixed(2) + 's').join(';');
}
const lineEls2 = lines.map((parts, i) => {
  const y = PAD_TOP + i * LH;
  const inner = parts.length
    ? parts.map(([c, t]) => tspan(c, t)).join('')
    : '';
  const inBegin = cycledBegin(i * PER_LINE);
  const outBegin = cycledBegin(TOTAL);
  return `
    <text x="${PAD_X}" y="${y}" opacity="0">
      ${inner}
      <animate attributeName="opacity" values="0;1" begin="${inBegin}" dur="0.3s" fill="freeze"/>
      <animate attributeName="opacity" values="1;0" begin="${outBegin}" dur="0.2s" fill="freeze"/>
    </text>`;
}).join('');

const finalSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" font-family="ui-monospace, SFMono-Regular, Menlo, Consolas, monospace" font-size="13">
  <style>text { dominant-baseline: middle; }</style>
  <rect x="0" y="0" width="${W}" height="${H}" rx="10" fill="#0d1117"/>
  <rect x="0" y="0" width="${W}" height="32" rx="10" fill="#161b22"/>
  <rect x="0" y="22" width="${W}" height="10" fill="#161b22"/>
  <circle cx="18" cy="16" r="6" fill="#ff5f57"/>
  <circle cx="38" cy="16" r="6" fill="#febc2e"/>
  <circle cx="58" cy="16" r="6" fill="#28c840"/>
  <text x="${W/2}" y="16" text-anchor="middle" fill="#7d8590" font-size="11">slopfighter — anti-AI-slop scan</text>
  ${lineEls2}
</svg>
`;

fs.writeFileSync(OUT, finalSvg, 'utf8');
console.log(`wrote ${OUT} (${Math.round(finalSvg.length / 1024 * 10) / 10} KB)`);
