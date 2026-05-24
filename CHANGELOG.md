# Changelog

## 0.1.0 — initial release

First public release. 18 rules across 4 categories, scored 0–100 (A–F).

### Rules
- **Bloat**: `padding-comments`, `excessive-jsdoc`, `commented-out-code`
- **Wasted runtime**: `unnecessary-async`, `redundant-await`, `useless-try-catch`, `redundant-error-rethrow`, `redundant-boolean-cast`, `trivial-arrow-wrapper`, `return-undefined`, `const-string-concat`
- **Premature abstraction**: `future-proof-naming`, `single-method-class`
- **Type laziness / dead code**: `explicit-any`, `dead-imports`, `over-defensive-null-check`, `always-true-conditional`, `else-after-return`

### CLI
- `slopfighter scan [path]` — human or JSON report
- `slopfighter score [path]` — number only, CI-friendly
- `slopfighter fix [path] --safe` — auto-fix unambiguous findings
- `slopfighter install` — drop a skill into Claude Code / Cursor / AGENTS.md

### Tested
- 103 unit + integration tests
- Validated against 30 trending TypeScript repos created Feb–May 2026
- Cross-platform: Linux, macOS, Windows; Node 18/20/22

### Known limitations
- JS/TS only (Python, Go, Rust on the roadmap via tree-sitter)
- No type-aware mode — `--strict` flag is reserved for future opt-in type-checker path
- Some rules use heuristics, not full semantic analysis; FP-rate ~5–15% per rule
