// Per-rule unit tests with inline TS sources. Proves each detector fires on
// at least one positive case and stays quiet on a negative case.
import ts from 'typescript';
import { allRules } from '../src/rules/index.mjs';

function scanInline(source, ruleId, ext = '.ts') {
  const rule = allRules.find((r) => r.id === ruleId);
  if (!rule) throw new Error(`no such rule: ${ruleId}`);
  const scriptKind =
    ext === '.tsx' ? ts.ScriptKind.TSX :
    ext === '.ts' ? ts.ScriptKind.TS : ts.ScriptKind.JS;
  const sf = ts.createSourceFile(`inline${ext}`, source, ts.ScriptTarget.Latest, true, scriptKind);
  const ctx = { file: `inline${ext}`, source, lines: source.split('\n'), sourceFile: sf, ts };
  return rule.check(ctx) || [];
}

const cases = [
  // padding-comments
  { rule: 'padding-comments', positive: '// Get user name\nfunction getUserName() { return null; }' },
  { rule: 'padding-comments', positive: '// This function returns the user name\nfunction getUserName() { return null; }' },
  { rule: 'padding-comments', positive: '// Make user\nconst makeUser = () => ({});' }, // arrow-function const
  { rule: 'padding-comments', negative: '// Cache invalidation here is deliberately weak per infra constraints.\nfunction getUserName() { return null; }' },
  { rule: 'padding-comments', negative: 'function getUserName() { return null; }' },
  // regression: section-label comment over a non-function const should NOT fire
  { rule: 'padding-comments', negative: '// TypeScript\nconst Typescript = { ext: ".ts" };' },
  { rule: 'padding-comments', negative: '// Python\nconst Python = { ext: ".py" };' },

  // useless-try-catch
  { rule: 'useless-try-catch', positive: 'function f() { try { doIt(); } catch (e) { throw e; } }' },
  { rule: 'useless-try-catch', positive: 'function f() { try { doIt(); } catch (e) { console.error(e); throw e; } }' },
  { rule: 'useless-try-catch', negative: 'function f() { try { doIt(); } catch (e) { recover(e); } }' },
  { rule: 'useless-try-catch', negative: 'function f() { try { doIt(); } catch (e) { throw new MyError("ctx", { cause: e }); } }' },

  // dead-imports
  { rule: 'dead-imports', positive: 'import { unused } from "x";\nexport const a = 1;' },
  { rule: 'dead-imports', negative: 'import { used } from "x";\nexport const a = used;' },
  { rule: 'dead-imports', negative: 'import "side-effect-only";' },

  // explicit-any
  { rule: 'explicit-any', positive: 'export function f(x: any) { return x; }' },
  { rule: 'explicit-any', negative: 'export function f(x: unknown) { return x; }' },
  { rule: 'explicit-any', negative: 'export function f(x: any) { return x; } // eslint-disable-line' },

  // future-proof-naming
  { rule: 'future-proof-naming', positive: 'class UserManager { get(id: string) { return id; } }' },
  { rule: 'future-proof-naming', positive: 'class StringHelper { static r(s: string) { return s; } }' },
  { rule: 'future-proof-naming', negative: 'class User { constructor(public id: string) {} name() { return this.id; } age() { return 0; } }' },
  { rule: 'future-proof-naming', negative: 'class FooManager { a() {} b() {} }' }, // 2+ methods OK
  // regression: polymorphic subclasses are intentionally classes
  { rule: 'future-proof-naming', negative: 'class HttpHandler extends BaseHandler { run() { return 1; } }' },
  { rule: 'future-proof-naming', negative: 'class CacheProvider implements IProvider { get() { return null; } }' },

  // always-true-conditional
  { rule: 'always-true-conditional', positive: 'function f() { if (true) { return 1; } }' },
  { rule: 'always-true-conditional', positive: 'function f(x: number) { if (x === x) { return 1; } }' },
  { rule: 'always-true-conditional', negative: 'function f(x: number) { if (x > 0) { return 1; } }' },
  // legitimate event loop should NOT fire
  { rule: 'always-true-conditional', negative: 'function f() { while (true) { if (done()) break; } }' },

  // excessive-jsdoc
  {
    rule: 'excessive-jsdoc',
    positive:
      '/**\n * Adds two numbers.\n *\n * @param a first\n * @param b second\n * @returns sum\n */\nfunction add(a: number, b: number) { return a + b; }',
  },
  {
    rule: 'excessive-jsdoc',
    negative:
      '/** Adds two numbers. */\nfunction add(a: number, b: number) { return a + b; }',
  },

  // redundant-error-rethrow
  { rule: 'redundant-error-rethrow', positive: 'function f(e: Error) { throw new Error(e.message); }' },
  { rule: 'redundant-error-rethrow', positive: 'function f(e: unknown) { throw new Error(String(e)); }' },
  { rule: 'redundant-error-rethrow', negative: 'function f(e: Error) { throw new MyError("wrap", { cause: e }); }' },
  { rule: 'redundant-error-rethrow', negative: 'function f() { throw new Error("hard-coded"); }' },

  // single-method-class
  { rule: 'single-method-class', positive: 'class Foo { bar(x: number) { return x + 1; } }' },
  { rule: 'single-method-class', negative: 'class Foo { x = 1; bar() { return this.x; } }' },
  { rule: 'single-method-class', negative: 'class Foo { bar() { return this; } }' }, // uses this
  // regression: subclasses must not flag — they need to be classes for polymorphism
  { rule: 'single-method-class', negative: 'class BertForMaskedLM extends PreTrainedModel { forward(x: any) { return x; } }' },
  { rule: 'single-method-class', negative: 'class MyProvider implements IProvider { get(x: string) { return x; } }' },

  // over-defensive-null-check
  { rule: 'over-defensive-null-check', positive: 'function f(x: string | null | undefined) { if (x !== null && x !== undefined && x) return x; }' },
  { rule: 'over-defensive-null-check', negative: 'function f(x: string | null) { if (x != null) return x; }' },

  // commented-out-code
  { rule: 'commented-out-code', positive: 'function f() {\n  // const x = 1;\n  // const y = 2;\n  return null;\n}' },
  { rule: 'commented-out-code', positive: '// import x from "y";\n// import z from "w";\nexport const a = 1;' },
  { rule: 'commented-out-code', negative: '// This is a normal comment\n// explaining the intent\nexport const a = 1;' },
  { rule: 'commented-out-code', negative: '// single-line comment with = sign here\nexport const a = 1;' },

  // unnecessary-async
  { rule: 'unnecessary-async', positive: 'async function f() { return 1; }' },
  { rule: 'unnecessary-async', positive: 'const f = async (x: number) => x + 1;' },
  { rule: 'unnecessary-async', negative: 'async function f() { return await fetch("x"); }' },
  { rule: 'unnecessary-async', negative: 'async function f() { for await (const x of iter()) {} }' },
  { rule: 'unnecessary-async', negative: 'function f() { return 1; }' }, // not async

  // trivial-arrow-wrapper
  { rule: 'trivial-arrow-wrapper', positive: 'const m = arr.map((x: number) => fn(x));' },
  { rule: 'trivial-arrow-wrapper', positive: 'const m = arr.map((x: number, y: number) => fn(x, y));' },
  { rule: 'trivial-arrow-wrapper', negative: 'const m = arr.map((x: number) => fn(x, 2));' },
  { rule: 'trivial-arrow-wrapper', negative: 'const m = arr.map(fn);' },
  { rule: 'trivial-arrow-wrapper', negative: 'const m = arr.map((x: number) => x + 1);' },

  // redundant-await
  { rule: 'redundant-await', positive: 'async function f() { return await x(); }' },
  { rule: 'redundant-await', negative: 'async function f() { try { return await x(); } catch (e) { return null; } }' },
  { rule: 'redundant-await', negative: 'async function f() { const r = await x(); return r; }' },

  // return-undefined
  { rule: 'return-undefined', positive: 'function f() { return undefined; }' },
  { rule: 'return-undefined', positive: 'function f() { return void 0; }' },
  { rule: 'return-undefined', negative: 'function f() { return; }' },
  { rule: 'return-undefined', negative: 'function f() { return null; }' },

  // else-after-return
  { rule: 'else-after-return', positive: 'function f(x: number) { if (x > 0) { return 1; } else { return 2; } }' },
  { rule: 'else-after-return', positive: 'function f(x: number) { if (x > 0) { throw new Error("bad"); } else { return 2; } }' },
  { rule: 'else-after-return', negative: 'function f(x: number) { if (x > 0) { doIt(); } else { return 2; } }' },
  { rule: 'else-after-return', negative: 'function f(x: number) { if (x > 0) return 1; return 2; }' },

  // redundant-boolean-cast
  { rule: 'redundant-boolean-cast', positive: 'function f(x: any) { if (!!x) return 1; }' },
  { rule: 'redundant-boolean-cast', positive: 'function f(x: any) { while (Boolean(x)) break; }' },
  { rule: 'redundant-boolean-cast', positive: 'function f(x: any) { const y = !!x ? 1 : 2; }' },
  { rule: 'redundant-boolean-cast', negative: 'function f(x: any) { if (x) return 1; }' },
  { rule: 'redundant-boolean-cast', negative: 'function f(x: any) { const b: boolean = Boolean(x); }' }, // outside boolean ctx — ok

  // const-string-concat
  { rule: 'const-string-concat', positive: 'const s = "hello " + "world";' },
  { rule: 'const-string-concat', negative: 'const s = "hello " + name;' },
  { rule: 'const-string-concat', negative: 'const s = `hello ${name}`;' },
];

let pass = 0, fail = 0;
const failures = [];

for (const c of cases) {
  const positive = c.positive != null;
  const source = positive ? c.positive : c.negative;
  const findings = scanInline(source, c.rule);
  const fired = findings.length > 0;
  const ok = positive ? fired : !fired;
  if (ok) {
    pass++;
  } else {
    fail++;
    failures.push({
      rule: c.rule,
      expected: positive ? 'fire' : 'silent',
      got: fired ? `fired ${findings.length}x` : 'silent',
      source: source.slice(0, 80) + (source.length > 80 ? '…' : ''),
      findings: findings.map((f) => f.message),
    });
  }
}

if (failures.length) {
  console.log(`unit-rules: ${pass} passed, ${fail} failed`);
  for (const f of failures) {
    console.log(`  FAIL  [${f.rule}] expected ${f.expected}, got ${f.got}`);
    console.log(`        src: ${f.source}`);
    if (f.findings.length) console.log(`        findings: ${f.findings.join(' | ')}`);
  }
  process.exit(1);
} else {
  console.log(`unit-rules: ${pass} passed`);
}
