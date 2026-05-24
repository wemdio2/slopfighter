# slopfighter

[![ci](https://github.com/wemdio2/slopfighter/actions/workflows/ci.yml/badge.svg)](https://github.com/wemdio2/slopfighter/actions/workflows/ci.yml)
[![npm](https://img.shields.io/npm/v/slopfighter.svg)](https://www.npmjs.com/package/slopfighter)
[![downloads](https://img.shields.io/npm/dm/slopfighter.svg)](https://www.npmjs.com/package/slopfighter)
[![node](https://img.shields.io/node/v/slopfighter.svg)](https://www.npmjs.com/package/slopfighter)
[![license](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

**Anti-AI-slop refactor tool.** Detects the 18 structural bloat patterns LLMs love to generate. JS/TS, zero config, no API keys, no telemetry, runs locally in seconds.

```
npx slopfighter scan .
```

![slopfighter demo](./bench/demo.svg)

## Why this exists

We scanned **29 trending TypeScript repos** created between February and May 2026 — 32,473 files, 79,733 findings, 15 minutes.

- **Average score: 39/100 (F).** 17 of 29 repos failed.
- **78% of all slop is three patterns:** commented-out code blocks (31.8%), `async` functions with no `await` (25.5%), explicit `any` (21.0%).
- Worst offender: a 54k-star Claude orchestration repo at **4.93 findings per file**.
- Cleanest: a markdown-based skill repo with **0**.

Full report → [`bench/report.md`](bench/report.md) · Interactive visualization → [`bench/index.html`](bench/index.html) (open locally or enable GitHub Pages → `https://wemdio2.github.io/slopfighter/bench/`). Reproducible: `node bench/run.mjs && node bench/visualize.mjs`.

## Install

### As a CLI

```bash
npx slopfighter scan .                  # scan current dir
npx slopfighter scan src/foo.ts         # scan one file
npx slopfighter score . --json          # CI-friendly score only
npx slopfighter fix . --safe            # apply unambiguous auto-fixes
```

Exit code 0 if `score >= 60`, else 1 — so `npx slopfighter score .` works as a CI gate.

### As an AI agent skill

```bash
npx slopfighter install                 # auto-detect .claude/.cursor/AGENTS.md, install where present
npx slopfighter install --force         # install into all targets
npx slopfighter install --only claude   # only Claude Code skill
```

This drops a `SKILL.md` into `.claude/skills/slopfighter/`, a slash command into `.cursor/commands/slopfighter.md`, and a guarded section into `AGENTS.md`. After install, your agent runs slopfighter automatically after each edit batch and surfaces top findings.

### As a GitHub Action

Copy [`.github/workflows/slopfighter.yml`](.github/workflows/slopfighter.yml) into your repo. On every PR, a bot will comment with the score and top issues. Free for public repos.

## The rules

| Rule | Severity | Catches |
|---|---|---|
| `padding-comments` | warn | `// Get user name` over `getUserName()` |
| `useless-try-catch` | warn | `catch (e) { throw e }` or log-then-rethrow |
| `dead-imports` | warn | Imported names never referenced |
| `explicit-any` | warn | `: any` annotations |
| `future-proof-naming` | warn | `XManager`/`XHelper`/`XProvider` class with one method |
| `commented-out-code` | warn | 2+ consecutive lines of commented code |
| `unnecessary-async` | info | `async` function with no `await` |
| `trivial-arrow-wrapper` | info | `(x) => fn(x)` instead of `fn` |
| `redundant-await` | info | `return await x` outside try/catch |
| `return-undefined` | info | `return undefined` (= `return`) |
| `redundant-error-rethrow` | warn | `throw new Error(err.message)` (strips stack) |
| `excessive-jsdoc` | info | 6+ line JSDoc over a 1–3 line body |
| `over-defensive-null-check` | info | `x !== null && x !== undefined && x` |
| `always-true-conditional` | warn | `if (true)` / `if (x === x)` |
| `single-method-class` | info | Class with one `this`-free method |
| `else-after-return` | info | `else` after a returning `if` |
| `redundant-boolean-cast` | info | `!!x` / `Boolean(x)` in boolean context |
| `const-string-concat` | info | `"a" + "b"` (merge or use a template) |

Customize: `--rules a,b,c` (run only listed), `--ignore <substr>` (skip matching paths, repeatable).

## What this is NOT

- Not a security scanner. Use Semgrep/Snyk for that.
- Not a type checker. Use `tsc --noEmit`.
- Not a formatter. Use Prettier/Biome.
- Not a semantic analyzer. It won't tell you your code is wrong, only that it's bloated.

The rules are heuristic. False-positive rate is ~5–15% per rule depending on pattern. The point isn't perfection — it's reducing the structural noise that AI-generated code accumulates so reviewers can focus on logic.

## How it works (under the hood)

We parse files with TypeScript's compiler API into an AST, then walk the tree applying 18 rule functions. A few rules (e.g. `commented-out-code`) are line-based; the rest are structural. No type checker is loaded, which keeps it ~10–100× faster than type-aware linters at the cost of some precision.

Score: `100 * exp(-perFilePenalty / 3)`, where penalty weights `error: 5, warn: 2, info: 1`. Per-file normalization means a clean 2000-file repo isn't punished by volume.

## Bench

```bash
git clone <this-repo> && cd slopfighter && npm install
node bench/run.mjs
cat bench/report.md
```

Takes 15–30 min cold (clones 30 repos), 30 sec cached. Skip individual repos by editing `bench/repos.txt`.

## Contributing

PRs welcome — especially new rules. Each rule lives in `src/rules/<id>.mjs` and exports `{ id, severity, description, check(ctx) }`. Add 2+ positive and 2+ negative test cases to `test/unit-rules.mjs`. The full test suite is `npm test`.

Rule ideas we'd love but haven't built yet: `bloated-tests` (mocks without assertions), `magic-numbers`, `nested-ternary-pyramid`, Python/Go via tree-sitter, type-aware mode (`--strict`).

## License

MIT
