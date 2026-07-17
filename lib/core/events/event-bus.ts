import { Types } from 'mongoose'

export interface IDomainEvent<T = unknown> {
  eventId: string
  eventType: string
  occurredAt: Date
  version: number
  aggregateId: Types.ObjectId
  aggregateType: string
  payload: T
}

type EventHandler<T = unknown> = (event: IDomainEvent<T>) => void | Promise<void>

export class EventBus {
  private handlers = new Map<string, EventHandler[]>()

  on(eventType: string, handler: EventHandler): void {
    const existing = this.handlers.get(eventType) || []
    existing.push(handler)
    this.handlers.set(eventType, existing)
  }

  async emit<T>(event: IDomainEvent<T>): Promise<void> {
    const handlers = this.handlers.get(event.eventType) || []
    for (const handler of handlers) {
      await handler(event)
    }
  }

  reset(): void {
    this.handlers.clear()
  }
}

export const eventBus = new EventBus()
