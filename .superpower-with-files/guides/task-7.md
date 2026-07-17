# Task 7 Guide: V2 Data Processing and Table Merge

## Purpose

Build V2 Data Processing and Table Merge using the existing data-processing composable and the newly extracted table-merge workspace.

Use `@frontend-design` and `@test-driven-development`.

## Files

- Create: `src/v2/pages/V2DataProcessingPage.vue`
- Create: `src/v2/pages/V2TableMergePage.vue`
- Create: `src/v2/pages/__tests__/V2DataProcessingPage.spec.ts`
- Create: `src/v2/pages/__tests__/V2TableMergePage.spec.ts`
- Create: `src/v2/components/V2CommandGroup.vue`
- Create: `src/v2/components/V2StepHeader.vue`
- Modify: `src/router/index.ts`
- Modify: `src/router/index.no-ai.ts`

## Steps

### Step 1: Write failing page contract tests

Mock `useDataProcessingWorkspace` and `useTableMergeWorkspace`. Verify:

- Data Processing renders input/data panes and grouped cleanup, transform, extract, and privacy commands.
- Mobile pane definitions contain `input` and `data`.
- Table Merge renders exactly three named steps and disables next-step until its computed guard is true.
- Primary actions invoke the mocked workspace methods once.

Run the focused specs and expect FAIL.

### Step 2: Implement shared command and step components

- `V2CommandGroup` renders a compact unframed command band with icon buttons and tooltips.
- `V2StepHeader` renders stable three-step progress with current, complete, and pending states.
- Neither component owns business state.

### Step 3: Implement V2 Data Processing

- Bind directly to `useDataProcessingWorkspace()`.
- Place input staging in a resizable left pane and the row workspace in the main pane.
- Group commands by behavior instead of scattering them across headers.
- Keep export/copy as secondary commands and clear as a confirmed destructive command.
- Use `input/data` tabs on mobile and a bottom tool sheet for advanced commands.

### Step 4: Implement V2 Table Merge

- Bind directly to `useTableMergeWorkspace()`.
- Step 1: repeated table inputs/import candidates and skip-row controls.
- Step 2: standard columns and per-table mappings.
- Step 3: preview table, copy, and CSV export.
- Page handles file inputs, clipboard writes, Blob URLs, and download anchors using content returned by the workspace.
- Mobile displays one step at a time with stable back/next controls.

### Step 5: Replace routes and verify

Update `/v2/process` and `/v2/merge` in full/no-AI routers.

```bash
npx vitest run src/v2/pages/__tests__/V2DataProcessingPage.spec.ts src/v2/pages/__tests__/V2TableMergePage.spec.ts
npm test
npm run build
```

Expected: all pass.

### Step 6: Commit

```bash
git add src/v2/components/V2CommandGroup.vue src/v2/components/V2StepHeader.vue src/v2/pages/V2DataProcessingPage.vue src/v2/pages/V2TableMergePage.vue src/v2/pages/__tests__ src/router
git commit -m "feat: add v2 processing and merge workspaces"
```

---
*Last Updated: 2026-07-17 17:15 UTC*
