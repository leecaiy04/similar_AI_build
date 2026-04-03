export interface VersionedState<T> {
  version: number
  data: T
}

export type Migration<T> = (legacy: Record<string, unknown>) => { version: number } & T

export function saveVersionedState<T>(data: T, version: number) {
  return JSON.stringify({ version, data })
}

export function loadVersionedState<T>(
  raw: string | null,
  defaults: T,
  currentVersion: number,
  migrate: Migration<T>,
): VersionedState<T> {
  if (!raw) {
    return { version: currentVersion, data: defaults }
  }

  const parsed = JSON.parse(raw) as Record<string, unknown>
  if (typeof parsed.version === 'number' && 'data' in parsed) {
    return {
      version: parsed.version,
      data: { ...defaults, ...(parsed.data as T) },
    }
  }

  const migrated = migrate(parsed)
  const { version, ...data } = migrated
  return {
    version,
    data: { ...defaults, ...(data as T) },
  }
}
