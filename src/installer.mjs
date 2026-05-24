// Installs the slopfighter skill into the project's AI-tool surfaces.
// Defaults to all known targets present in the project; --only / --skip filter.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const TEMPLATE_DIR = path.join(__dirname, '..', 'templates');

const TARGETS = {
  claude: {
    label: 'Claude Code',
    detect: (root) => fs.existsSync(path.join(root, '.claude')),
    install(root) {
      const dest = path.join(root, '.claude', 'skills', 'slopfighter', 'SKILL.md');
      writeFile(dest, readTemplate('SKILL.md'));
      return dest;
    },
  },
  cursor: {
    label: 'Cursor',
    detect: (root) => fs.existsSync(path.join(root, '.cursor')),
    install(root) {
      const dest = path.join(root, '.cursor', 'commands', 'slopfighter.md');
      writeFile(dest, readTemplate('cursor-command.md'));
      return dest;
    },
  },
  agents: {
    label: 'AGENTS.md',
    detect: (root) => fs.existsSync(path.join(root, 'AGENTS.md')) ||
                      fs.existsSync(path.join(root, 'CLAUDE.md')) ||
                      fs.existsSync(path.join(root, '.cursorrules')),
    install(root) {
      const dest = path.join(root, 'AGENTS.md');
      const snippet = readTemplate('agents-section.md');
      upsertSection(dest, snippet);
      return dest;
    },
  },
};

export async function runInstall(root, opts = {}) {
  const only = opts.only ? new Set(opts.only.split(',')) : null;
  const skip = opts.skip ? new Set(opts.skip.split(',')) : new Set();
  const force = !!opts.force;

  const planned = [];
  for (const [key, t] of Object.entries(TARGETS)) {
    if (only && !only.has(key)) continue;
    if (skip.has(key)) continue;
    const present = t.detect(root);
    if (!present && !force && !only) continue;
    planned.push({ key, target: t, present });
  }

  if (planned.length === 0) {
    return {
      installed: [],
      message:
        'No AI-tool config found in this project. Pass `--force` to install into all targets, or `--only claude,cursor,agents`.',
    };
  }

  const installed = [];
  for (const p of planned) {
    const file = p.target.install(root);
    installed.push({ key: p.key, label: p.target.label, file });
  }
  return { installed };
}

function readTemplate(name) {
  return fs.readFileSync(path.join(TEMPLATE_DIR, name), 'utf8');
}

function writeFile(dest, content) {
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.writeFileSync(dest, content, 'utf8');
}

const SECTION_START = '<!-- slopfighter:start';
const SECTION_END = '<!-- slopfighter:end -->';
function upsertSection(file, snippet) {
  const existing = fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : '';
  if (existing.includes(SECTION_START)) {
    const startIdx = existing.indexOf(SECTION_START);
    const endIdx = existing.indexOf(SECTION_END, startIdx);
    if (endIdx === -1) {
      // malformed — append
      fs.writeFileSync(file, existing.trimEnd() + '\n\n' + snippet.trim() + '\n', 'utf8');
      return;
    }
    const before = existing.slice(0, startIdx);
    const after = existing.slice(endIdx + SECTION_END.length);
    fs.writeFileSync(file, (before + snippet.trim() + after).replace(/\n{3,}/g, '\n\n'), 'utf8');
  } else {
    const sep = existing.length === 0 || existing.endsWith('\n\n') ? '' : '\n\n';
    fs.writeFileSync(file, existing + sep + snippet.trim() + '\n', 'utf8');
  }
}
