import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { DashboardPrimaryAction } from '../DashboardPrimaryAction'
import type { ActivityItem } from '@/hooks/useStudentDashboard'

describe('DashboardPrimaryAction', () => {
  it('starts practice when there is no active session', () => {
    const html = renderToStaticMarkup(<DashboardPrimaryAction item={null} />)

    expect(html).toContain('Find a quiz')
    expect(html).toContain('href="/explore"')
  })

  it('resumes the active session and shows its existing progress', () => {
    const activeSession: ActivityItem = {
      id: 'activity-id',
      activeSessionId: 'session-id',
      quizId: 'quiz-id',
      quizTitle: 'VNR202 Practice',
      quizCode: 'VNR202',
      status: 'active',
      mode: 'quiz',
      activeAnsweredCount: 12,
      activeTotalCount: 60,
    }
    const html = renderToStaticMarkup(<DashboardPrimaryAction item={activeSession} />)

    expect(html).toContain('Resume quiz')
    expect(html).toContain('href="/quiz/quiz-id/session/session-id"')
    expect(html).toContain('12 of 60 answered')
  })
})
