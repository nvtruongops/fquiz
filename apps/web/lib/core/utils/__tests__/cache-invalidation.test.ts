import { clearSessionPreloadCache, getSessionPreloadStorageKey } from '../cache-invalidation'

describe('clearSessionPreloadCache', () => {
  const originalSessionStorage = Object.getOwnPropertyDescriptor(globalThis, 'sessionStorage')

  afterEach(() => {
    if (originalSessionStorage) {
      Object.defineProperty(globalThis, 'sessionStorage', originalSessionStorage)
    } else {
      delete (globalThis as { sessionStorage?: Storage }).sessionStorage
    }
  })

  it('removes sensitive quiz session preloads and preserves unrelated storage', () => {
    const ownerAKey = getSessionPreloadStorageKey('initial', 'session-a', 'owner-a')
    const ownerBKey = getSessionPreloadStorageKey('initial', 'session-a', 'owner-b')
    expect(ownerAKey).not.toBe(ownerBKey)
    expect(getSessionPreloadStorageKey('initial', 'session-a')).toBeNull()

    const entries = new Map([
      [ownerAKey!, 'owner-a-data'],
      [getSessionPreloadStorageKey('questions', 'session-a', 'owner-a')!, 'owner-a-questions'],
      ['theme', 'dark'],
    ])
    const storage = {
      get length() { return entries.size },
      key(index: number) { return [...entries.keys()][index] ?? null },
      getItem(key: string) { return entries.get(key) ?? null },
      setItem(key: string, value: string) { entries.set(key, value) },
      removeItem(key: string) { entries.delete(key) },
      clear() { entries.clear() },
    } as Storage
    Object.defineProperty(globalThis, 'sessionStorage', { configurable: true, value: storage })

    clearSessionPreloadCache()

    expect(storage.getItem(ownerAKey!)).toBeNull()
    expect(storage.getItem(getSessionPreloadStorageKey('questions', 'session-a', 'owner-a')!)).toBeNull()
    expect(storage.getItem('theme')).toBe('dark')
  })
})
