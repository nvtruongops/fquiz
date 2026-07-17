/**
 * Integration test: Domain Events + EventBus
 */
import { eventBus } from '@/lib/modules/learning/events/learning-events'
import type { IDomainEvent, VocabularyCreatedPayload } from '@/lib/modules/learning/events/learning-events'
import { Types } from 'mongoose'

describe('EventBus', () => {
  beforeEach(() => {
    eventBus.reset()
  })

  it('should emit and handle events', async () => {
    const handler = jest.fn()
    eventBus.on('VocabularyCreated', handler)

    const event: IDomainEvent<VocabularyCreatedPayload> = {
      eventId: 'evt-001',
      eventType: 'VocabularyCreated',
      occurredAt: new Date(),
      version: 1,
      aggregateId: new Types.ObjectId(),
      aggregateType: 'Vocabulary',
      payload: { lemma: 'hello', languageId: 'en', cefrLevel: 'A1' },
    }

    await eventBus.emit(event)
    expect(handler).toHaveBeenCalledWith(event)
  })

  it('should allow multiple handlers for same event', async () => {
    const h1 = jest.fn()
    const h2 = jest.fn()
    eventBus.on('SentenceVerified', h1)
    eventBus.on('SentenceVerified', h2)

    await eventBus.emit({
      eventId: 'evt-002',
      eventType: 'SentenceVerified',
      occurredAt: new Date(),
      version: 1,
      aggregateId: new Types.ObjectId(),
      aggregateType: 'Sentence',
      payload: { text: 'Hello', languageId: 'en' },
    })

    expect(h1).toHaveBeenCalledTimes(1)
    expect(h2).toHaveBeenCalledTimes(1)
  })

  it('should not call handler for different event type', async () => {
    const handler = jest.fn()
    eventBus.on('VocabularyCreated', handler)

    await eventBus.emit({
      eventId: 'evt-003',
      eventType: 'SentenceVerified',
      occurredAt: new Date(),
      version: 1,
      aggregateId: new Types.ObjectId(),
      aggregateType: 'Sentence',
      payload: { text: 'Hello', languageId: 'en' },
    })

    expect(handler).not.toHaveBeenCalled()
  })

  it('should handle async handlers', async () => {
    const results: string[] = []
    eventBus.on('LessonCompleted', async () => {
      await new Promise((r) => setTimeout(r, 10))
      results.push('done')
    })

    await eventBus.emit({
      eventId: 'evt-004',
      eventType: 'LessonCompleted',
      occurredAt: new Date(),
      version: 1,
      aggregateId: new Types.ObjectId(),
      aggregateType: 'Lesson',
      payload: { userId: 'u1', lessonId: 'l1' },
    })

    expect(results).toEqual(['done'])
  })
})
