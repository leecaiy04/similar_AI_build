import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import https from 'https';
import crypto from 'crypto';
import { HttpsProxyAgent } from 'https-proxy-agent';
import { ProxyAgent } from 'undici';
import { DatabaseSync } from 'node:sqlite';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 56600;
const PROXY_URL = process.env.PROXY_URL || ''; // 可选的上游代理

function normalizeOpenAIBaseUrl(baseUrl) {
  const trimmed = String(baseUrl || '').trim().replace(/\/+$/, '');
  if (!trimmed) return trimmed;
  return /\/v\d+$/i.test(trimmed) ? trimmed : `${trimmed}/v1`;
}

function buildOpenAITargetUrl(baseUrl, suffix) {
  return `${normalizeOpenAIBaseUrl(baseUrl)}${suffix}`;
}

const OPENAI_PROXY_DISPATCHER = PROXY_URL ? new ProxyAgent(PROXY_URL) : null;

async function fetchWithProxyFallback(url, options) {
  try {
    return await fetch(url, options);
  } catch (error) {
    if (!OPENAI_PROXY_DISPATCHER) throw error;
    console.warn(`[OpenAI代理] 直连失败，改用上游代理 ${PROXY_URL}: ${error.message}`);
    return fetch(url, { ...options, dispatcher: OPENAI_PROXY_DISPATCHER });
  }
}

async function readJsonOrText(response) {
  const text = await response.text();
  try {
    return { body: JSON.parse(text), raw: text };
  } catch {
    return { body: { error: text || response.statusText }, raw: text };
  }
}

const DEFAULT_AI_API_KEY = process.env.DEFAULT_AI_API_KEY || '';
const DEFAULT_OPENAI_BASE_URL = process.env.DEFAULT_OPENAI_BASE_URL || 'http://118.89.81.103:8081/v1';
const DEFAULT_OPENAI_MODEL = process.env.DEFAULT_OPENAI_MODEL || 'gpt-5.5';
const DEFAULT_CLAUDE_BASE_URL = process.env.DEFAULT_CLAUDE_BASE_URL || 'http://118.89.81.103:8081';
const DEFAULT_CLAUDE_MODEL = process.env.DEFAULT_CLAUDE_MODEL || 'claude-opus-4-8';
const DEFAULT_AI_TEXT_PROVIDER = process.env.DEFAULT_AI_TEXT_PROVIDER || 'openai';
const DEFAULT_AI_TEXT_MODEL = process.env.DEFAULT_AI_TEXT_MODEL || DEFAULT_OPENAI_MODEL;
const DEFAULT_AI_TEXT_FALLBACK_MODELS = (process.env.DEFAULT_AI_TEXT_FALLBACK_MODELS || 'ccvibe-4-8,claude-fable-5,claude-opus-4-8')
  .split(',')
  .map((model) => model.trim())
  .filter(Boolean);
const CACHE_DIR = process.env.SIMILAR_API_CACHE_DIR || path.join(__dirname, 'data');
const CACHE_DB_PATH = process.env.SIMILAR_API_CACHE_DB || path.join(CACHE_DIR, 'api-cache.sqlite');

fs.mkdirSync(CACHE_DIR, { recursive: true });
const cacheDb = new DatabaseSync(CACHE_DB_PATH);
cacheDb.exec(`
  CREATE TABLE IF NOT EXISTS project_query_cache (
    cache_key TEXT PRIMARY KEY,
    namespace TEXT NOT NULL,
    provider TEXT NOT NULL,
    model TEXT NOT NULL,
    base_url TEXT NOT NULL,
    project TEXT NOT NULL,
    request_json TEXT NOT NULL,
    response_json TEXT NOT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    hit_count INTEGER NOT NULL DEFAULT 0
  );
  CREATE INDEX IF NOT EXISTS idx_project_query_cache_project ON project_query_cache(project);
  CREATE INDEX IF NOT EXISTS idx_project_query_cache_updated_at ON project_query_cache(updated_at);

  CREATE TABLE IF NOT EXISTS ai_text_cache (
    cache_key TEXT PRIMARY KEY,
    namespace TEXT NOT NULL,
    provider TEXT NOT NULL,
    model TEXT NOT NULL,
    actual_model TEXT,
    base_url TEXT NOT NULL,
    prompt TEXT NOT NULL,
    request_json TEXT NOT NULL,
    response_text TEXT NOT NULL,
    response_json TEXT NOT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    hit_count INTEGER NOT NULL DEFAULT 0
  );
  CREATE INDEX IF NOT EXISTS idx_ai_text_cache_updated_at ON ai_text_cache(updated_at);
`);

function stableStringify(value) {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map((item) => stableStringify(item)).join(',')}]`;
  return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`).join(',')}}`;
}

function sha256(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

function normalizeProjectText(value) {
  return String(value || '')
    .normalize('NFKC')
    .toLowerCase()
    .replace(/[\u0000-\u001f\u007f-\u009f]/g, '')
    .replace(/[^\w\u4e00-\u9fff]+/g, '')
    .trim();
}

function parseCandidates(value) {
  if (Array.isArray(value)) return value.map((item) => String(item).trim()).filter(Boolean);
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) return [];
    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed)) return parsed.map((item) => String(item).trim()).filter(Boolean);
    } catch {
      // ignore non-JSON strings
    }
    return trimmed.split(/[\n,，;；|]+/).map((item) => item.trim()).filter(Boolean);
  }
  return [];
}

function isForceRefresh(req) {
  const value = req.query.new ?? req.query.refresh ?? req.body?.new ?? req.body?.refresh ?? req.body?.mode;
  if (typeof value === 'boolean') return value;
  return ['1', 'true', 'yes', 'y', 'new', 'refresh', 'force'].includes(String(value || '').toLowerCase());
}

function buildProjectMatchPrompt(project, candidates, instruction) {
  const candidatesText = candidates.map((candidate, index) => `${index + 1}. ${candidate}`).join('\n');
  return `${instruction || '请判断待查询项目在候选项目中最可能匹配哪一个。'}\n\n待查询项目：${project}\n\n候选项目：\n${candidatesText}\n\n请只返回 JSON，格式如下：{"bestMatch":"候选项目或空字符串","matchIndex":0,"confidence":"高/中/低","reason":"30字以内理由","isSameProject":true}`;
}


function parseJoinedContent(value) {
  const raw = String(value || '').trim();
  if (!raw) return null;
  let parts = [];
  if (raw.includes('|||')) {
    parts = raw.split('|||');
  } else if (raw.includes('@@')) {
    parts = raw.split('@@');
  } else if (raw.includes('\n')) {
    parts = raw.split(/\n+/);
  } else if (raw.includes('=>')) {
    const [projectPart, candidatesPart = ''] = raw.split('=>');
    parts = [projectPart, ...candidatesPart.split(/[|,，;；]+/)];
  } else {
    parts = raw.split(/[|,，;；]+/);
  }
  const cleaned = parts.map((item) => item.trim()).filter(Boolean);
  if (cleaned.length < 2) return null;
  return {
    project: cleaned[0],
    candidates: cleaned.slice(1),
  };
}

function normalizeShortcutPayload(payload) {
  const content = payload.content ?? payload.q ?? payload.text ?? payload.input;
  const parsed = parseJoinedContent(content);
  if (!parsed) return payload;
  return {
    provider: 'local',
    limit: 1,
    field: 'bestMatch',
    format: 'text',
    ...payload,
    project: payload.project ?? payload.source ?? parsed.project,
    candidates: payload.candidates ?? payload.targets ?? payload.targetList ?? parsed.candidates,
    field: payload.field ?? payload.return ?? payload.output ?? 'bestMatch',
    format: payload.format ?? 'text',
  };
}

function buildCacheRequest(payload) {
  payload = normalizeShortcutPayload(payload);
  const provider = payload.provider === 'claude' || payload.provider === 'openai' ? payload.provider : 'local';
  const project = String(payload.project ?? payload.source ?? payload.query ?? '').trim();
  const candidates = parseCandidates(payload.candidates ?? payload.targets ?? payload.targetList);
  const namespace = String(payload.namespace || 'default');
  const baseUrl = String(
    payload.baseUrl || (provider === 'claude' ? DEFAULT_CLAUDE_BASE_URL : provider === 'openai' ? DEFAULT_OPENAI_BASE_URL : 'local')
  ).trim();
  const model = String(
    payload.model || (provider === 'claude' ? DEFAULT_CLAUDE_MODEL : provider === 'openai' ? DEFAULT_OPENAI_MODEL : 'local-similarity-v1')
  ).trim();
  const systemPrompt = String(payload.systemPrompt || '你是项目名称匹配专家，请严格返回 JSON。');
  const prompt = payload.prompt ? String(payload.prompt) : buildProjectMatchPrompt(project, candidates, payload.instruction);
  const limit = Math.max(1, Math.min(50, Number(payload.limit || 10)));

  return {
    namespace,
    provider,
    baseUrl,
    model,
    project,
    candidates,
    prompt,
    systemPrompt,
    limit,
    options: {
      threshold: Number.isFinite(Number(payload.threshold)) ? Number(payload.threshold) : 0,
    },
  };
}

function makeCacheKey(cacheRequest) {
  // API Key intentionally excluded: cache is keyed by query semantics, not credentials.
  return sha256(stableStringify(cacheRequest));
}

function getCachedResult(cacheKey) {
  return cacheDb.prepare('SELECT * FROM project_query_cache WHERE cache_key = ?').get(cacheKey);
}

function saveCachedResult(cacheKey, cacheRequest, responsePayload) {
  const now = new Date().toISOString();
  const existing = getCachedResult(cacheKey);
  cacheDb.prepare(`
    INSERT INTO project_query_cache (
      cache_key, namespace, provider, model, base_url, project,
      request_json, response_json, created_at, updated_at, hit_count
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0)
    ON CONFLICT(cache_key) DO UPDATE SET
      response_json = excluded.response_json,
      request_json = excluded.request_json,
      provider = excluded.provider,
      model = excluded.model,
      base_url = excluded.base_url,
      project = excluded.project,
      updated_at = excluded.updated_at
  `).run(
    cacheKey,
    cacheRequest.namespace,
    cacheRequest.provider,
    cacheRequest.model,
    cacheRequest.baseUrl,
    cacheRequest.project,
    JSON.stringify(cacheRequest),
    JSON.stringify(responsePayload),
    existing?.created_at || now,
    now,
  );
}

function markCacheHit(cacheKey) {
  cacheDb.prepare('UPDATE project_query_cache SET hit_count = hit_count + 1 WHERE cache_key = ?').run(cacheKey);
}

function levenshteinDistance(a, b) {
  if (a === b) return 0;
  if (!a) return b.length;
  if (!b) return a.length;
  const previous = Array.from({ length: b.length + 1 }, (_, index) => index);
  const current = new Array(b.length + 1);
  for (let i = 1; i <= a.length; i++) {
    current[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      current[j] = Math.min(current[j - 1] + 1, previous[j] + 1, previous[j - 1] + cost);
    }
    for (let j = 0; j <= b.length; j++) previous[j] = current[j];
  }
  return previous[b.length];
}

function ngrams(value, size = 2) {
  if (!value) return new Set();
  if (value.length <= size) return new Set([value]);
  const result = new Set();
  for (let index = 0; index <= value.length - size; index++) result.add(value.slice(index, index + size));
  return result;
}

function jaccard(left, right) {
  if (left.size === 0 && right.size === 0) return 1;
  const union = new Set([...left, ...right]);
  let intersection = 0;
  for (const item of left) if (right.has(item)) intersection++;
  return union.size ? intersection / union.size : 0;
}

function localSimilarity(a, b) {
  const left = normalizeProjectText(a);
  const right = normalizeProjectText(b);
  if (!left && !right) return 1;
  if (!left || !right) return 0;
  if (left === right) return 1;
  const edit = 1 - levenshteinDistance(left, right) / Math.max(left.length, right.length);
  const gram = jaccard(ngrams(left, 2), ngrams(right, 2));
  const containment = left.includes(right) || right.includes(left) ? Math.min(left.length, right.length) / Math.max(left.length, right.length) : 0;
  return Math.max(0, Math.min(1, edit * 0.55 + gram * 0.35 + containment * 0.10));
}

function confidenceFromScore(score) {
  if (score >= 0.9) return '高';
  if (score >= 0.7) return '中';
  if (score >= 0.5) return '低';
  return '很低';
}

function runLocalProjectMatch(cacheRequest) {
  if (!cacheRequest.project) throw new Error('project/source/query is required');
  if (!cacheRequest.candidates.length) throw new Error('candidates/targets/targetList is required for local project matching');
  const matches = cacheRequest.candidates
    .map((candidate, index) => ({
      text: candidate,
      index,
      similarity: Number(localSimilarity(cacheRequest.project, candidate).toFixed(6)),
    }))
    .sort((left, right) => right.similarity - left.similarity)
    .slice(0, cacheRequest.limit);
  const best = matches[0] || null;
  return {
    type: 'local_similarity',
    project: cacheRequest.project,
    bestMatch: best?.text || null,
    matchIndex: best?.index ?? -1,
    score: best?.similarity || 0,
    confidence: confidenceFromScore(best?.similarity || 0),
    reason: best ? `本地相似度最高：${(best.similarity * 100).toFixed(2)}%` : '没有候选项',
    matches,
  };
}

function extractJsonObject(text) {
  if (!text) return null;
  try { return JSON.parse(text); } catch { /* ignore */ }
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) return null;
  try { return JSON.parse(match[0]); } catch { return null; }
}

async function runOpenAIProjectMatch(cacheRequest, apiKey) {
  const targetUrl = buildOpenAITargetUrl(cacheRequest.baseUrl, '/chat/completions');
  const response = await fetchWithProxyFallback(targetUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey || DEFAULT_AI_API_KEY}`,
    },
    body: JSON.stringify({
      model: cacheRequest.model,
      messages: [
        { role: 'system', content: cacheRequest.systemPrompt },
        { role: 'user', content: cacheRequest.prompt },
      ],
    }),
  });
  const { body, raw } = await readJsonOrText(response);
  if (!response.ok) {
    const message = body?.error?.message || body?.message || raw || response.statusText;
    const error = new Error(message);
    error.status = response.status;
    error.upstream = body;
    throw error;
  }
  const content = body.choices?.[0]?.message?.content || '';
  return {
    type: 'openai',
    project: cacheRequest.project,
    parsed: extractJsonObject(content),
    content,
    upstreamUsage: body.usage || null,
  };
}

async function runClaudeProjectMatch(cacheRequest, apiKey) {
  const targetUrl = cacheRequest.baseUrl.endsWith('/') ? `${cacheRequest.baseUrl}v1/messages` : `${cacheRequest.baseUrl}/v1/messages`;
  const response = await fetchWithProxyFallback(targetUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey || DEFAULT_AI_API_KEY,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: cacheRequest.model,
      system: cacheRequest.systemPrompt,
      messages: [{ role: 'user', content: cacheRequest.prompt }],
      max_tokens: 1024,
    }),
  });
  const { body, raw } = await readJsonOrText(response);
  if (!response.ok) {
    const message = body?.error?.message || body?.message || raw || response.statusText;
    const error = new Error(message);
    error.status = response.status;
    error.upstream = body;
    throw error;
  }
  const content = body.content?.[0]?.text || '';
  return {
    type: 'claude',
    project: cacheRequest.project,
    parsed: extractJsonObject(content),
    content,
    upstreamUsage: body.usage || null,
  };
}

async function computeProjectQueryResult(cacheRequest, apiKey) {
  if (cacheRequest.provider === 'openai') return runOpenAIProjectMatch(cacheRequest, apiKey);
  if (cacheRequest.provider === 'claude') return runClaudeProjectMatch(cacheRequest, apiKey);
  return runLocalProjectMatch(cacheRequest);
}



function buildAiTextRequest(payload) {
  const provider = payload.provider === 'claude' ? 'claude' : 'openai';
  const content = String(payload.content ?? payload.prompt ?? payload.q ?? payload.text ?? payload.input ?? '').trim();
  const namespace = String(payload.namespace || 'default');
  const baseUrl = String(payload.baseUrl || (provider === 'claude' ? DEFAULT_CLAUDE_BASE_URL : DEFAULT_OPENAI_BASE_URL)).trim();
  const explicitModel = Boolean(payload.model);
  const model = String(payload.model || (provider === 'claude' ? DEFAULT_CLAUDE_MODEL : DEFAULT_AI_TEXT_MODEL)).trim();
  const systemPrompt = String(payload.systemPrompt ?? payload.system ?? '你是一个可靠、简洁的中文助手。请直接回答用户请求，不要输出多余说明。');
  const temperature = Number.isFinite(Number(payload.temperature)) ? Number(payload.temperature) : 0.2;
  const maxTokens = Number.isFinite(Number(payload.maxTokens ?? payload.max_tokens)) ? Number(payload.maxTokens ?? payload.max_tokens) : 1024;
  if (!content) throw new Error('content/prompt/q/text/input is required');
  return {
    namespace,
    provider,
    baseUrl,
    model,
    explicitModel,
    fallbackModels: explicitModel || provider === 'claude' ? [] : DEFAULT_AI_TEXT_FALLBACK_MODELS,
    content,
    systemPrompt,
    temperature,
    maxTokens,
  };
}

function makeAiTextCacheKey(aiRequest) {
  return sha256(stableStringify({
    namespace: aiRequest.namespace,
    provider: aiRequest.provider,
    baseUrl: aiRequest.baseUrl,
    model: aiRequest.model,
    fallbackModels: aiRequest.fallbackModels,
    content: aiRequest.content,
    systemPrompt: aiRequest.systemPrompt,
    temperature: aiRequest.temperature,
    maxTokens: aiRequest.maxTokens,
  }));
}

function getCachedAiText(cacheKey) {
  return cacheDb.prepare('SELECT * FROM ai_text_cache WHERE cache_key = ?').get(cacheKey);
}

function markAiTextCacheHit(cacheKey) {
  cacheDb.prepare('UPDATE ai_text_cache SET hit_count = hit_count + 1 WHERE cache_key = ?').run(cacheKey);
}

function saveCachedAiText(cacheKey, aiRequest, responsePayload) {
  const now = new Date().toISOString();
  const existing = getCachedAiText(cacheKey);
  cacheDb.prepare(`
    INSERT INTO ai_text_cache (
      cache_key, namespace, provider, model, actual_model, base_url, prompt,
      request_json, response_text, response_json, created_at, updated_at, hit_count
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0)
    ON CONFLICT(cache_key) DO UPDATE SET
      actual_model = excluded.actual_model,
      request_json = excluded.request_json,
      response_text = excluded.response_text,
      response_json = excluded.response_json,
      updated_at = excluded.updated_at
  `).run(
    cacheKey,
    aiRequest.namespace,
    aiRequest.provider,
    aiRequest.model,
    responsePayload.actualModel || aiRequest.model,
    aiRequest.baseUrl,
    aiRequest.content,
    JSON.stringify(aiRequest),
    responsePayload.content || '',
    JSON.stringify(responsePayload),
    existing?.created_at || now,
    now,
  );
}

function isRetryableOpenAIModelError(error) {
  const message = String(error?.message || '').toLowerCase();
  const type = String(error?.upstream?.error?.type || '').toLowerCase();
  return error?.status === 404 || type.includes('model') || message.includes('model');
}

async function runOpenAITextOnce(aiRequest, apiKey, model) {
  const targetUrl = buildOpenAITargetUrl(aiRequest.baseUrl, '/chat/completions');
  const response = await fetchWithProxyFallback(targetUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey || DEFAULT_AI_API_KEY}`,
    },
    body: JSON.stringify({
      model,
      temperature: aiRequest.temperature,
      messages: [
        { role: 'system', content: aiRequest.systemPrompt },
        { role: 'user', content: aiRequest.content },
      ],
    }),
  });
  const { body, raw } = await readJsonOrText(response);
  if (!response.ok) {
    const message = body?.error?.message || body?.message || raw || response.statusText;
    const error = new Error(message);
    error.status = response.status;
    error.upstream = body;
    throw error;
  }
  return {
    provider: 'openai',
    requestedModel: aiRequest.model,
    actualModel: body.model || model,
    content: body.choices?.[0]?.message?.content || '',
    upstreamUsage: body.usage || null,
  };
}

async function runOpenAIText(aiRequest, apiKey) {
  const modelsToTry = Array.from(new Set([aiRequest.model, ...aiRequest.fallbackModels].filter(Boolean)));
  let lastError = null;
  for (const model of modelsToTry) {
    try {
      return await runOpenAITextOnce(aiRequest, apiKey, model);
    } catch (error) {
      lastError = error;
      if (aiRequest.explicitModel || !isRetryableOpenAIModelError(error)) throw error;
      console.warn(`[AI文本API] 模型 ${model} 不可用，尝试下一个备用模型: ${error.message}`);
    }
  }
  throw lastError || new Error('No available model');
}

async function runClaudeText(aiRequest, apiKey) {
  const targetUrl = aiRequest.baseUrl.endsWith('/') ? `${aiRequest.baseUrl}v1/messages` : `${aiRequest.baseUrl}/v1/messages`;
  const response = await fetchWithProxyFallback(targetUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey || DEFAULT_AI_API_KEY,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: aiRequest.model,
      system: aiRequest.systemPrompt,
      messages: [{ role: 'user', content: aiRequest.content }],
      max_tokens: aiRequest.maxTokens,
      temperature: aiRequest.temperature,
    }),
  });
  const { body, raw } = await readJsonOrText(response);
  if (!response.ok) {
    const message = body?.error?.message || body?.message || raw || response.statusText;
    const error = new Error(message);
    error.status = response.status;
    error.upstream = body;
    throw error;
  }
  return {
    provider: 'claude',
    requestedModel: aiRequest.model,
    actualModel: body.model || aiRequest.model,
    content: body.content?.[0]?.text || '',
    upstreamUsage: body.usage || null,
  };
}

async function computeAiTextResult(aiRequest, apiKey) {
  if (aiRequest.provider === 'claude') return runClaudeText(aiRequest, apiKey);
  return runOpenAIText(aiRequest, apiKey);
}

function sendAiTextResponse(req, res, responsePayload, payload) {
  res.set('X-Cache', responsePayload.cached ? 'HIT' : 'MISS');
  if (responsePayload.cacheKey) res.set('X-Cache-Key', responsePayload.cacheKey);
  const format = String(payload.format || req.query.format || '').toLowerCase();
  if (format === 'json') return res.json(responsePayload);
  return res.type('text/plain; charset=utf-8').send(responsePayload.result?.content || '');
}

async function handleAiTextRequest(req, res) {
  try {
    const payload = req.method === 'GET'
      ? {
          namespace: req.query.namespace,
          provider: req.query.provider,
          content: req.query.content ?? req.query.prompt ?? req.query.q ?? req.query.text ?? req.query.input,
          systemPrompt: req.query.systemPrompt ?? req.query.system,
          baseUrl: req.query.baseUrl,
          model: req.query.model,
          apiKey: req.query.apiKey,
          temperature: req.query.temperature,
          maxTokens: req.query.maxTokens ?? req.query.max_tokens,
          format: req.query.format,
          new: req.query.new ?? req.query.refresh,
        }
      : (req.body || {});
    const aiRequest = buildAiTextRequest(payload);
    const cacheKey = makeAiTextCacheKey(aiRequest);
    const forceRefresh = isForceRefresh({ ...req, body: payload });
    if (!forceRefresh) {
      const cached = getCachedAiText(cacheKey);
      if (cached) {
        markAiTextCacheHit(cacheKey);
        return sendAiTextResponse(req, res, {
          ok: true,
          cached: true,
          cacheKey,
          hitCount: cached.hit_count + 1,
          createdAt: cached.created_at,
          updatedAt: cached.updated_at,
          request: JSON.parse(cached.request_json),
          result: JSON.parse(cached.response_json),
        }, payload);
      }
    }
    const result = await computeAiTextResult(aiRequest, payload.apiKey);
    saveCachedAiText(cacheKey, aiRequest, result);
    return sendAiTextResponse(req, res, {
      ok: true,
      cached: false,
      refreshed: forceRefresh,
      cacheKey,
      request: aiRequest,
      result,
    }, payload);
  } catch (error) {
    console.error('[AI文本API错误]', error.message);
    return res.status(error.status || 500).json({ ok: false, error: error.message, upstream: error.upstream });
  }
}

function getProjectMatchFieldValue(payload, responsePayload) {
  const field = String(payload.field || payload.return || payload.output || '').trim();
  if (!field) return undefined;
  const result = responsePayload.result || {};
  const fieldMap = {
    bestMatch: result.bestMatch ?? result.parsed?.bestMatch,
    matchIndex: result.matchIndex ?? result.parsed?.matchIndex,
    score: result.score,
    confidence: result.confidence ?? result.parsed?.confidence,
    reason: result.reason ?? result.parsed?.reason,
    cached: responsePayload.cached,
    cacheKey: responsePayload.cacheKey,
    content: result.content,
  };
  if (Object.prototype.hasOwnProperty.call(fieldMap, field)) return fieldMap[field];
  return field.split('.').reduce((current, key) => current?.[key], responsePayload);
}

function sendProjectMatchResponse(req, res, responsePayload, payload) {
  const value = getProjectMatchFieldValue(payload, responsePayload);
  const format = String(payload.format || req.query.format || '').toLowerCase();
  if (value !== undefined) {
    if (format === 'text' || format === 'plain' || payload.plain === true || payload.plain === '1') {
      return res.type('text/plain; charset=utf-8').send(value === null || value === undefined ? '' : String(value));
    }
    return res.json({ ok: true, field: payload.field || payload.return || payload.output, value, cached: responsePayload.cached, cacheKey: responsePayload.cacheKey });
  }
  return res.json(responsePayload);
}

async function handleProjectMatchRequest(req, res) {
  try {
    const payload = req.method === 'GET'
      ? {
          namespace: req.query.namespace,
          provider: req.query.provider,
          project: req.query.project ?? req.query.source,
          candidates: req.query.candidates ?? req.query.targets ?? req.query.targetList,
          content: req.query.content ?? req.query.q ?? req.query.text ?? req.query.input,
          baseUrl: req.query.baseUrl,
          model: req.query.model,
          apiKey: req.query.apiKey,
          new: req.query.new ?? req.query.refresh,
          threshold: req.query.threshold,
          limit: req.query.limit,
          field: req.query.field ?? req.query.return ?? req.query.output,
          format: req.query.format,
          plain: req.query.plain,
        }
      : (req.body || {});
    const normalizedPayload = normalizeShortcutPayload(payload);
    const cacheRequest = buildCacheRequest(normalizedPayload);
    const cacheKey = makeCacheKey(cacheRequest);
    const forceRefresh = isForceRefresh({ ...req, body: normalizedPayload });

    if (!forceRefresh) {
      const cached = getCachedResult(cacheKey);
      if (cached) {
        markCacheHit(cacheKey);
        return sendProjectMatchResponse(req, res, {
          ok: true,
          cached: true,
          cacheKey,
          hitCount: cached.hit_count + 1,
          createdAt: cached.created_at,
          updatedAt: cached.updated_at,
          request: JSON.parse(cached.request_json),
          result: JSON.parse(cached.response_json),
        }, normalizedPayload);
      }
    }

    const result = await computeProjectQueryResult(cacheRequest, normalizedPayload.apiKey);
    saveCachedResult(cacheKey, cacheRequest, result);

    return sendProjectMatchResponse(req, res, {
      ok: true,
      cached: false,
      refreshed: forceRefresh,
      cacheKey,
      request: cacheRequest,
      result,
    }, normalizedPayload);
  } catch (error) {
    console.error('[项目查询API错误]', error.message);
    return res.status(error.status || 500).json({
      ok: false,
      error: error.message,
      upstream: error.upstream,
    });
  }
}

app.use(cors());
app.use(express.json({ limit: '10mb' }));

// GitHub代理路由
app.get('/api/github-proxy', async (req, res) => {
  try {
    const url = req.query.url;
    if (!url || !url.startsWith('https://github.com')) {
      return res.status(400).json({ error: 'Invalid GitHub URL' });
    }

    console.log(`[GitHub代理] 请求: ${url}`);

    const response = await fetch(url);
    const html = await response.text();

    res.send(html);
  } catch (error) {
    console.error('[GitHub代理错误]', error.message);
    res.status(500).json({
      error: 'GitHub proxy error',
      message: error.message
    });
  }
});

// OpenAI-compatible API 代理：统一转发 cc-viber / code-tab 等 /v1/chat/completions，避免浏览器 CORS。
app.post('/api/openai-proxy', async (req, res) => {
  try {
    const { baseUrl, apiKey, model, systemPrompt, prompt } = req.body;

    if (!baseUrl || !apiKey || !model || !prompt) {
      return res.status(400).json({ error: 'Missing required parameters' });
    }

    const targetUrl = buildOpenAITargetUrl(baseUrl, '/chat/completions');
    console.log(`[OpenAI代理] 请求到 ${targetUrl}`);

    const response = await fetchWithProxyFallback(targetUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: systemPrompt || '' },
          { role: 'user', content: prompt },
        ],
      }),
    });

    const { body } = await readJsonOrText(response);

    if (!response.ok) {
      console.error('[OpenAI代理] 错误:', response.status, body);
      return res.status(response.status).json(body);
    }

    console.log('[OpenAI代理] 成功');
    res.json(body);
  } catch (error) {
    console.error('[OpenAI代理错误]', error.message);
    res.status(500).json({
      error: 'OpenAI proxy error',
      message: error.message
    });
  }
});

// OpenAI-compatible 模型列表代理。
app.post('/api/openai-proxy/models', async (req, res) => {
  try {
    const { baseUrl, apiKey } = req.body;

    if (!baseUrl || !apiKey) {
      return res.status(400).json({ error: 'Missing required parameters' });
    }

    const targetUrl = buildOpenAITargetUrl(baseUrl, '/models');
    console.log(`[OpenAI模型代理] 请求到 ${targetUrl}`);

    const response = await fetchWithProxyFallback(targetUrl, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
      },
    });

    const { body } = await readJsonOrText(response);

    if (!response.ok) {
      console.error('[OpenAI模型代理] 错误:', response.status, body);
      return res.status(response.status).json(body);
    }

    res.json(body);
  } catch (error) {
    console.error('[OpenAI模型代理错误]', error.message);
    res.status(500).json({
      error: 'OpenAI models proxy error',
      message: error.message
    });
  }
});

// 通用 AI 文本 API：默认使用内置 API Key，GET 默认返回纯文本；传 new=true 或 ?new=1 强制刷新。
app.get(['/api/ai-text', '/api/ai'], handleAiTextRequest);
app.post(['/api/ai-text', '/api/ai'], handleAiTextRequest);

app.get('/api/ai-text/cache/stats', (_req, res) => {
  const total = cacheDb.prepare('SELECT COUNT(*) AS count FROM ai_text_cache').get();
  const latest = cacheDb.prepare(`
    SELECT cache_key AS cacheKey, namespace, provider, model, actual_model AS actualModel,
           base_url AS baseUrl, prompt, created_at AS createdAt, updated_at AS updatedAt, hit_count AS hitCount
    FROM ai_text_cache
    ORDER BY updated_at DESC
    LIMIT 20
  `).all();
  res.json({ ok: true, dbPath: CACHE_DB_PATH, total: total.count, latest });
});

// 项目查询/匹配 API：默认走 SQLite 缓存；传 new=true 或 ?new=1 强制刷新。
app.post(['/api/project-match', '/api/project-query'], handleProjectMatchRequest);
app.get(['/api/project-match', '/api/project-query'], handleProjectMatchRequest);

app.get('/api/project-match/cache/stats', (_req, res) => {
  const total = cacheDb.prepare('SELECT COUNT(*) AS count FROM project_query_cache').get();
  const latest = cacheDb.prepare(`
    SELECT cache_key AS cacheKey, namespace, provider, model, base_url AS baseUrl,
           project, created_at AS createdAt, updated_at AS updatedAt, hit_count AS hitCount
    FROM project_query_cache
    ORDER BY updated_at DESC
    LIMIT 20
  `).all();
  res.json({ ok: true, dbPath: CACHE_DB_PATH, total: total.count, latest });
});

// 通用 Claude API 代理路由
app.post('/api/claude-proxy', async (req, res) => {
  try {
    const { baseUrl, apiKey, model, systemPrompt, prompt } = req.body;

    if (!baseUrl || !apiKey || !model || !prompt) {
      return res.status(400).json({ error: 'Missing required parameters' });
    }

    console.log(`[Claude代理] 请求到 ${baseUrl}`);

    const targetUrl = baseUrl.endsWith('/') ? `${baseUrl}v1/messages` : `${baseUrl}/v1/messages`;

    const response = await fetch(targetUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: model,
        system: systemPrompt || '',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 1024,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('[Claude代理] 错误:', response.status, data);
      return res.status(response.status).json(data);
    }

    console.log('[Claude代理] 成功');
    res.json(data);
  } catch (error) {
    console.error('[Claude代理错误]', error.message);
    res.status(500).json({
      error: 'Proxy error',
      message: error.message
    });
  }
});

// API 代理路由 (保留原有的cc-vibe代理)
app.all('/api/cc-vibe/*', async (req, res) => {
  try {
    const targetPath = req.path.replace('/api/cc-vibe', '');
    const targetUrl = `https://cc-vibe.com${targetPath}`;

    console.log(`[代理] ${req.method} ${targetPath}`);

    // 构建请求选项
    const options = {
      method: req.method,
      hostname: 'cc-vibe.com',
      path: targetPath,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': req.headers.authorization || '',
        'anthropic-version': '2023-06-01',
      },
    };

    // 如果配置了上游代理，使用它
    if (PROXY_URL) {
      options.agent = new HttpsProxyAgent(PROXY_URL);
      console.log(`[代理] 使用上游代理: ${PROXY_URL}`);
    }

    const proxyReq = https.request(options, (proxyRes) => {
      let data = '';

      proxyRes.on('data', (chunk) => {
        data += chunk;
      });

      proxyRes.on('end', () => {
        console.log(`[代理] 响应状态: ${proxyRes.statusCode}`);
        try {
          res.status(proxyRes.statusCode).json(JSON.parse(data));
        } catch (e) {
          res.status(proxyRes.statusCode).send(data);
        }
      });
    });

    proxyReq.on('error', (error) => {
      console.error('[代理错误]', error.message);
      res.status(500).json({
        error: 'Proxy error',
        message: error.message
      });
    });

    // 如果有请求体，写入
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      proxyReq.write(JSON.stringify(req.body));
    }

    proxyReq.end();
  } catch (error) {
    console.error('[代理错误]', error.message);
    res.status(500).json({
      error: 'Proxy error',
      message: error.message
    });
  }
});

// 静态文件服务
app.use(express.static(path.join(__dirname, 'dist')));

// SPA 路由回退
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ 服务器运行在 http://0.0.0.0:${PORT}`);
  console.log(`📁 静态文件目录: ${path.join(__dirname, 'dist')}`);
  if (PROXY_URL) {
    console.log(`🔗 上游代理: ${PROXY_URL}`);
  }
});
