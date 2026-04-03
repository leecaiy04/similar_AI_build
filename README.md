# Similar AI Build

Multi-tool text workflow app built with Vue 3, TypeScript, Vite, and Tauri.

## Live Demo

🚀 **Production**: https://leecaiy04.github.io/similar_AI_build/#/

## Features

- Similarity matching
- Row-by-row diff comparison
- Data processing helpers
- Batch AI request tooling

## Development

```bash
npm install
npm test
npm run build
```

## Architecture

The project is being migrated toward a layered structure:

- `src/core`: shared primitives such as text parsing, IO helpers, task queue, and versioned storage
- `src/features`: feature-level services and composables for each tool page
- `src/infra`: provider adapters and external integration boundaries
- `src/pages`: page-level UI entry points

## CI

Both GitHub Pages and release workflows now run `npm test` before build steps.
