# Task 9 Guide: no-AI, Responsive, and Cross-Version Parity

## Purpose

Finish route availability, mobile/tablet behavior, version preference semantics, and V1/V2 data continuity before final QA.

Use `@test-driven-development` and `@systematic-debugging` for any responsive regressions.

## Files

- Create: `src/router/__tests__/routerVariants.spec.ts`
- Create: `src/v2/__tests__/crossVersionParity.spec.ts`
- Modify: `src/router/index.ts`
- Modify: `src/router/index.no-ai.ts`
- Modify: `src/v2/styles/workbench.css`
- Modify: `src/v2/shell/V2Shell.vue`
- Modify: V2 page styles where a concrete breakpoint issue is found
- Delete: `src/v2/pages/V2PlaceholderPage.vue`

## Steps

### Step 1: Write failing router-variant tests

Test exported route factories or route records without starting a browser:

- full router contains six V1 and six V2 tool routes;
- no-AI router contains four V1 and four V2 tool routes;
- no-AI excludes Batch AI and Chat in both versions;
- no placeholder component remains;
- direct V1 and V2 URLs are not redirected by stored preference.

### Step 2: Write failing cross-version persistence tests

Use happy-dom localStorage. For representative Similarity and Batch AI workspaces:

1. set V1 composable values;
2. await `nextTick()` so watchers persist;
3. dispose/remount the workspace as the opposite presentation version would;
4. verify the same values restore from existing storage keys.

Add equivalent compatibility coverage for extracted Table Merge and Chat storage behavior where persistence exists.

### Step 3: Complete route tables and remove placeholder

Ensure every approved V2 route imports a real page. Delete `V2PlaceholderPage.vue` and remove all references.

### Step 4: Complete breakpoint behavior

Verify implementation rules in CSS and component contracts:

- >=1280px: labeled 208px nav and desktop pane grids;
- 761-1279px: 68px rail, settings drawer, stable minimum pane widths;
- <=760px: topbar, 60px bottom nav, mobile tabs, safe action bar;
- no fixed/sticky element covers scrollable content;
- no 2-column data grid survives on a 390px viewport unless each track remains usable.

### Step 5: Run parity verification

```bash
npx vitest run src/router/__tests__/routerVariants.spec.ts src/v2/__tests__/crossVersionParity.spec.ts
npm test
npm run build
npm run build:single
```

Expected: all pass.

### Step 6: Commit

```bash
git add src/router src/v2
git commit -m "test: lock dual-ui parity and responsive routes"
```

---
*Last Updated: 2026-07-17 17:15 UTC*
