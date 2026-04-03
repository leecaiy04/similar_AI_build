# Guide - Task 2: Build Core Text and IO Modules

## Files

- Create: `src/core/text/split.ts`
- Create: `src/core/text/normalize.ts`
- Create: `src/core/io/csv.ts`
- Create: `src/core/io/json.ts`
- Create: `src/core/text/__tests__/split.spec.ts`
- Create: `src/core/io/__tests__/csv.spec.ts`
- Modify: `src/utils/textParser.ts`

## Step 1: Write failing tests for split and CSV stability

Create tests that lock down newline-in-quote behavior and UTF-8 BOM export behavior.

```ts
it('preserves newline inside quoted excel cell', () => {
  const lines = splitExcelLines('"a\nb"\nnext')
  expect(lines).toEqual(['a\nb', 'next'])
})

it('exports csv with BOM', () => {
  const csv = buildCsv(['a,b'])
  expect(csv.charCodeAt(0)).toBe(0xfeff)
})
```

## Step 2: Run tests to confirm failure

Run: `npm test -- src/core/text/__tests__/split.spec.ts src/core/io/__tests__/csv.spec.ts`
Expected: FAIL because modules are missing.

## Step 3: Implement minimal core modules

1. Move split logic from page-level utility into `src/core/text/split.ts`.
2. Add reusable normalizer for trim/case/whitespace.
3. Add CSV/JSON serializers with explicit escape behavior.
4. Keep `src/utils/textParser.ts` as compatibility wrapper that re-exports core functions.

## Step 4: Re-run tests

Run: `npm test -- src/core/text/__tests__/split.spec.ts src/core/io/__tests__/csv.spec.ts`
Expected: PASS.

## Step 5: Commit

```bash
git add src/core/text src/core/io src/utils/textParser.ts
git commit -m "refactor(core): extract shared text and io modules"
```

## Step 6: Run full core test subset (optional)

Run: `npm test -- src/core`
Expected: PASS for task-1 and task-2 tests.
