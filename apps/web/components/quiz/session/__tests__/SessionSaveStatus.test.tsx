import React from 'react'
import { SessionSaveStatus } from '../SessionSaveStatus'

it('offers navigation and discard actions for an incomplete draft', () => {
  const review = jest.fn()
  const discard = jest.fn()
  const strip = SessionSaveStatus({
    status: 'unsaved', onRetry: jest.fn(), onReviewDraft: review,
    onDiscardDraft: discard, draftQuestionNumber: 2, disabled: false,
  })!
  const children = React.Children.toArray(strip.props.children) as React.ReactElement[]
  expect(children[0].props.children).toContain('2')
  const actions = React.Children.toArray(children[1].props.children) as React.ReactElement[]
  actions.find((child) => child.props.children === 'Review draft')!.props.onClick()
  actions.find((child) => child.props.children === 'Discard draft')!.props.onClick()
  expect(review).toHaveBeenCalledTimes(1)
  expect(discard).toHaveBeenCalledTimes(1)
})
