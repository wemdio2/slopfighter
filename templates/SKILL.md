---
name: slopfighter
description: Detect and clean AI-generated code slop (padding comments, useless try/catch, dead imports, explicit any, premature abstractions, commented-out code, unnecessary async, and more) in JS/TS code. Use after a set of edits or before committing.
---

# slopfighter

You are using **slopfighter**, an anti-AI-slop linter that catches the structural bloat patterns LLMs love to generate.

## When to run

- After completing a chunk of code generation (≥3 edits to one file, or any new file).
- Before staging changes for a commit.
- When the user says "clean this up", "remove the slop", "tighten this".
- Whenever the user explicitly invokes you.

## How to run

```
npx slopfighter scan <path>           # human-readable report
npx slopfighter score <path> --json   # just the score (0-100), useful in checks
npx slopfighter fix <path> --safe     # apply unambiguous fixes (e.g. drop padding comments)
```

Default to scanning the files you just touched, not the whole repo. For a fresh module, scan its directory.

## How to act on findings

1. **`warn` severity**: surface to the user with the rule id and a one-line fix suggestion. Don't silently rewrite — these need judgement.
2. **`info` severity**: mention briefly but don't make it the headline.
3. **fixable findings** (auto-fix safe): run `npx slopfighter fix <path> --safe` after confirming with user, then re-scan.
4. **score < 60**: treat as a fail. Don't hand the work back to the user as "done" — list the top 3 issues and ask whether to fix.

## What the rules mean (cheat-sheet)

| Rule | Why it matters |
|---|---|
| `padding-comments` | Comments restating the function name add noise, not info. |
| `useless-try-catch` | Logging-then-rethrowing spams; pure rethrow is dead code. |
| `dead-imports` | Unused imports = stale context; often a sign of half-finished refactor. |
| `explicit-any` | `any` defeats TS; either pick a real type or use `unknown`. |
| `future-proof-naming` | `XManager`/`XHelper` with one method is just a function. |
| `commented-out-code` | "Let me also try" leftovers — either remove or restore. |
| `unnecessary-async` | `async` with no `await` adds a microtask for nothing. |
| `trivial-arrow-wrapper` | `(x) => fn(x)` is just `fn`. |
| `redundant-await` | `return await x` outside try/catch is a wasted frame. |
| `return-undefined` | `return undefined` is bare `return`. |
| `redundant-error-rethrow` | `throw new Error(e.message)` destroys the stack. |
| `excessive-jsdoc` | 8-line JSDoc on a 2-line body is padding. |
| `over-defensive-null-check` | Triple-checking the same var is one check. |
| `always-true-conditional` | `if (true)` / `if (x === x)` is dead branching. |
| `single-method-class` | One method that doesn't use `this` → make it a function. |

## Output format

When you report findings to the user, prefer this shape:

```
slopfighter scan: <score>/100 (<grade>) — N findings in M files

Top issues:
  src/foo.ts:42  [warn] padding-comments: "Get user name" just restates "getUserName"
  src/bar.ts:18  [warn] explicit-any: avoid `any` — pick a real type
  ...
```

Don't dump the full report verbatim — summarize, then offer "want me to fix the auto-fixable ones?"
