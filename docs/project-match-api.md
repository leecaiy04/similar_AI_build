# 项目查询 / 相似匹配 API

## 接口

- `POST /api/project-match`
- `POST /api/project-query`
- `GET /api/project-match`
- `GET /api/project-query`
- `GET /api/project-match/cache/stats`：查看缓存统计

默认使用 SQLite 缓存：同一 namespace、provider、项目、候选列表、模型、baseUrl、prompt 等参数相同，会直接返回缓存结果。

如需强制重新查询，传入：

- Query：`?new=1` 或 `?refresh=1`
- Body：`{"new": true}` 或 `{"refresh": true}`

## 本地相似度模式（默认）

不调用外部 AI，适合快速项目名称匹配。

```bash
curl -sS -X POST http://127.0.0.1:56600/api/project-match \
  -H 'Content-Type: application/json' \
  --data '{
    "namespace": "demo",
    "provider": "local",
    "project": "杭州市滨江区智慧园区建设项目",
    "candidates": ["滨江智慧园区建设工程", "西湖区道路改造项目", "智慧园区平台项目"],
    "limit": 3
  }'
```

返回字段重点：

- `cached`: 是否来自缓存
- `refreshed`: 是否本次强制刷新
- `cacheKey`: 缓存键
- `result.bestMatch`: 最佳匹配项目
- `result.score`: 相似度分数
- `result.matches`: Top-N 候选结果

## OpenAI-compatible 模式

会调用 `/v1/chat/completions`，并将结果写入 SQLite 缓存。

```bash
curl -sS -X POST http://127.0.0.1:56600/api/project-match \
  -H 'Content-Type: application/json' \
  --data '{
    "namespace": "demo-ai",
    "provider": "openai",
    "baseUrl": "http://118.89.81.103:8081/v1",
    "model": "gpt-5.5",
    "project": "杭州市滨江区智慧园区建设项目",
    "candidates": ["滨江智慧园区建设工程", "西湖区道路改造项目"],
    "new": true
  }'
```

## Claude 模式

会调用 Anthropic `/v1/messages` 兼容接口，并将结果写入 SQLite 缓存。

```bash
curl -sS -X POST http://127.0.0.1:56600/api/project-match \
  -H 'Content-Type: application/json' \
  --data '{
    "namespace": "demo-claude",
    "provider": "claude",
    "baseUrl": "http://118.89.81.103:8081",
    "model": "claude-opus-4-8",
    "project": "杭州市滨江区智慧园区建设项目",
    "candidates": ["滨江智慧园区建设工程", "西湖区道路改造项目"],
    "new": true
  }'
```

## 缓存位置

默认 SQLite 文件：

```text
/vol1/1000/code/similar_AI_build/data/api-cache.sqlite
```

可通过环境变量覆盖：

- `DEFAULT_AI_API_KEY`：OpenAI-compatible / Claude 请求的默认 API Key
- `DEFAULT_OPENAI_BASE_URL`
- `DEFAULT_OPENAI_MODEL`
- `DEFAULT_CLAUDE_BASE_URL`
- `DEFAULT_CLAUDE_MODEL`
- `SIMILAR_API_CACHE_DIR`
- `SIMILAR_API_CACHE_DB`

## 缓存统计

```bash
curl -sS http://127.0.0.1:56600/api/project-match/cache/stats
```
