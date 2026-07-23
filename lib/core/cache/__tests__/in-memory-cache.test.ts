import { InMemoryCache } from '../in-memory-cache'

describe('InMemoryCache Test Suite', () => {
  let cache: InMemoryCache

  beforeEach(() => {
    cache = new InMemoryCache()
  })

  test('set and get cached item before expiration', async () => {
    await cache.set('user:1', { name: 'Alice' }, 60)
    const result = await cache.get<{ name: string }>('user:1')
    expect(result).toEqual({ name: 'Alice' })
  })

  test('returns null for non-existent key', async () => {
    const result = await cache.get('missing')
    expect(result).toBeNull()
  })

  test('returns null and deletes item when expired', async () => {
    const now = Date.now()
    const spy = jest.spyOn(Date, 'now')
    spy.mockReturnValue(now)

    await cache.set('temp', 'value', 1) // 1 second TTL

    // Fast-forward time past TTL
    spy.mockReturnValue(now + 2000)

    const result = await cache.get('temp')
    expect(result).toBeNull()

    spy.mockRestore()
  })

  test('delete removes cached key', async () => {
    await cache.set('key', 'val', 60)
    await cache.delete('key')
    const result = await cache.get('key')
    expect(result).toBeNull()
  })

  test('invalidateByTags deletes all keys associated with specified tags', async () => {
    await cache.set('doc:1', 'Doc 1', 60, ['course:101', 'topic:5'])
    await cache.set('doc:2', 'Doc 2', 60, ['course:101'])
    await cache.set('doc:3', 'Doc 3', 60, ['course:202'])

    await cache.invalidateByTags(['course:101'])

    expect(await cache.get('doc:1')).toBeNull()
    expect(await cache.get('doc:2')).toBeNull()
    expect(await cache.get('doc:3')).toEqual('Doc 3')
  })

  test('flush clears all keys and tags', async () => {
    await cache.set('k1', 'v1', 60, ['tag1'])
    await cache.set('k2', 'v2', 60, ['tag2'])

    await cache.flush()

    expect(await cache.get('k1')).toBeNull()
    expect(await cache.get('k2')).toBeNull()
  })
})
