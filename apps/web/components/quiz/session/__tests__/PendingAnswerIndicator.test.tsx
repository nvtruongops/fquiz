import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { PendingAnswerIndicator } from '../PendingAnswerIndicator'

describe('PendingAnswerIndicator', () => {
  it('announces a pending immediate answer without revealing correctness', () => {
    const markup = renderToStaticMarkup(React.createElement(PendingAnswerIndicator, {
      mode: 'immediate',
      submitted: true,
      isPending: true,
      showImmediateFeedback: false,
    }))

    expect(markup).toContain('role="status"')
    expect(markup).toContain('Checking answer')
    expect(markup).not.toContain('Correct')
    expect(markup).not.toContain('Incorrect')
  })

  it('stays hidden for review mode or after server feedback arrives', () => {
    const review = renderToStaticMarkup(React.createElement(PendingAnswerIndicator, {
      mode: 'review',
      submitted: true,
      isPending: true,
      showImmediateFeedback: false,
    }))
    const answered = renderToStaticMarkup(React.createElement(PendingAnswerIndicator, {
      mode: 'immediate',
      submitted: true,
      isPending: false,
      showImmediateFeedback: true,
    }))

    expect(review).toBe('')
    expect(answered).toBe('')
  })
})
