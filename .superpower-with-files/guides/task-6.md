# Task 6 Guide: V2 Similarity and Diff

## Purpose

Build the first two complete V2 tools using existing workspace composables and the shared workbench components.

Use `@frontend-design` and `@test-driven-development`.

## Files

- Create: `src/v2/pages/V2SimilarityPage.vue`
- Create: `src/v2/pages/V2DiffPage.vue`
- Create: `src/v2/pages/__tests__/V2SimilarityPage.spec.ts`
- Create: `src/v2/pages/__tests__/V2DiffPage.spec.ts`
- Create: `src/v2/components/V2DualInputWorkspace.vue`
- Modify: `src/router/index.ts`
- Modify: `src/router/index.no-ai.ts`

## Steps

### Step 1: Write failing page contract tests

Mock the feature composables and mount each page under happy-dom. Verify stable `data-testid` contracts:

- Similarity renders source, target, result, settings, and primary-run regions.
- Diff renders A input, B input, result, consolidated options, and primary-run regions.
- Mobile tab definitions contain exactly the required panes.
- Primary buttons invoke `startComparison` and `runDiff` once.

Run the two focused specs and expect FAIL because the pages do not exist.

### Step 2: Implement `V2DualInputWorkspace`

Provide named slots for `left`, `right`, and `result`, with desktop grid tracks and controlled mobile pane tabs. Keep fixed headers from resizing when counts change.

### Step 3: Implement V2 Similarity

- Use `useSimilarityWorkspace()` directly.
- Settings panel contains preprocessing, normalization, threshold, algorithm, synonym/ignore text, and join mode.
- Main workspace places source/target inputs above results.
- Keep lock, note, AI suggestion, import/export, and result filtering behavior.
- Put secondary commands in the tool header/overflow menu; keep one primary compare action.
- Replace emoji with Element Plus icons.

### Step 4: Implement V2 Diff

- Use `useDiffWorkspace()` directly.
- Consolidate compare mode, algorithm, ignore options, match filter, and threshold.
- Use dual input panes above a full-width diff result table.
- Preserve row rendering and export behavior.

### Step 5: Replace placeholder routes

Update full and no-AI routers so `/v2`, `/v2/diff` load these pages. Keep remaining V2 routes on the placeholder until their tasks complete.

### Step 6: Verify

```bash
npx vitest run src/v2/pages/__tests__/V2SimilarityPage.spec.ts src/v2/pages/__tests__/V2DiffPage.spec.ts
npm test
npm run build
```

Expected: focused tests, full suite, and build pass.

### Step 7: Commit

```bash
git add src/v2/components/V2DualInputWorkspace.vue src/v2/pages/V2SimilarityPage.vue src/v2/pages/V2DiffPage.vue src/v2/pages/__tests__ src/router
git commit -m "feat: add v2 similarity and diff workspaces"
```

---
*Last Updated: 2026-07-17 17:10 UTC*
