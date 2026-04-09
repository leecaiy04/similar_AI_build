# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 开发命令

在仓库根目录使用 npm。

```bash
npm install
npm run dev
npm test
npm run test:watch
npm run build
npm run build:single
npm run build:all
npm run preview
npm run tauri:dev
npm run tauri:build
```

### 测试命令

Vitest 配置位于 `vitest.config.ts`，会匹配 `src/**/*.spec.ts`。

```bash
# 运行全部测试
npm test

# 监听模式
npm run test:watch

# 运行单个测试文件
npx vitest run src/features/similarity/__tests__/similarityService.spec.ts

# 按测试名称运行单个用例
npx vitest run src/features/similarity/__tests__/similarityService.spec.ts -t "test name"
```

### 构建说明

- `npm run build` 会执行 `vue-tsc -b && vite build`，输出到 `dist/`。
- `npm run build:single` 会用 `vite-plugin-singlefile` 构建单文件版本，输出到 `dist-single/`。
- `npm run build:all` 会同时构建两个版本，并把单文件入口复制到 `dist/single.html` 和 `dist/index/single.html`。
- 当前 `package.json` 里没有单独的 lint 脚本。

## 高层架构

这是一个使用 Vue 3 + TypeScript + Vite 构建的应用，外面包了一层较薄的 Tauri 2 外壳。

- 前端主要逻辑基本都在 `src/` 下。
- `src-tauri/` 目前主要是宿主层胶水代码：Tauri 的开发/打包配置，以及 Rust 侧仅在 debug 模式启用的日志插件。桌面端没有明显的核心业务逻辑。
- 路由在 `src/router/index.ts` 中使用 `createWebHashHistory()`，这与静态部署和 Tauri 的使用方式相匹配。

### UI 与功能分层

整个应用围绕几个工具型工作区组织：

- `src/pages/`：四个工具页面的入口层，分别是相似度、Diff、数据处理、批量 AI。
- `src/App.vue`：全局应用壳，负责顶部导航、暗色模式切换、以及带 `keep-alive` 的路由视图。
- 每个页面本身尽量只保留视图职责，把状态和行为委托给 `src/features/*/composables/` 下的 feature composable。
- feature composable 是主要的编排层，负责响应式状态、本地存储持久化、导入导出、用户触发动作等。
- `src/features/*/service/` 下的 feature service 承载对应功能的领域逻辑；如果要改行为，通常这里是核心落点，也是最适合补测试的地方。

常见调用链是：

`page component -> feature composable -> feature service -> shared core/infra utilities`

### 共享核心模块

`src/core/` 放的是被多个功能复用的基础能力：

- `contracts.ts`、`errors.ts`：公共结果结构和错误结构。
- `io/`：CSV / JSON 导入导出辅助函数。
- `state/`：存储 key、带版本的存储结构、迁移辅助函数。
- `task/`：批量 AI 流程使用的并发队列。
- `text/`：底层文本拆分和归一化辅助逻辑。

需要注意的是，一部分较早的工具函数仍然放在 `src/utils/` 里，例如 `similarity.ts`、`textParser.ts`。仓库目前处于向 `core / features / infra / pages` 分层迁移的过程中，所以新旧两种组织方式会并存。

### Similarity 功能

相似度工具是当前最复杂的功能之一，有几个点如果不跨文件读很难快速看明白：

- `useSimilarityWorkspace.ts` 管理工作区状态，包括阈值/选项、join mode、锁定匹配、导入导出、本地缓存。
- `similarityService.ts` 把 `src/utils/similarity.ts` 里的 `SimilarityCalculator` 封装成更贴近 UI 的行为接口。
- 页面上展示的结果并不是原始比对结果，而是经过 join mode（`left`、`inner`、`right`、`outer`）、阈值过滤、搜索过滤、锁定项覆盖后再生成的展示结果。
- “锁定匹配”是一级概念，不只是 UI 状态，它会被单独持久化，也会参与导出导入。

如果要改匹配逻辑，通常要同时检查：
- `src/features/similarity/service/similarityService.ts`
- `src/features/similarity/composables/useSimilarityWorkspace.ts`

### AI Batch 功能

批量 AI 工具的分层相对清晰，而且是 provider-agnostic 的：

- `useAIBatchWorkspace.ts` 管理预设、prompt 模板、模板变量提取（如 `{{input}}`）、批处理 UI 状态、模型拉取、工作区配置持久化。
- `batchInferenceService.ts` 负责按行渲染 prompt、执行并发任务、把每行结果标准化为 success/error。
- `src/core/task/batchQueue.ts` 提供并发受限的队列和取消能力。
- `src/infra/llm/` 是模型供应商边界层。`createLlmInvoke()` 会根据 provider 选择 OpenAI-compatible、Claude 或 Gemini 的适配器，并统一成同一个 `LlmInvoke` 接口。

如果你修改请求/响应结构或 provider 行为，要确保 `src/infra/llm/types.ts` 与 `batchInferenceService.ts` 保持一致。

### Diff 与数据处理功能

这两个功能基本也遵循同一模式：

- composable 持有工作区响应式状态和持久化逻辑
- service 承担实际的数据转换或对比逻辑
- CSV 导出统一复用 `src/core/io/csv.ts`

总体上，这个仓库更倾向于把逻辑放在 composable / service，而不是塞进 `.vue` 组件里。

## 测试结构

测试基本与代码就近放置，主要位于 `src/core/*` 和 `src/features/*` 下的 `__tests__` 目录。

当前覆盖较明确的区域包括：

- core contracts、CSV IO、versioned storage、batch queue、text splitting
- similarity、diff、data-processing、ai-batch 的 service / composable

由于 Vitest 使用的是 `environment: 'node'`，纯 service / composable 逻辑比 DOM 很重的组件更容易测试。修改业务逻辑时，优先扩展现有的 service / composable 测试。

## Tauri 相关说明

- Tauri 配置在 `src-tauri/tauri.conf.json`。
- Tauri 开发模式通过 `beforeDevCommand` 启动 Vite dev server。
- Tauri 构建通过 `beforeBuildCommand` 执行常规前端构建，并打包 `dist/` 的内容。
- Rust 侧当前主要只是启动应用，并在 debug 模式下开启日志插件。
