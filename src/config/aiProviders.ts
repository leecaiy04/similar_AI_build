export const DEFAULT_AI_API_KEY = ''
export const DEFAULT_AI_MODEL = 'gpt-5.5'
export const DEFAULT_CLAUDE_MODEL = 'claude-opus-4-8'

export interface AIEndpointPreset {
  id: string
  shortName: string
  title: string
  provider: 'openai' | 'claude'
  baseUrl: string
  model: string
  apiKey?: string
  note?: string
}

const baseEndpoints = [
  { id: 'cc1', shortName: 'CC1', title: 'cc-vibe.com', baseUrl: 'https://cc-vibe.com' },
  { id: 'cc2', shortName: 'CC2', title: '118.89', baseUrl: 'http://118.89.81.103:8081' },
  { id: 'cc3', shortName: 'CC3', title: '49.232', baseUrl: 'http://49.232.5.23:8081' },
  { id: 'hk1', shortName: 'HK1', title: '香港1', baseUrl: 'http://154.92.5.72:8081', note: '该线路如要求单独 API Key，可在界面覆盖默认 Key。' },
  { id: 'hk2', shortName: 'HK2', title: '香港2', baseUrl: 'http://154.12.179.181:8081' },
]

export const OPENAI_ENDPOINT_PRESETS: AIEndpointPreset[] = [
  ...baseEndpoints.map((endpoint) => ({
    ...endpoint,
    id: `gpt-${endpoint.id}`,
    shortName: `GPT-${endpoint.shortName}`,
    provider: 'openai' as const,
    baseUrl: `${endpoint.baseUrl.replace(/\/+$/, '')}/v1`,
    model: DEFAULT_AI_MODEL,
    apiKey: DEFAULT_AI_API_KEY,
  })),
  {
    id: 'gpt-code-tab1',
    shortName: 'GPT-CT1',
    title: 'code-tab1',
    provider: 'openai' as const,
    baseUrl: 'https://api.code-tab.com/v1',
    model: DEFAULT_AI_MODEL,
    apiKey: DEFAULT_AI_API_KEY,
  },
]

export const CLAUDE_ENDPOINT_PRESETS: AIEndpointPreset[] = baseEndpoints.map((endpoint) => ({
  ...endpoint,
  id: `claude-${endpoint.id}`,
  shortName: `Claude-${endpoint.shortName}`,
  provider: 'claude' as const,
  model: DEFAULT_CLAUDE_MODEL,
  apiKey: DEFAULT_AI_API_KEY,
}))

export const AI_ENDPOINT_PRESETS: AIEndpointPreset[] = [
  ...OPENAI_ENDPOINT_PRESETS,
  ...CLAUDE_ENDPOINT_PRESETS,
]

export const DEFAULT_OPENAI_ENDPOINT = OPENAI_ENDPOINT_PRESETS[0]!
export const DEFAULT_CLAUDE_ENDPOINT = CLAUDE_ENDPOINT_PRESETS[0]!
export const OPENAI_MODEL_PRESETS = [DEFAULT_AI_MODEL]
export const CLAUDE_MODEL_PRESETS = [
  DEFAULT_CLAUDE_MODEL,
  'claude-fable-5',
  'claude-opus-4-7',
  'claude-opus-4-7-thinking',
  'claude-sonnet-4-6',
  'claude-haiku-4-5-20251001',
]

export function getAIPresetDisplayName(preset: AIEndpointPreset): string {
  return preset.shortName
}

export function getAIPresetDetailLabel(preset: AIEndpointPreset): string {
  return `${preset.shortName} · ${preset.title}`
}

export const getOpenAIPresetDisplayName = getAIPresetDisplayName

export function normalizeOpenAIBaseUrl(baseUrl: string): string {
  const trimmed = baseUrl.trim().replace(/\/+$/, '')
  if (!trimmed) return trimmed
  return /\/v\d+$/i.test(trimmed) ? trimmed : `${trimmed}/v1`
}
