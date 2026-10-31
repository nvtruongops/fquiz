import { createConcurrencyGate } from '../concurrency-gate'

describe('createConcurrencyGate', () => {
  test('rejects work immediately when all permits are active', () => {
    const gate = createConcurrencyGate(2)
    const releaseFirst = gate.tryAcquire()
    const releaseSecond = gate.tryAcquire()

    expect(releaseFirst).toEqual(expect.any(Function))
    expect(releaseSecond).toEqual(expect.any(Function))
    expect(gate.tryAcquire()).toBeNull()
  })

  test('releases a permit once and makes it available again', () => {
    const gate = createConcurrencyGate(1)
    const release = gate.tryAcquire()

    release?.()
    release?.()

    expect(gate.tryAcquire()).toEqual(expect.any(Function))
  })
})
