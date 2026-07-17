import type { IEventBus } from '@/lib/core/events/event-bus-interface'
import type { IDomainEvent, EventHandler } from '@/lib/core/events/domain-event'

/**
 * InMemoryEventBus — Non-persistent event bus for development & testing.
 * Phase 3: replace with QStashEventBus or RedisEventBus without changing services.
 */
export class InMemoryEventBus implements IEventBus {
  private domainHandlers = new Map<string, EventHandler[]>()
  private integrationHandlers = new Map<string, EventHandler[]>()

  async publishDomainEvent<T>(event: IDomainEvent<T>): Promise<void> {
    const handlers = this.domainHandlers.get(event.eventType) || []
    for (const handler of handlers) {
      await handler(event)
    }
  }

  async publishIntegrationEvent<T>(event: IDomainEvent<T>): Promise<void> {
    const handlers = this.integrationHandlers.get(event.eventType) || []
    for (const handler of handlers) {
      await handler(event)
    }
  }

  subscribe<T>(eventType: string, handler: EventHandler<T>, scope: 'domain' | 'integration' = 'domain'): void {
    const map = scope === 'domain' ? this.domainHandlers : this.integrationHandlers
    const existing = map.get(eventType) || []
    existing.push(handler as EventHandler)
    map.set(eventType, existing)
  }

  unsubscribe(eventType: string, handler: EventHandler): void {
    for (const map of [this.domainHandlers, this.integrationHandlers]) {
      const existing = map.get(eventType)
      if (existing) {
        map.set(eventType, existing.filter((h) => h !== handler))
      }
    }
  }

  reset(): void {
    this.domainHandlers.clear()
    this.integrationHandlers.clear()
  }
}
