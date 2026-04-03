# Unified Product Iteration (AI Batch + Data Processing + Similarity/Diff) Implementation Plan

> **For Codex:** REQUIRED SUB-SKILL: Use superpowers:spf-exec-plan to implement this plan task-by-task.

**Goal:** Refactor the current multi-tool app into a layered architecture that preserves behavior while enabling faster feature delivery across AI Batch, Data Processing, Similarity, and Diff.

**Architecture:** Keep pages as UI entry points, move business logic into feature modules, and centralize shared capabilities in `core` and `infra` layers. Deliver incrementally with backward-compatible adapters and TDD-first checkpoints.

**Tech Stack:** Vue 3, TypeScript, Vite, Element Plus, Tauri v2, Vitest

**complexity:** complex

---

## Test Runner Detection

1. `package.json` detected -> primary test command: `npm test` (wire to Vitest).
2. `src-tauri/Cargo.toml` detected -> secondary command: `cargo test` (only if Rust files are touched).

---

### Task 1: Establish Test Harness and Shared Contracts

**Depends on:** None  
**Parallel with:** None  
**Guide:** See `guides/task-1.md`

### Task 2: Build Core Text and IO Modules

**Depends on:** Task 1  
**Parallel with:** Task 3  
**Guide:** See `guides/task-2.md`

### Task 3: Build Shared Task Queue and LLM Adapter Layer

**Depends on:** Task 1  
**Parallel with:** Task 2  
**Guide:** See `guides/task-3.md`

### Task 4: Refactor Similarity and Diff to Feature Layer

**Depends on:** Task 2  
**Parallel with:** Task 5  
**Guide:** See `guides/task-4.md`

### Task 5: Refactor Data Processing and AI Batch to Feature Layer

**Depends on:** Task 2, Task 3  
**Parallel with:** Task 4  
**Guide:** See `guides/task-5.md`

### Task 6: Integrate Pages, Storage Migration, and CI Verification

**Depends on:** Task 4, Task 5  
**Parallel with:** None  
**Guide:** See `guides/task-6.md`

---

Planning phase complete. The plan and guides have been saved to `.superpower-with-files/`. Please review. To proceed, use: **"Execute the plan."**

---
*Last Updated: 2026-04-03 06:55 UTC*
