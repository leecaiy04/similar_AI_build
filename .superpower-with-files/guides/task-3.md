# Task 3 Guide: V2 Design System and Workbench Shell

## Purpose

Implement the approved professional V2 visual system and reusable responsive workspace primitives before building individual tools.

Use `@frontend-design` during implementation and `@test-driven-development` for component behavior.

## Files

- Create: `src/v2/styles/tokens.css`
- Create: `src/v2/styles/workbench.css`
- Create: `src/v2/components/V2ToolHeader.vue`
- Create: `src/v2/components/V2SettingsPanel.vue`
- Create: `src/v2/components/V2WorkspacePane.vue`
- Create: `src/v2/components/V2StatusBar.vue`
- Create: `src/v2/components/V2MobileTabs.vue`
- Create: `src/v2/components/__tests__/V2SettingsPanel.spec.ts`
- Create: `src/v2/shell/__tests__/V2Shell.spec.ts`
- Modify: `src/v2/shell/V2Shell.vue`
- Modify: `src/style.css`

## Steps

### Step 1: Write failing component contract tests

Add happy-dom tests that mount the settings panel and shell with router/component stubs. Verify:

- settings collapse emits a single `update:collapsed` event;
- the shell exposes `data-ui-version="v2"`;
- desktop navigation renders every supplied tool;
- the version switch is present;
- the mobile navigation has a stable item count and accessible label.

Run the focused tests and expect FAIL because the components do not exist.

### Step 2: Define scoped V2 tokens

Create CSS variables under `[data-ui-version="v2"]`, including:

```css
[data-ui-version="v2"] {
  --v2-canvas: #f4f6f7;
  --v2-surface: #ffffff;
  --v2-border: #d8dee2;
  --v2-text: #1e272d;
  --v2-muted: #66727c;
  --v2-nav: #17211f;
  --v2-primary: #2d63e2;
  --v2-success: #13836b;
  --v2-warning: #b7791f;
  --v2-danger: #c53f47;
  --v2-radius: 6px;
}
```

Add a dark token block scoped to `.dark [data-ui-version="v2"]`. Do not replace V1 variables.

### Step 3: Implement the shared components

- `V2ToolHeader`: title slot, status slot, primary actions, overflow actions.
- `V2SettingsPanel`: labeled region, controlled collapse, scrollable body, optional footer.
- `V2WorkspacePane`: stable header/body/footer grid and empty-state slot.
- `V2StatusBar`: run state, counts, progress, safe primary action region.
- `V2MobileTabs`: controlled tab list with stable dimensions and no content overlap.

Use Element Plus icons only. Do not use emoji, gradients, nested cards, or routine shadows.

### Step 4: Implement V2Shell responsive behavior

- Desktop >= 1280px: 208px nav, collapsible to 68px.
- Tablet 761-1279px: 68px nav and drawer-based settings contract.
- Mobile <= 760px: 48px topbar, content region, 60px bottom tool navigation.
- Ensure text truncates safely and every fixed region has explicit min/max constraints.

### Step 5: Run focused tests and build

```bash
npx vitest run src/v2/components src/v2/shell
npm run build
```

Expected: tests and build pass with no V1 style regressions.

### Step 6: Commit

```bash
git add src/v2/styles src/v2/components src/v2/shell src/style.css
git commit -m "feat: add v2 workbench design system"
```

---
*Last Updated: 2026-07-17 17:00 UTC*
