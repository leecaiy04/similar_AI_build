# Task 10 Guide: Final Verification and FNOS Deployment

## Purpose

Verify functional and visual quality, review the complete change set, expose a safe FNOS preview, and promote it with an immediate V1 runtime fallback.

Use `@requesting-code-review`, `@verification-before-completion`, and `@finishing-a-development-branch`.

## Files

- Modify: `README.md`
- Modify: `docs/fnos-deploy.md`
- Create or update: `.superpower-with-files/progress.md`
- Create or update: `.superpower-with-files/handoff.md`

## Steps

### Step 1: Run focused and full automated verification

```bash
npm test
npm run build
npm run build:single
```

Expected: all tests pass; both builds complete with no TypeScript errors.

If `src-tauri` was untouched, do not run Cargo tests. If Rust changed unexpectedly, run `cargo test --manifest-path src-tauri/Cargo.toml`.

### Step 2: Review the change set

Run:

```bash
git status --short
git diff --check
git diff --stat HEAD~10..HEAD
```

Request code review focused on V1 regressions, shared-state divergence, credential exposure, mobile overlap, and missing route coverage. Resolve findings before deployment.

### Step 3: Start a preview service on FNOS

Build in the implementation worktree, then start a separate PM2 preview service from that worktree on an unused port such as `56610`:

```bash
PORT=56610 pm2 start server.js --name similar-ai-build-v2-preview --cwd <implementation_worktree>
```

Verify `curl http://127.0.0.1:56610/` returns HTTP 200 before browser QA.

### Step 4: Perform browser visual QA

Use the browser-control skill and capture every V2 page at:

- 1440x900 desktop;
- 1024x768 tablet;
- 390x844 mobile.

Check V1 and V2 route switching, all six tools, representative filled states, empty states, loading/error states, dialogs/drawers, and dark mode on Shell, Similarity, Batch AI, and Chat.

Acceptance: no blank content, clipping, overlap, inaccessible controls, layout shifts, stale active navigation, exposed API keys, or console errors.

### Step 5: Update operator documentation

Document:

- V1/V2 URLs and version switch behavior;
- preview and production PM2 commands;
- current path and port values;
- rollback command that restarts `similar-ai-build` from the original FNOS directory.

Correct the stale README path/port while preserving unrelated user documentation changes.

### Step 6: Promote after preview verification

Keep `/vol1/1000/code/similar_AI_build` unchanged as the immediate runtime fallback. Point `similar-ai-build` at the verified implementation worktree/release directory on port `56600`, save the PM2 process list, then verify:

```bash
pm2 status similar-ai-build
curl -I http://127.0.0.1:56600/
curl -I http://127.0.0.1:56600/#/v2/
```

Expected: PM2 online and HTTP 200. If health fails, restore the service cwd to `/vol1/1000/code/similar_AI_build` and restart immediately.

### Step 7: Final commit and handoff

Commit only final documentation/QA adjustments:

```bash
git add README.md docs/fnos-deploy.md .superpower-with-files/progress.md .superpower-with-files/handoff.md
git commit -m "docs: document dual-ui FNOS operation"
```

Record test counts, build results, preview URL, production URL, PM2 status, commit IDs, and rollback path in the handoff.

---
*Last Updated: 2026-07-17 17:15 UTC*
