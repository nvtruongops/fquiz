import type { ICache } from '@/lib/core/cache/cache-interface'

interface CacheEntry {
  value: unknown
  expiresAt: number
  tags: string[]
}

/**
 * InMemoryCache — Map-based cache with TTL and tag-based invalidation.
 */
export class InMemoryCache implements ICache {
  private store = new Map<string, CacheEntry>()
  private tagIndex = new Map<string, Set<string>>()

  async get<T>(key: string): Promise<T | null> {
    const entry = this.store.get(key)
    if (!entry) return null
    if (Date.now() > entry.expiresAt) {
      this.store.delete(key)
      return null
    }
    return entry.value as T
  }

  async set<T>(key: string, value: T, ttlSeconds: number, tags: string[] = []): Promise<void> {
    const entry: CacheEntry = {
      value,
      expiresAt: Date.now() + ttlSeconds * 1000,
      tags,
    }
    this.store.set(key, entry)
    for (const tag of tags) {
      const keys = this.tagIndex.get(tag) || new Set()
      keys.add(key)
      this.tagIndex.set(tag, keys)
    }
  }

  async delete(key: string): Promise<void> {
    this.store.delete(key)
  }

  async invalidateByTags(tags: string[]): Promise<void> {
    const keysToDelete = new Set<string>()
    for (const tag of tags) {
      const keys = this.tagIndex.get(tag)
      if (keys) {
        for (const key of keys) keysToDelete.add(key)
      }
    }
    for (const key of keysToDelete) {
      this.store.delete(key)
    }
  }

  async flush(): Promise<void> {
    this.store.clear()
    this.tagIndex.clear()
  }
}
