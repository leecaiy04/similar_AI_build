# Task 4 Guide: Extract the Table Merge Workspace

## Purpose

Move Table Merge workflow orchestration into a shared feature boundary so V1 and V2 can use one implementation.

Use `@test-driven-development` and keep browser-only effects in page components.

## Files

- Create: `src/features/table-merge/types.ts`
- Create: `src/features/table-merge/service/tableMergeWorkspaceService.ts`
- Create: `src/features/table-merge/composables/useTableMergeWorkspace.ts`
- Create: `src/features/table-merge/__tests__/useTableMergeWorkspace.spec.ts`
- Modify: `src/pages/TableMergePage.vue`
- Reuse: `src/utils/tableMergeParser.ts`

## Steps

### Step 1: Write failing orchestration tests

Cover these behaviors in `useTableMergeWorkspace.spec.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { useTableMergeWorkspace } from '../composables/useTableMergeWorkspace'

describe('useTableMergeWorkspace', () => {
  it('parses tables, builds automatic mappings, and merges rows', () => {
    const workspace = useTableMergeWorkspace()
    workspace.tables.value = [
      { content: '姓名\t部门\n张三\t技术部', skipRows: 0 },
      { content: '姓名\t部门\n李四\t市场部', skipRows: 0 },
    ]

    workspace.parseTablesAndGoToStep2()
    expect(workspace.currentStep.value).toBe(2)
    expect(workspace.standardColumns.value).toEqual(['姓名', '部门'])

    workspace.mergeTablesWithMapping()
    expect(workspace.currentStep.value).toBe(3)
    expect(workspace.mergedRows.value).toEqual([
      { 姓名: '张三', 部门: '技术部' },
      { 姓名: '李四', 部门: '市场部' },
    ])
  })

  it('returns export content without touching the DOM', () => {
    const workspace = useTableMergeWorkspace()
    workspace.standardColumns.value = ['姓名', '备注']
    workspace.mergedRows.value = [{ 姓名: '张三', 备注: 'a,b' }]

    expect(workspace.buildTsvResult()).toContain('姓名\t备注')
    expect(workspace.buildCsvResult()).toContain('"a,b"')
  })
})
```

Run `npx vitest run src/features/table-merge/__tests__/useTableMergeWorkspace.spec.ts` and expect FAIL because the feature does not exist.

### Step 2: Move shared types and pure formatting

Move `Table`, `ParsedTable`, and `TableImportCandidate` to `types.ts`. Implement pure service methods for:

- table creation;
- candidate normalization;
- table parsing and automatic column mapping;
- merged row construction;
- TSV and UTF-8 CSV content generation;
- skip-row recommendation delegation.

Do not import `document`, `navigator`, or Element Plus into the pure service.

### Step 3: Implement the workspace composable

The composable owns current step, tables, parsed tables, standard columns, mappings, merged rows, import candidates, computed guards, sample/reset, and service orchestration.

Its return contract must include the state/actions used by both pages, including:

```ts
return {
  currentStep,
  headerRowCount,
  tables,
  parsedTables,
  standardColumns,
  columnMappings,
  mergedRows,
  importCandidates,
  canProceedToStep2,
  canProceedToStep3,
  addTable,
  removeTable,
  applySmartRecommendation,
  applyAllSmartRecommendations,
  resetAllSkipRows,
  parseTablesAndGoToStep2,
  mergeTablesWithMapping,
  buildTsvResult,
  buildCsvResult,
  loadSample,
  resetAll,
}
```

Workbook reading can be injected as an adapter; browser file selection and input refs stay in the page.

### Step 4: Rewire the V1 page

Replace local workflow refs/functions in `TableMergePage.vue` with destructuring from `useTableMergeWorkspace()`. Keep only:

- `fileInputRef` and per-table input refs;
- event-to-File conversion;
- clipboard write and fallback textarea;
- Blob/object URL/download anchor behavior;
- Element Plus messages tied to browser effects.

Do not change V1 labels, route, or visual structure in this task.

### Step 5: Verify feature and parser tests

```bash
npx vitest run src/features/table-merge src/utils/__tests__/tableMergeParser.spec.ts
npm test
npm run build
```

Expected: all pass; V1 Table Merge behavior remains intact.

### Step 6: Commit

```bash
git add src/features/table-merge src/pages/TableMergePage.vue
git commit -m "refactor: extract table merge workspace"
```

---
*Last Updated: 2026-07-17 17:10 UTC*
