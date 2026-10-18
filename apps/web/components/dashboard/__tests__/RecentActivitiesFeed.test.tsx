import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { RecentActivitiesFeed } from '../RecentActivitiesFeed'
import type { ActivityItem } from '@/hooks/useStudentDashboard'

describe('RecentActivitiesFeed', () => {
  it('keeps the featured quiz out of the recent list while retaining other activity', () => {
    const activities: ActivityItem[] = [
      {
        id: 'active-session',
        quizId: 'quiz-active',
        quizTitle: 'Featured active quiz',
        quizCode: 'ACTIVE',
        status: 'active',
        mode: 'quiz',
        activeSessionId: 'active-session',
        activeAnsweredCount: 12,
        activeTotalCount: 60,
      },
      {
        id: 'completed-session',
        quizId: 'quiz-completed',
        quizTitle: 'Completed quiz',
        quizCode: 'COMPLETED',
        status: 'completed',
        mode: 'quiz',
        score: 8,
        correctCount: 8,
        totalCount: 10,
      },
    ]

    const html = renderToStaticMarkup(
      <RecentActivitiesFeed recentActivities={activities} featuredActivityId="active-session" />
    )

    expect(html).not.toContain('Featured active quiz')
    expect(html).toContain('Completed quiz')
  })
})
