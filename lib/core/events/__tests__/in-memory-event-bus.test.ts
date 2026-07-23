import { InMemoryEventBus } from '../in-memory-event-bus'
import { EventBus } from '../event-bus'
import { Types } from 'mongoose'
import type { IDomainEvent } from '../domain-event'

describe('EventBus Implementations Test Suite', () => {
  describe('InMemoryEventBus', () => {
    let bus: InMemoryEventBus

    beforeEach(() => {
      bus = new InMemoryEventBus()
    })

    test('publishes and receives domain event', async () => {
      const mockHandler = jest.fn()
      bus.subscribe('USER_CREATED', mockHandler, 'domain')

      const event: IDomainEvent<{ userId: string }> = {
        eventId: 'evt-1',
        eventType: 'USER_CREATED',
        occurredAt: new Date(),
        version: 1,
        aggregateId: new Types.ObjectId().toString(),
        aggregateType: 'User',
        payload: { userId: 'u123' },
      }

      await bus.publishDomainEvent(event)
      expect(mockHandler).toHaveBeenCalledTimes(1)
      expect(mockHandler).toHaveBeenCalledWith(event)
    })

    test('publishes and receives integration event separately from domain event', async () => {
      const domainHandler = jest.fn()
      const integrationHandler = jest.fn()

      bus.subscribe('ORDER_PLACED', domainHandler, 'domain')
      bus.subscribe('ORDER_PLACED', integrationHandler, 'integration')

      const event: IDomainEvent<{ orderId: string }> = {
        eventId: 'evt-2',
        eventType: 'ORDER_PLACED',
        occurredAt: new Date(),
        version: 1,
        aggregateId: new Types.ObjectId().toString(),
        aggregateType: 'Order',
        payload: { orderId: 'ord-99' },
      }

      await bus.publishIntegrationEvent(event)

      expect(domainHandler).not.toHaveBeenCalled()
      expect(integrationHandler).toHaveBeenCalledTimes(1)
    })

    test('unsubscribes handler', async () => {
      const mockHandler = jest.fn()
      bus.subscribe('ITEM_SAVED', mockHandler, 'domain')
      bus.unsubscribe('ITEM_SAVED', mockHandler)

      const event: IDomainEvent = {
        eventId: 'evt-3',
        eventType: 'ITEM_SAVED',
        occurredAt: new Date(),
        version: 1,
        aggregateId: new Types.ObjectId().toString(),
        aggregateType: 'Item',
        payload: {},
      }

      await bus.publishDomainEvent(event)
      expect(mockHandler).not.toHaveBeenCalled()
    })

    test('reset clears all handlers', async () => {
      const handler = jest.fn()
      bus.subscribe('ANY_EVENT', handler, 'domain')
      bus.reset()

      const event: IDomainEvent = {
        eventId: 'evt-4',
        eventType: 'ANY_EVENT',
        occurredAt: new Date(),
        version: 1,
        aggregateId: new Types.ObjectId().toString(),
        aggregateType: 'Test',
        payload: {},
      }

      await bus.publishDomainEvent(event)
      expect(handler).not.toHaveBeenCalled()
    })
  })

  describe('Legacy EventBus', () => {
    let legacyBus: EventBus

    beforeEach(() => {
      legacyBus = new EventBus()
    })

    test('registers handler with on() and triggers with emit()', async () => {
      const handler = jest.fn()
      legacyBus.on('QUIZ_COMPLETED', handler)

      const event = {
        eventId: 'leg-1',
        eventType: 'QUIZ_COMPLETED',
        occurredAt: new Date(),
        version: 1,
        aggregateId: new Types.ObjectId(),
        aggregateType: 'Quiz',
        payload: { score: 100 },
      }

      await legacyBus.emit(event)
      expect(handler).toHaveBeenCalledTimes(1)
      expect(handler).toHaveBeenCalledWith(event)
    })
  })
})
