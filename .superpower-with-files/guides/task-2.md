# Task 2 Guide: Version Routing and Shell Split

## Purpose

Introduce stable V1/V2 route mapping, a remembered version switch, and route-level shells without changing V1 URLs.

Use `@test-driven-development`.

## Files

- Create: `src/navigation/tools.ts`
- Create: `src/routing/uiVersion.ts`
- Create: `src/routing/__tests__/uiVersion.spec.ts`
- Create: `src/composables/useUiVersion.ts`
- Create: `src/components/VersionSwitch.vue`
- Create: `src/shell/V1Shell.vue`
- Create: `src/v2/shell/V2Shell.vue`
- Create: `src/v2/pages/V2PlaceholderPage.vue`
- Modify: `src/App.vue`
- Modify: `src/App.no-ai.vue`
- Modify: `src/components/AppShell.vue`
- Modify: `src/router/index.ts`
- Modify: `src/router/index.no-ai.ts`

## Steps

### Step 1: Write failing route-mapping tests

Create `src/routing/__tests__/uiVersion.spec.ts` with these assertions:

```ts
import { describe, expect, it } from 'vitest'
import { detectUiVersion, mapToolPathToVersion } from '../uiVersion'

describe('uiVersion routes', () => {
  it('maps equivalent tool routes in both directions', () => {
    expect(mapToolPathToVersion('/diff', 'v2')).toBe('/v2/diff')
    expect(mapToolPathToVersion('/v2/diff', 'v1')).toBe('/diff')
    expect(mapToolPathToVersion('/', 'v2')).toBe('/v2')
    expect(mapToolPathToVersion('/v2', 'v1')).toBe('/')
  })

  it('detects version from the route path', () => {
    expect(detectUiVersion('/process')).toBe('v1')
    expect(detectUiVersion('/v2/process')).toBe('v2')
  })
})
```

Run `npx vitest run src/routing/__tests__/uiVersion.spec.ts` and expect FAIL because the module does not exist.

### Step 2: Implement the pure routing contract

Create `src/routing/uiVersion.ts` with:

```ts
export type UiVersion = 'v1' | 'v2'

const toolPaths = ['/', '/diff', '/process', '/merge', '/ai-batch', '/chat'] as const

export function detectUiVersion(path: string): UiVersion {
  return path === '/v2' || path.startsWith('/v2/') ? 'v2' : 'v1'
}

export function mapToolPathToVersion(path: string, target: UiVersion): string {
  const v1Path = detectUiVersion(path) === 'v2'
    ? path.replace(/^\/v2(?=\/|$)/, '') || '/'
    : path
  const normalized = toolPaths.includes(v1Path as (typeof toolPaths)[number]) ? v1Path : '/'
  return target === 'v2' ? (normalized === '/' ? '/v2' : `/v2${normalized}`) : normalized
}
```

Re-run the focused test and expect PASS.

### Step 3: Centralize tool definitions

Create `src/navigation/tools.ts` with typed tool IDs, labels, short labels, paths, and Element Plus icon keys. Export `fullTools` and `noAiTools`; do not store emoji in route metadata.

### Step 4: Add the version composable

`useUiVersion.ts` must:

- derive the current version from `route.path`;
- save `similar-ui-version` only when the switch is used;
- call `await nextTick()` before `router.push(...)`;
- map the current tool via `mapToolPathToVersion`;
- honor direct URLs instead of redirecting them automatically.

Add a happy-dom unit test with a mocked router that verifies preference storage and mapped navigation.

### Step 5: Split root application and V1 shell

- `App.vue` and `App.no-ai.vue` retain only `el-config-provider` plus root `<router-view />`.
- `V1Shell.vue` renders the existing `AppShell` with the correct tool set and package version.
- `AppShell.vue` receives the shared `VersionSwitch` in its footer/topbar without changing existing tool page URLs.

### Step 6: Add temporary V2 shell routing

Create a minimal `V2Shell.vue` and `V2PlaceholderPage.vue` so every `/v2` route is navigable before the final pages exist. The placeholder is temporary and must be removed in Tasks 6-8.

Use nested routes for both shells. Give route names stable prefixes such as `v1-similarity` and `v2-similarity`.

### Step 7: Verify routing and builds

Run:

```bash
npx vitest run src/routing/__tests__/uiVersion.spec.ts
npm test
npm run build
```

Expected: all commands pass; V1 paths remain unchanged; V2 paths resolve to the placeholder.

### Step 8: Commit

```bash
git add src/App.vue src/App.no-ai.vue src/navigation src/routing src/composables/useUiVersion.ts src/components/VersionSwitch.vue src/components/AppShell.vue src/shell src/v2/shell src/v2/pages/V2PlaceholderPage.vue src/router
git commit -m "feat: add dual-version routing shells"
```

---
*Last Updated: 2026-07-17 17:00 UTC*
