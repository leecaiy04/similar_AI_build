# Guide - Task 5: Refactor Data Processing and AI Batch to Feature Layer

## Files

- Create: `src/features/data-processing/service/transformService.ts`
- Create: `src/features/data-processing/composables/useDataProcessingWorkspace.ts`
- Create: `src/features/data-processing/__tests__/transformService.spec.ts`
- Create: `src/features/ai-batch/composables/useAIBatchWorkspace.ts`
- Create: `src/features/ai-batch/__tests__/useAIBatchWorkspace.spec.ts`
- Modify: `src/pages/DataProcessingPage.vue`
- Modify: `src/pages/AIBatchPage.vue`

## Step 1: Write failing tests for transformation and workspace orchestration

Cover:
1. duplicate handling and dedupe strategy
2. regex mode behavior (match/filter/keep)
3. AI workspace state transitions (`idle -> loading -> success/error`)
4. cancel behavior from page action

## Step 2: Run tests to fail

Run: `npm test -- src/features/data-processing/__tests__/transformService.spec.ts src/features/ai-batch/__tests__/useAIBatchWorkspace.spec.ts`
Expected: FAIL because services/composables are missing.

## Step 3: Implement feature modules

1. Move data transformations to pure service functions.
2. Move AI page orchestration to composable backed by shared queue service.
3. Keep current preset and storage format compatible.

## Step 4: Re-run tests

Run: `npm test -- src/features/data-processing/__tests__/transformService.spec.ts src/features/ai-batch/__tests__/useAIBatchWorkspace.spec.ts`
Expected: PASS.

## Step 5: Build verification

Run: `npm run build`
Expected: PASS.

## Step 6: Commit

```bash
git add src/features/data-processing src/features/ai-batch src/pages/DataProcessingPage.vue src/pages/AIBatchPage.vue
git commit -m "refactor(feature): extract data-processing and ai-batch modules"
```
