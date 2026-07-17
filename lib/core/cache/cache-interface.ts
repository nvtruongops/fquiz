/**
 * ICache — Tag-based cache abstraction.
 *
 * Tags enable targeted invalidation without pattern scanning.
 * Example: cache.set('vocab:en:hello', data, 300, ['vocabulary', 'language:en'])
 *
 * Implementations:
 * - InMemoryCache (Phase 2.2)
 * - UpstashRedisCache (Phase 3)
 */

export interface ICache {
  /** Get cached value */
  get<T>(key: string): Promise<T | null>

  /** Set value with TTL (seconds) and optional tags */
  set<T>(key: string, value: T, ttlSeconds: number, tags?: string[]): Promise<void>

  /** Delete a single key */
  delete(key: string): Promise<void>

  /** Invalidate all keys with any of the given tags */
  invalidateByTags(tags: string[]): Promise<void>

  /** Clear all cached data */
  flush(): Promise<void>
}
