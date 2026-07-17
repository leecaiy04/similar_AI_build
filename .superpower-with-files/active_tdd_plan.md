# Dual UI V2 Implementation Plan

> **For Codex:** REQUIRED SUB-SKILL: Use superpowers:spf-exec-plan to implement this plan task-by-task.

**Goal:** Preserve the current interface as V1 and add a complete professional V2 interface under `/v2`, with both versions sharing the same business logic and stored data.

**Architecture:** Keep the current pages as the V1 presentation layer. Add a route-isolated `src/v2` presentation layer and shared version-routing helpers, while reusing existing feature composables/services. Extract Table Merge and Chat orchestration into shared features before creating their V2 pages.

**Tech Stack:** Vue 3.5, TypeScript 5.9, Vue Router 4.6, Element Plus 2.13, Tailwind CSS 4, Vitest 3, `@vue/test-utils`, `happy-dom`, Vite 7, PM2 on FNOS.

complexity: complex

---

## Test Runner Detection

- `package.json` detected: primary command is `npm test`.
- `src-tauri/Cargo.toml` exists, but Rust tests are required only if Rust files change; this plan does not expect Rust changes.
- Build verification: `npm run build` and `npm run build:single`.

### Task 1: Protect the V1 baseline and add the UI test runtime

**Depends on:** None  
**Parallel with:** None  
**Guide:** See `.superpower-with-files/guides/task-1.md`

### Task 2: Add version routing contracts and split the application shells

**Depends on:** Task 1  
**Parallel with:** None  
**Guide:** See `.superpower-with-files/guides/task-2.md`

### Task 3: Build the V2 design tokens and shared workbench shell

**Depends on:** Task 2  
**Parallel with:** Task 4, Task 5  
**Guide:** See `.superpower-with-files/guides/task-3.md`

### Task 4: Extract the Table Merge workspace from the V1 page

**Depends on:** Task 1  
**Parallel with:** Task 3, Task 5  
**Guide:** See `.superpower-with-files/guides/task-4.md`

### Task 5: Extract the Chat workspace from the V1 page

**Depends on:** Task 1  
**Parallel with:** Task 3, Task 4  
**Guide:** See `.superpower-with-files/guides/task-5.md`

### Task 6: Build V2 Similarity and Diff pages

**Depends on:** Task 2, Task 3  
**Parallel with:** Task 7, Task 8  
**Guide:** See `.superpower-with-files/guides/task-6.md`

### Task 7: Build V2 Data Processing and Table Merge pages

**Depends on:** Task 3, Task 4  
**Parallel with:** Task 6, Task 8  
**Guide:** See `.superpower-with-files/guides/task-7.md`

### Task 8: Build V2 Batch AI and Chat pages

**Depends on:** Task 3, Task 5  
**Parallel with:** Task 6, Task 7  
**Guide:** See `.superpower-with-files/guides/task-8.md`

### Task 9: Complete no-AI routing, responsive behavior, and cross-version parity

**Depends on:** Task 2, Task 6, Task 7, Task 8  
**Parallel with:** None  
**Guide:** See `.superpower-with-files/guides/task-9.md`

### Task 10: Run final verification, document operation, and deploy to FNOS

**Depends on:** Task 9  
**Parallel with:** None  
**Guide:** See `.superpower-with-files/guides/task-10.md`

---

Planning phase complete. The plan and guides have been saved to `.superpower-with-files/`. Please review. To proceed, use: **"Execute the plan."**

---
*Last Updated: 2026-07-17 17:20 UTC*
