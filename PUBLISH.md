# Publication checklist

Manual steps for the human. Everything in the repo is ready; these are the actions only you can take (account creation, secrets, hitting publish buttons).

## 0. Pre-flight

```bash
# from slopfighter/
npm test            # should print "ALL GREEN"
npm pack --dry-run  # confirm the right files are in the tarball
```

The pack output should include `bin/`, `src/`, `templates/`, `README.md`, `CHANGELOG.md`, `LICENSE`, `package.json` — and nothing else (no `bench/results/`, no `node_modules/`, no `test/`).

## 1. Pick a final name

`slopfighter` is available on npm as of the last check — but verify:
```bash
npm view slopfighter
```
Should error with "404 Not Found". If someone took it, alternates: `slopkiller`, `slop-zap`, `slopd`, `antislop`, `ai-slop`.

## 2. GitHub repo

```bash
# from slopfighter/
git init
git add -A
git commit -m "Initial release: slopfighter v0.1.0

18 rules, 103 tests, CLI + skill installer + bench infrastructure.
Validated against 30 trending TypeScript repos (Feb–May 2026): 79,733
findings across 32,473 files, 17 of 29 scored F.
"

# Then create the repo on github.com (public), then:
git remote add origin git@github.com:wemdio2/slopfighter.git
git push -u origin main
```

After push:
- Update `package.json` `repository.url`, `homepage`, `bugs.url` to point to the actual repo (currently `wemdio2/slopfighter` placeholder)
- Update `README.md` badge URLs and the bottom CTA in `.github/workflows/slopfighter.yml` (`Powered by slopfighter` link)
- Update `bench/launch-post.md` `github.com/.../slopfighter` placeholders

## 3. npm publish

```bash
npm login                  # if not already
npm publish --access public
```

Verify:
```bash
npx slopfighter@latest --version    # should print 0.1.0
npx slopfighter@latest scan src/    # should produce a real report
```

## 4. Launch

Open `bench/launch-post.md`. It has:
- Three A/B titles (pick #1)
- A subhead, charts, X-thread one-liner, CTA block, channel plan, pre-empt section

Execute the channel plan:
1. **Tuesday 8:30 AM PT** — Show HN with title #1 (`We scanned 29 trending AI coding repos from the last 3 months. 17 got an F.`)
2. **Same hour** — X thread with the one-liner, screenshots of the score table from `bench/report.md`
3. **+24h** — dev.to long-form using the same data
4. **+72h** — Reddit r/typescript + r/ClaudeAI + r/cursor

Engage every reply within 30 minutes for the first 4 hours of Show HN — this drives the trending algorithm more than the title does.

## 5. After launch

- Watch GitHub stars for first 48h
- If >500 stars: prep v0.1.1 with whatever the top-3 issue requests are (likely: Python support, more rules, type-aware mode, custom config)
- If <100 stars: re-pitch with a different headline (`78% of vibe-coding slop comes from 3 patterns`) on dev.to + Hacker News pool
- Either way: respond to every GitHub issue within 24h for first two weeks. Early-momentum signal matters.
