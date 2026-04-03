# Guide - Task 1: Establish Test Harness and Shared Contracts

## Files

- Modify: `package.json`
- Create: `vitest.config.ts`
- Create: `src/core/contracts.ts`
- Create: `src/core/errors.ts`
- Create: `src/core/__tests__/contracts.spec.ts`

## Step 1: Write failing tests for shared contracts

Create `src/core/__tests__/contracts.spec.ts` with runtime guards for error mapping and default result states.

```ts
import { describe, expect, it } from 'vitest'
import { createProcessResult, toAppError } from '../contracts'

describe('contracts', () => {
  it('creates idle process result', () => {
    expect(createProcessResult('r1').status).toBe('idle')
  })

  it('maps native error to InternalError fallback', () => {
    const err = toAppError(new Error('boom'))
    expect(err.type).toBe('InternalError')
  })
})
```

## Step 2: Run test to verify failure

Run: `npm test -- src/core/__tests__/contracts.spec.ts`
Expected: FAIL because test tooling and contract helpers are not defined yet.

## Step 3: Add minimal implementation

1. Add scripts and dev dependencies for Vitest.
2. Add `vitest.config.ts`.
3. Add `src/core/contracts.ts` and `src/core/errors.ts` with minimal types and helper creators.

```ts
export type AppErrorType = 'ValidationError' | 'NetworkError' | 'ProviderError' | 'InternalError'

export interface AppError {
  type: AppErrorType
  message: string
  retryable: boolean
}

export interface ProcessResult {
  id: string
  status: 'idle' | 'loading' | 'success' | 'error'
  output: Record<string, string>
  error?: AppError
}

export const createProcessResult = (id: string): ProcessResult => ({
  id,
  status: 'idle',
  output: {},
})

export const toAppError = (err: unknown): AppError => ({
  type: 'InternalError',
  message: err instanceof Error ? err.message : 'Unknown error',
  retryable: false,
})
```

## Step 4: Re-run tests to pass

Run: `npm test -- src/core/__tests__/contracts.spec.ts`
Expected: PASS.

## Step 5: Commit

```bash
git add package.json package-lock.json vitest.config.ts src/core/contracts.ts src/core/errors.ts src/core/__tests__/contracts.spec.ts
git commit -m "test(core): add baseline contract test harness"
```

## Step 6: Verify structure (optional)

Run: `rg --files src/core`
Expected: lists contracts, errors, and test files.
