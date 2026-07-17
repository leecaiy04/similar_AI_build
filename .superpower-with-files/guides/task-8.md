# Task 8 Guide: V2 Batch AI and Chat

## Purpose

Build the two V2 AI workspaces with shared provider/config logic, secure credential presentation, and responsive pane switching.

Use `@frontend-design` and `@test-driven-development`.

## Files

- Create: `src/v2/pages/V2AIBatchPage.vue`
- Create: `src/v2/pages/V2ChatPage.vue`
- Create: `src/v2/pages/__tests__/V2AIBatchPage.spec.ts`
- Create: `src/v2/pages/__tests__/V2ChatPage.spec.ts`
- Create: `src/v2/components/V2CredentialField.vue`
- Create: `src/v2/components/V2ConnectionStatus.vue`
- Modify: `src/router/index.ts`

## Steps

### Step 1: Write failing page and credential tests

Verify:

- Batch AI exposes configuration, input, and output pane contracts.
- Batch AI calls start/stop once and renders processed/total status.
- API Key uses a password input by default and emits clear without exposing the value in labels or status text.
- Chat renders session drawer/list, model/endpoint status, message workspace, and composer.
- Chat send/stop/regenerate actions call the shared workspace.

Run focused specs and expect FAIL.

### Step 2: Implement credential and connection components

- `V2CredentialField` receives the key only as a model value, defaults to masked display, supports explicit reveal, and emits `clear`.
- It must never render the key in helper text, title, tooltip, status, or data attributes.
- `V2ConnectionStatus` displays provider, model, endpoint host, and status without showing credentials.

### Step 3: Implement V2 Batch AI

- Bind directly to `useAIBatchWorkspace()`.
- Replace the 3-column preset button matrix with a compact grouped selector.
- Organize configuration into connection, credentials, prompts, and execution sections.
- Keep source and output panes side-by-side on desktop, with row-level loading/success/error states.
- Use `configuration/input/output` tabs on mobile and a safe start/stop action bar.

### Step 4: Implement V2 Chat

- Bind to `useChatWorkspace()` and `useSharedAIConfig()`.
- Keep message scrolling in the page using a DOM ref and post-update watch.
- Desktop uses session list plus conversation; mobile moves sessions into a drawer.
- Show current provider/model/endpoint status in the header.
- Preserve settings, copy, clear, regenerate, stop, and send behavior.

### Step 5: Replace routes and remove AI placeholders

Update `/v2/ai-batch` and `/v2/chat` in the full router. Do not add them to the no-AI router.

### Step 6: Verify

```bash
npx vitest run src/v2/pages/__tests__/V2AIBatchPage.spec.ts src/v2/pages/__tests__/V2ChatPage.spec.ts
npm test
npm run build
```

Expected: all pass and no API Key appears in snapshots or assertion output.

### Step 7: Commit

```bash
git add src/v2/components/V2CredentialField.vue src/v2/components/V2ConnectionStatus.vue src/v2/pages/V2AIBatchPage.vue src/v2/pages/V2ChatPage.vue src/v2/pages/__tests__ src/router/index.ts
git commit -m "feat: add v2 AI workspaces"
```

---
*Last Updated: 2026-07-17 17:15 UTC*
