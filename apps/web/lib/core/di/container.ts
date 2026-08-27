type Factory<T = unknown> = () => T

/**
 * Container — Lightweight Dependency Injection container.
 *
 * No decorators. No reflection. No external libraries.
 * Simple factory-based pattern.
 *
 * Usage:
 *   container.register('ICache', () => new InMemoryCache())
 *   container.registerSingleton('IEventBus', () => new InMemoryEventBus())
 *   const cache = container.resolve<ICache>('ICache')
 */
export class Container {
  private factories = new Map<string, Factory>()
  private singletons = new Map<string, unknown>()

  /** Register a transient factory (new instance each resolve) */
  register<T>(token: string, factory: Factory<T>): void {
    this.factories.set(token, factory)
  }

  /** Register a singleton factory (same instance for all resolves) */
  registerSingleton<T>(token: string, factory: Factory<T>): void {
    this.factories.set(token, () => {
      if (!this.singletons.has(token)) {
        this.singletons.set(token, factory())
      }
      return this.singletons.get(token) as T
    })
  }

  /** Resolve a dependency by token */
  resolve<T>(token: string): T {
    const factory = this.factories.get(token)
    if (!factory) {
      throw new Error(`Dependency "${token}" not registered in container`)
    }
    return factory() as T
  }

  /** Check if a token is registered */
  has(token: string): boolean {
    return this.factories.has(token)
  }

  /** Clear all registrations (testing) */
  reset(): void {
    this.factories.clear()
    this.singletons.clear()
  }
}
