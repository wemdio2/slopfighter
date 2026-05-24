# /slopfighter

Run `npx slopfighter scan .` on the current workspace. Summarize the score, the top 3 findings (rule id + file:line + one-line fix), and ask whether to auto-fix.

If the user says yes to auto-fix, run `npx slopfighter fix . --safe` then re-scan. Surface anything that's still warn-level after the fix pass.

Rules cheat-sheet:

- `padding-comments` — comments restating the function name
- `useless-try-catch` — rethrow-only or log-then-rethrow
- `dead-imports` — unused imports
- `explicit-any` — `any` annotations
- `future-proof-naming` — `XManager`/`XHelper` with one method
- `commented-out-code` — old code blocks left in
- `unnecessary-async` — `async` with no `await`
- `trivial-arrow-wrapper` — `(x) => fn(x)` instead of `fn`
- `redundant-await` — `return await x` outside try
- `return-undefined` — `return undefined` instead of bare `return`
- `redundant-error-rethrow` — `throw new Error(e.message)`
- `excessive-jsdoc` — JSDoc longer than the body
- `over-defensive-null-check` — triple null-checks
- `always-true-conditional` — `if (true)` / `if (x === x)`
- `single-method-class` — single-method class without `this`
