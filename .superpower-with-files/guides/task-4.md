# Guide - Task 4: Refactor Similarity and Diff to Feature Layer

## Files

- Create: `src/features/similarity/service/similarityService.ts`
- Create: `src/features/similarity/composables/useSimilarityWorkspace.ts`
- Create: `src/features/similarity/__tests__/similarityService.spec.ts`
- Create: `src/features/diff/service/diffService.ts`
- Create: `src/features/diff/composables/useDiffWorkspace.ts`
- Create: `src/features/diff/__tests__/diffService.spec.ts`
- Modify: `src/pages/SimilarityPage.vue`
- Modify: `src/pages/DiffPage.vue`
- Modify: `src/utils/similarity.ts` (thin adapter, no UI responsibility)

## Step 1: Write failing tests for extracted feature behavior

Lock down:
1. similarity ranking order
2. threshold filtering
3. join mode behavior
4. diff algorithm selection behavior

## Step 2: Run tests to fail

Run: `npm test -- src/features/similarity/__tests__/similarityService.spec.ts src/features/diff/__tests__/diffService.spec.ts`
Expected: FAIL because feature services/composables are missing.

## Step 3: Implement minimal extraction

1. Move pure business logic to feature services.
2. Keep existing UI behavior by wiring page events to composables.
3. Keep local-storage key compatibility to avoid breaking existing users.

## Step 4: Re-run tests

Run: `npm test -- src/features/similarity/__tests__/similarityService.spec.ts src/features/diff/__tests__/diffService.spec.ts`
Expected: PASS.

## Step 5: Smoke-check compile

Run: `npm run build`
Expected: PASS with pages compiling against composables.

## Step 6: Commit

```bash
git add src/features/similarity src/features/diff src/pages/SimilarityPage.vue src/pages/DiffPage.vue src/utils/similarity.ts
git commit -m "refactor(feature): move similarity and diff logic out of pages"
```
