# Task 1 Guide: Protect V1 and Add the UI Test Runtime

## Purpose

Create an isolated implementation workspace that includes the current uncommitted V1 UI baseline, then add the smallest DOM-capable Vitest setup required for V2 component tests.

Use `@using-git-worktrees` before changing source and `@test-driven-development` for the test-runtime change.

## Files

- Modify: `package.json`
- Modify: `package-lock.json`
- Create: `src/v2/__tests__/testRuntime.spec.ts`
- Preserve from current FNOS tree: `src/App.vue`, `src/App.no-ai.vue`, `src/components/AppShell.vue`, `src/pages/*.vue`, `src/style.css`, `src/styles/app-theme.css`

## Steps

### Step 1: Capture the current UI baseline

Run read-only status first:

```bash
git status --short
git diff --stat
```

Save a binary patch outside the repository and copy the untracked `AppShell.vue` separately. Do not reset, stash, or clean the FNOS working tree.

Expected: the backup contains the current V1 UI files while unrelated user changes remain untouched.

### Step 2: Create an isolated worktree

Create a sibling worktree on branch `feat/dual-ui-v2`, then apply only the saved V1 UI patch and copy `AppShell.vue` into the worktree. Verify the resulting UI diff matches the source tree's relevant UI paths.

Expected: implementation happens in the isolated worktree; `/vol1/1000/code/similar_AI_build` remains the running fallback.

### Step 3: Write the failing DOM-runtime test

Create `src/v2/__tests__/testRuntime.spec.ts`:

```ts
// @vitest-environment happy-dom
import { describe, expect, it } from 'vitest'

describe('v2 UI test runtime', () => {
  it('provides a browser-like document', () => {
    const element = document.createElement('section')
    element.dataset.uiVersion = 'v2'
    expect(element.dataset.uiVersion).toBe('v2')
  })
})
```

### Step 4: Run the test and confirm the dependency failure

Run:

```bash
npx vitest run src/v2/__tests__/testRuntime.spec.ts
```

Expected: FAIL because `happy-dom` is not installed.

### Step 5: Install focused UI test dependencies

Run:

```bash
npm install --save-dev @vue/test-utils happy-dom
```

Expected: `package.json` and `package-lock.json` contain both dev dependencies.

### Step 6: Re-run the focused test

Run:

```bash
npx vitest run src/v2/__tests__/testRuntime.spec.ts
```

Expected: PASS, 1 test.

### Step 7: Run the existing suite

Run:

```bash
npm test
```

Expected: all pre-existing tests plus the runtime test pass.

### Step 8: Commit only the test-runtime files

```bash
git add package.json package-lock.json src/v2/__tests__/testRuntime.spec.ts
git commit -m "test: add v2 component test runtime"
```

Do not stage unrelated baseline files in this commit.

---
*Last Updated: 2026-07-17 17:00 UTC*
