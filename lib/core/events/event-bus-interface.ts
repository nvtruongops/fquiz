import type { IDomainEvent, EventHandler } from '@/lib/core/events/domain-event'

/**
 * IEventBus — Abstraction cho event publishing/subscribing.
 *
 * Phân biệt:
 * - publishDomainEvent: internal aggregate events
 * - publishIntegrationEvent: external system notifications
 *
 * Implementations:
 * - InMemoryEventBus (hiện tại)
 * - QStashEventBus (Phase 3)
 * - RedisEventBus (Phase 3)
 * - KafkaEventBus (Phase 4)
 */

export interface IEventBus {
  /** Publish domain event (internal aggregate change) */
  publishDomainEvent<T>(event: IDomainEvent<T>): Promise<void>

  /** Publish integration event (external system notification) */
  publishIntegrationEvent<T>(event: IDomainEvent<T>): Promise<void>

  /** Subscribe to an event type */
  subscribe<T>(eventType: string, handler: EventHandler<T>, scope?: 'domain' | 'integration'): void

  /** Unsubscribe a handler */
  unsubscribe(eventType: string, handler: EventHandler): void

  /** Remove all handlers (testing) */
  reset(): void
}
