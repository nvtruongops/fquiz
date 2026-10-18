// A small Node harness for these hooks: persistent slots, dependency effects, cleanup.
let slots: any[] = []
let cursor = 0
let effects: (() => void)[] = []
let cleanups: (() => void)[] = []
let dirty = false

export const reactHooks = {
  useState(initial: any) {
    const index = cursor++
    if (!(index in slots)) slots[index] = typeof initial === 'function' ? initial() : initial
    return [slots[index], (value: any) => {
      const next = typeof value === 'function' ? value(slots[index]) : value
      if (!Object.is(next, slots[index])) dirty = true
      slots[index] = next
    }]
  },
  useRef(initial: any) {
    const index = cursor++
    return slots[index] ?? (slots[index] = { current: initial })
  },
  useCallback(fn: any, deps: any[]) {
    const index = cursor++
    if (!slots[index] || deps.some((value, i) => !Object.is(value, slots[index].deps[i]))) slots[index] = { fn, deps }
    return slots[index].fn
  },
  useMemo(fn: () => any, deps: any[]) {
    const index = cursor++
    if (!slots[index] || deps.some((value, i) => !Object.is(value, slots[index].deps[i]))) slots[index] = { value: fn(), deps }
    return slots[index].value
  },
  useEffect(fn: () => any, deps: any[]) {
    const index = cursor++
    if (!slots[index] || deps.some((value, i) => !Object.is(value, slots[index][i]))) {
      slots[index] = deps
      effects.push(() => { cleanups[index]?.(); cleanups[index] = fn() })
    }
  },
}

export function resetHooks() {
  cleanups.forEach((cleanup) => cleanup?.())
  slots = []; cleanups = []; effects = []; cursor = 0
}

export function renderHook<T>(hook: () => T): T {
  let value: T
  let renders = 0
  do {
    dirty = false; cursor = 0
    value = hook()
    const pending = effects; effects = []
    pending.forEach((effect) => effect())
    if (++renders > 20) throw new Error('Hook did not settle')
  } while (dirty)
  return value!
}
