# Guide - Task 3: Build Shared Task Queue and LLM Adapter Layer

## Files

- Create: `src/core/task/batchQueue.ts`
- Create: `src/core/task/__tests__/batchQueue.spec.ts`
- Create: `src/infra/llm/types.ts`
- Create: `src/infra/llm/openaiAdapter.ts`
- Create: `src/infra/llm/claudeAdapter.ts`
- Create: `src/infra/llm/geminiAdapter.ts`
- Create: `src/infra/llm/index.ts`
- Create: `src/features/ai-batch/service/batchInferenceService.ts`
- Create: `src/features/ai-batch/__tests__/batchInferenceService.spec.ts`

## Step 1: Write failing queue behavior tests

Cover bounded concurrency, cancellation, and retry-only-for-retryable.

```ts
it('runs at most N tasks at once', async () => {
  const queue = createBatchQueue({ concurrency: 2 })
  // enqueue 5 tasks and assert max in-flight <= 2
})

it('does not retry non-retryable provider errors', async () => {
  // assert attempt count remains 1
})
```

## Step 2: Run tests to fail

Run: `npm test -- src/core/task/__tests__/batchQueue.spec.ts src/features/ai-batch/__tests__/batchInferenceService.spec.ts`
Expected: FAIL due to missing queue/service.

## Step 3: Implement queue and adapters

1. Implement a generic queue API with:
- `enqueue(task)`
- `cancelAll()`
- `onProgress(callback)`
2. Implement provider adapters that map request/response payloads to unified shape.
3. Implement `batchInferenceService` that composes adapters + queue + error mapping.

## Step 4: Re-run tests

Run: `npm test -- src/core/task/__tests__/batchQueue.spec.ts src/features/ai-batch/__tests__/batchInferenceService.spec.ts`
Expected: PASS.

## Step 5: Commit

```bash
git add src/core/task src/infra/llm src/features/ai-batch/service src/features/ai-batch/__tests__
git commit -m "feat(core): add shared queue and llm adapter layer"
```

## Step 6: Contract check (optional)

Run: `npm test -- src/core src/features/ai-batch`
Expected: PASS.
