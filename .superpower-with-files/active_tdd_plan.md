# 智能文本分析 - GitHub Pages 部署实施计划

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 为智能文本分析项目新增 GitHub Pages 自动部署，优化 CI/CD 工作流并发控制（≤2），并完善项目配置。

**Architecture:** 利用 Vite 构建生成静态资源，通过 GitHub Actions 在 push 到 main 分支时自动构建并部署到 GitHub Pages。项目已使用 Hash 路由，天然兼容 GitHub Pages 的子路径部署。新增独立的 Pages 部署工作流，与现有 Tauri 构建发布工作流解耦。

**Tech Stack:** Vue 3 / TypeScript / Vite / GitHub Actions / GitHub Pages / Tailwind CSS v4 / Element Plus

**complexity:** simple

---

## 项目现状

| 模块 | 说明 |
|------|------|
| 框架 | Vue 3 + TypeScript + Vite 7 |
| UI | Element Plus + Tailwind CSS v4 |
| 路由 | Vue Router (Hash 模式，已兼容 Pages) |
| 桌面端 | Tauri v2 (Linux/Windows) |
| CI/CD | deploy.yml - Tauri 构建 + GitHub Release |
| 页面 | SimilarityPage / DiffPage / DataProcessingPage / AIBatchPage |

---

## Task 1: 更新 Vite 配置以支持 GitHub Pages

**Depends on:** None
**Parallel with:** None

**Files:**
- Modify: `vite.config.ts`

**Step 1: 修改 vite.config.ts，增加 base 配置和构建输出目录**

当前 `vite.config.ts` 使用默认配置，没有指定 `base`。GitHub Pages 通常部署在 `https://<user>.github.io/<repo>/` 路径下，需要设置 `base` 为仓库名。

```typescript
// vite.config.ts
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [vue(), tailwindcss()],
  base: './',  // 相对路径，兼容 GitHub Pages 子路径部署
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  }
})
```

说明：
- `base: './'` 使用相对路径，无需硬编码仓库名
- 项目已使用 `createWebHashHistory()`，路由天然兼容子路径

**Step 2: 验证构建**

Run: `npm run build`
Expected: 成功生成 `dist/` 目录

---

## Task 2: 创建 GitHub Pages 部署工作流

**Depends on:** Task 1
**Parallel with:** None

**Files:**
- Create: `.github/workflows/pages.yml`

**Step 1: 创建 pages.yml 工作流文件**

```yaml
name: Deploy to GitHub Pages

on:
  push:
    branches: [main]
  workflow_dispatch:

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: "pages"
  cancel-in-progress: false

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Build
        run: npm run build

      - name: Setup Pages
        uses: actions/configure-pages@v5

      - name: Upload artifact
        uses: actions/upload-pages-artifact@v3
        with:
          path: dist

  deploy:
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    runs-on: ubuntu-latest
    needs: build
    steps:
      - name: Deploy to GitHub Pages
        id: deployment
        uses: actions/deploy-pages@v4
```

关键点：
- 使用 `concurrency` 控制 Pages 部署不会并发执行
- 使用 GitHub 官方 `actions/deploy-pages` 实现零配置部署
- 仅构建 Web 前端（不涉及 Tauri/Rust），构建速度快

**Step 2: 提交验证**

```bash
git add .github/workflows/pages.yml vite.config.ts
git commit -m "feat: add GitHub Pages deployment workflow"
```

---

## Task 3: 优化现有 Tauri 构建工作流的并发控制

**Depends on:** None
**Parallel with:** Task 2

**Files:**
- Modify: `.github/workflows/deploy.yml`

**Step 1: 在 deploy.yml 顶部添加 concurrency 配置**

当前 `deploy.yml` 的 matrix 有 2 个平台（ubuntu + windows），并发数为 2，但缺少 `concurrency` 组级限制。需要添加：

```yaml
concurrency:
  group: "tauri-build-${{ github.ref }}"
  cancel-in-progress: true
```

这确保：
- 同一分支/标签的构建不会并发超过 2 个（matrix 本身已是 2）
- 新的推送会取消旧的构建，节省资源

同时修复 Linux 平台打包步骤中的 tag 引用问题（当前 `htmldist_v${{ github.ref_name }}.zip` 在非 tag push 时会失败）：

```yaml
      - name: Package Dist (Zip)
        if: matrix.platform == 'linux' && startsWith(github.ref, 'refs/tags/v')
        run: |
          zip -r htmldist_v${{ github.ref_name }}.zip dist/
          cp dist-single/index.html similar_ai_single_file.html
```

**Step 2: 提交验证**

```bash
git add .github/workflows/deploy.yml
git commit -m "fix: add concurrency control and fix tag-only zip step"
```

---

## Task 4: 更新 index.html 标题和元信息

**Depends on:** None
**Parallel with:** Task 1, Task 2, Task 3

**Files:**
- Modify: `index.html`

**Step 1: 更新 HTML 元信息**

```html
<!doctype html>
<html lang="zh-CN">

<head>
  <meta charset="UTF-8" />
  <link rel="icon" type="image/svg+xml" href="/vite.svg" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta name="description" content="智能文本分析 - 相似度比对/数据Diff/数据处理/批量AI请求" />
  <title>智能文本分析 - 多功能文本工具集</title>
</head>

<body>
  <div id="app"></div>
  <script type="module" src="/src/main.ts"></script>
</body>

</html>
```

---

## Task 5: 启用 GitHub Pages 配置

**Depends on:** Task 2
**Parallel with:** None

**Step 1: 通过 GitHub CLI 或仓库设置启用 Pages**

在仓库 Settings > Pages 中：
- Source: 选择 "GitHub Actions"

此步骤需要用户在 GitHub 仓库设置页面手动操作，或通过 `gh` CLI：

```bash
gh api repos/{owner}/{repo}/pages -X POST -f "source[branch]=main" -f "source[path]=/"
gh api repos/{owner}/{repo}/pages -X PUT -f "build_type=workflow"
```

---

## 工作流架构总览

```
push to main
├── pages.yml        → 构建 Web → 部署到 GitHub Pages (快速，~30s)
└── deploy.yml       → 构建 Tauri 桌面端 (Linux + Windows，较慢)
    └── tag push     → 创建 GitHub Release
```

两个工作流完全解耦，互不影响：
- `pages.yml` 仅构建前端，响应迅速
- `deploy.yml` 负责 Tauri 桌面端打包和发布
- 并发限制：Pages ≤1（串行），Tauri ≤2（两个平台并行）

---
*Last Updated: 2026-04-03 05:30 UTC*
