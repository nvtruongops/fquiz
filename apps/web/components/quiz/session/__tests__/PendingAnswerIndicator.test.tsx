import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { PendingAnswerIndicator } from '../PendingAnswerIndicator'

describe('PendingAnswerIndicator', () => {
  it('announces answer checking before immediate feedback is available', () => {
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

  it('announces answer saving while immediate feedback is already visible', () => {
    const markup = renderToStaticMarkup(React.createElement(PendingAnswerIndicator, {
      mode: 'immediate',
      submitted: true,
      isPending: true,
      showImmediateFeedback: true,
    }))

    expect(markup).toContain('Saving answer')
  })

  it('stays hidden for review mode or after the answer request completes', () => {
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
