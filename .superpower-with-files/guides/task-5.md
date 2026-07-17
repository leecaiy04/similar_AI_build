# Task 5 Guide: Extract the Chat Workspace

## Purpose

Move chat sessions, persistence, generation, abort, retry, and shared AI configuration behavior into one testable composable for V1 and V2.

Use `@test-driven-development`.

## Files

- Create: `src/features/chat/types.ts`
- Create: `src/features/chat/composables/useChatWorkspace.ts`
- Create: `src/features/chat/__tests__/useChatWorkspace.spec.ts`
- Modify: `src/pages/ChatPage.vue`
- Reuse: `src/composables/useSharedAIConfig.ts`
- Reuse: `src/infra/llm/types.ts`

## Steps

### Step 1: Write failing Chat workspace tests

Use an in-memory `Storage` stub and injected LLM invoke factory. Cover:

```ts
import { describe, expect, it, vi } from 'vitest'
import { useChatWorkspace } from '../composables/useChatWorkspace'

describe('useChatWorkspace', () => {
  it('creates a conversation and appends an assistant response', async () => {
    const invoke = vi.fn().mockResolvedValue({ content: '处理结果' })
    const workspace = useChatWorkspace({ invokeFactory: () => invoke })
    workspace.addNewTab()
    workspace.inputMessage.value = '测试内容'

    await workspace.sendMessage()

    expect(workspace.currentTab.value?.messages.map((item) => item.role)).toEqual(['user', 'assistant'])
    expect(workspace.currentTab.value?.messages[1]?.content).toBe('处理结果')
  })

  it('marks an aborted response as stopped', async () => {
    const invoke = vi.fn((_request, signal: AbortSignal) => new Promise((_, reject) => {
      signal.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')))
    }))
    const workspace = useChatWorkspace({ invokeFactory: () => invoke })
    workspace.addNewTab()
    workspace.inputMessage.value = '停止测试'

    const pending = workspace.sendMessage()
    workspace.stopGeneration()
    await pending

    expect(workspace.currentTab.value?.messages[1]?.content).toBe('(已停止)')
  })
})
```

Also test storage compatibility with `chat-tabs-v2` and `chat-active-tab-v2`.

Run the focused test and expect FAIL because the composable does not exist.

### Step 2: Move types and implement dependency injection

Move `Message` and `ChatTab` to `types.ts`. `useChatWorkspace` accepts optional dependencies:

```ts
interface ChatWorkspaceOptions {
  invokeFactory?: (provider: string) => LlmInvoke
  storage?: Pick<Storage, 'getItem' | 'setItem'>
  now?: () => number
}
```

Defaults use `createLlmInvoke`, `localStorage`, and `Date.now`.

### Step 3: Implement shared behavior

Move these behaviors unchanged:

- load/save tabs with existing keys;
- add/close/select tabs;
- first-message conversation naming;
- send, abort, clear, and regenerate;
- loading/error state;
- shared AI config request construction.

Do not move `messagesContainer`, scrolling, settings-dialog visibility, clipboard toasts, or DOM effects into the composable.

### Step 4: Rewire the V1 page

Use `useChatWorkspace()` for all shared state/actions. Keep a page watch on current messages that calls `nextTick()` and scrolls the local container.

Do not change V1 layout or labels in this task.

### Step 5: Verify

```bash
npx vitest run src/features/chat/__tests__/useChatWorkspace.spec.ts
npm test
npm run build
```

Expected: all pass; existing saved conversations load with the same keys.

### Step 6: Commit

```bash
git add src/features/chat src/pages/ChatPage.vue
git commit -m "refactor: extract chat workspace"
```

---
*Last Updated: 2026-07-17 17:10 UTC*
