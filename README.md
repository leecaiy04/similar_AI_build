# Similar AI Build

<div align="center">

**一个强大的多工具文本处理工作台**

[![Live Demo](https://img.shields.io/badge/Demo-Online-success)](https://leecaiy04.github.io/similar_AI_build/#/)
[![Vue](https://img.shields.io/badge/Vue-3.5-42b883)](https://vuejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-3178c6)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Vite-7.2-646cff)](https://vitejs.dev/)
[![License](https://img.shields.io/badge/License-MIT-green)](LICENSE)

</div>

## ✨ 特性

Similar AI Build 是一个功能丰富的文本处理工具集，提供以下核心功能：

### 🔍 相似度比对
- 支持源列表和目标库的批量相似度计算
- 多种相似度算法：混合算法、编辑距离、Jaro-Winkler
- 智能文本预处理（忽略标点、全角转半角、忽略不可见字符）
- 阈值过滤和结果导出/导入

### 📊 数据差异对比
- 支持两组数据的逐行差异比对
- 提供LCS和Myers两种差异算法
- 可视化展示差异结果

### 🛠️ 数据处理
- 重复项检测和管理
- 文本变换（大小写转换、空格处理）
- 正则表达式匹配和提取
- 数据排序和去重

### 🤖 批量AI请求
- 支持OpenAI、Claude、Gemini三种AI服务
- 批量处理文本并获取AI响应
- 预设配置管理和进度跟踪

## 🚀 快速开始

### 在线体验

访问 [生产环境](https://leecaiy04.github.io/similar_AI_build/#/) 立即使用所有功能。

### 本地开发

```bash
# 克隆项目
git clone https://github.com/leecaiy04/similar_AI_build.git
cd similar_AI_build

# 安装依赖
npm install

# 启动开发服务器
npm run dev

# 运行测试
npm run test

# 构建生产版本
npm run build
```

### 桌面应用

```bash
# 启动Tauri开发模式
npm run tauri:dev

# 构建桌面应用
npm run tauri:build
```

## 📁 项目架构

项目采用现代化的分层架构设计：

```
src/
├── core/              # 核心基础层
│   ├── contracts.ts   # 数据契约定义
│   ├── errors.ts      # 错误处理
│   ├── io/            # 输入输出工具（CSV、JSON）
│   ├── state/         # 状态管理（版本化存储、迁移）
│   ├── task/          # 任务队列
│   └── text/          # 文本处理工具
├── features/          # 功能模块层
│   ├── ai-batch/      # 批量AI功能
│   ├── data-processing/ # 数据处理功能
│   ├── diff/          # 差异对比功能
│   └── similarity/    # 相似度功能
├── infra/             # 基础设施层
│   └── llm/           # LLM适配器（OpenAI、Claude、Gemini）
├── pages/             # 页面组件
├── router/            # 路由配置
├── utils/             # 工具函数
└── components/        # 通用组件
```

## 🛠️ 技术栈

### 前端框架
- **Vue 3.5** - 采用Composition API
- **TypeScript 5.9** - 完整类型安全
- **Vite 7.2** - 高性能构建工具
- **Vue Router 4.6** - 路由管理

### UI与样式
- **Element Plus 2.13** - UI组件库
- **Tailwind CSS 4.1** - 原子化CSS框架

### 桌面应用
- **Tauri 2.10** - 跨平台桌面应用框架

### 开发工具
- **Vitest 3.2** - 单元测试框架
- **vue-tsc 3.1** - TypeScript类型检查

## 📝 可用脚本

| 命令 | 说明 |
|------|------|
| `npm run dev` | 启动开发服务器 |
| `npm run test` | 运行单元测试 |
| `npm run test:watch` | 监视模式运行测试 |
| `npm run build` | 构建生产版本 |
| `npm run build:single` | 构建单文件版本 |
| `npm run build:all` | 构建所有版本 |
| `npm run preview` | 预览生产构建 |
| `npm run tauri:dev` | 启动Tauri开发模式 |
| `npm run tauri:build` | 构建Tauri桌面应用 |

## 🧪 测试

项目包含完整的单元测试覆盖：

```bash
# 运行所有测试
npm run test

# 监视模式（开发时使用）
npm run test:watch
```

## 🔄 CI/CD

- **GitHub Pages** - 自动部署到生产环境
- **Release工作流** - 自动构建和发布新版本
- 所有工作流在构建前运行 `npm test` 确保代码质量

## 飞牛 OS 部署

- 已提供手动部署到飞牛的工作流：`.github/workflows/deploy-fnos.yml`
- 飞牛部署目录：`/vol1/1000/code/deplay/similar_AI_build`
- 飞牛访问端口：`53120`
- 详细说明见 `docs/fnos-deploy.md`

## 📄 许可证

本项目采用 MIT 许可证 - 详见 [LICENSE](LICENSE) 文件

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

## 📮 联系方式

如有问题或建议，请通过以下方式联系：

- 提交 [GitHub Issue](https://github.com/leecaiy04/similar_AI_build/issues)

---

<div align="center">

Made with ❤️ by [leecaiy04](https://github.com/leecaiy04)

</div>
