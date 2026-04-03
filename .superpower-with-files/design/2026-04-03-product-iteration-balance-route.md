# Product Iteration Design - Balanced Route

**Date:** 2026-04-03
**Scope:** Similarity + Diff + Data Processing + AI Batch
**Mode:** Balanced (delivery speed + maintainability)

## 1. Current State Summary

The project already provides four functional pages and rich user-facing capabilities, but each page currently owns too much business logic. This causes three concrete issues:

1. Feature velocity drops as page files become larger.
2. Shared logic (text split, export, state persistence, request orchestration) is duplicated.
3. There is no reliable regression safety net for future iteration.

## 2. Goals and Non-Goals

### Goals

1. Keep current user features available while refactoring.
2. Extract a shared core layer for text, IO, state, and task orchestration.
3. Improve AI batch reliability (cancel, retry, bounded concurrency, actionable error surface).
4. Establish a practical test baseline focused on core and feature logic.

### Non-Goals

1. No full UI redesign in this phase.
2. No backend service introduction in this phase.
3. No Rust/Tauri architecture rewrite in this phase.

## 3. Target Architecture

### Layering

1. UI Layer
- Vue pages and presentational interactions only.

2. Feature Layer
- `similarity`, `diff`, `data-processing`, `ai-batch` modules.
- Owns use-case orchestration, not low-level utilities.

3. Core Layer
- Shared primitives: text operations, IO serialization, versioned persistence, task queue.

4. Infra Layer
- External boundary adapters: OpenAI/Claude/Gemini request adapters and browser/Tauri boundary wrappers.

### Directory Shape

```text
src/
  core/
    text/
    io/
    state/
    task/
  infra/
    llm/
  features/
    similarity/
    diff/
    data-processing/
    ai-batch/
  pages/
```

## 4. Shared Data Contracts

All feature modules will use consistent data contracts to reduce conversion logic and export mismatch.

```ts
export interface InputRecord {
  id: string
  fields: Record<string, string>
}

export interface ProcessResult {
  id: string
  status: 'idle' | 'loading' | 'success' | 'error'
  output: Record<string, string>
  error?: {
    type: 'ValidationError' | 'NetworkError' | 'ProviderError' | 'InternalError'
    message: string
    retryable: boolean
  }
}
```

## 5. Error Handling and Reliability

### Error Taxonomy

1. `ValidationError`: user config/input issue.
2. `NetworkError`: timeout, DNS, transport errors.
3. `ProviderError`: API limits, auth failure, unsupported model.
4. `InternalError`: unexpected logic exceptions.

### Reliability Controls

1. Shared batch queue with max concurrency and cancellation.
2. Retry policy only for retryable errors.
3. Versioned local storage with migration hooks.
4. Large text operations run through chunked processing where needed.

## 6. Migration and Rollout Strategy

### Phase 1

1. Introduce test harness and shared contracts.
2. Introduce core text/io/state/task modules.

### Phase 2

1. Refactor Similarity and Diff into feature modules.
2. Refactor Data Processing and AI Batch into feature modules.

### Phase 3

1. Page integration and regression hardening.
2. CI update to include test execution.

## 7. Acceptance Criteria

1. Existing page entry points remain functional.
2. Core modules are covered by deterministic unit tests.
3. AI batch supports cancellation and bounded concurrency through shared queue.
4. CSV/JSON import-export formats stay backward compatible.
5. Plan execution can proceed task-by-task from `.superpower-with-files/active_tdd_plan.md`.

---
*Last Updated: 2026-04-03 06:55 UTC*
