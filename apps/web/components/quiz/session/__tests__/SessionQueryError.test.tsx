import React from 'react'
import { SessionQueryError } from '../SessionQueryError'

function findElementWithText(node: React.ReactNode, text: string): React.ReactElement | undefined {
  if (Array.isArray(node)) {
    return node.map((child) => findElementWithText(child, text)).find(Boolean)
  }
  if (!React.isValidElement(node)) return undefined
  if (node.props.children === text) return node
  return findElementWithText(node.props.children, text)
}

it('offers an in-place Retry action without invoking navigation actions', () => {
  const retry = jest.fn()
  const back = jest.fn()
  const dashboard = jest.fn()
  const view = SessionQueryError({
    title: 'Session Error',
    message: 'Session expired. Please sign in again.',
    backLabel: 'Go Back',
    dashboardLabel: 'Dashboard',
    canRetry: true,
    onRetry: retry,
    onBack: back,
    onDashboard: dashboard,
  })!
  const retryButton = findElementWithText(view, 'Retry')!

  retryButton.props.onClick()

  expect(retry).toHaveBeenCalledTimes(1)
  expect(back).not.toHaveBeenCalled()
  expect(dashboard).not.toHaveBeenCalled()
})

it('offers the same in-place Retry action in the mobile error layout', () => {
  const retry = jest.fn()
  const view = SessionQueryError({
    title: 'Exam Room Error',
    message: 'Please sign in again.',
    backLabel: 'Back',
    dashboardLabel: 'Back to Dashboard',
    mobile: true,
    canRetry: true,
    onRetry: retry,
    onBack: jest.fn(),
    onDashboard: jest.fn(),
  })!
  const retryButton = findElementWithText(view, 'Retry')!

  retryButton.props.onClick()

  expect(retry).toHaveBeenCalledTimes(1)
})

it('hides Retry for terminal session errors', () => {
  const view = SessionQueryError({
    title: 'Session Error',
    message: 'Quiz session does not exist or has been removed.',
    backLabel: 'Go Back',
    dashboardLabel: 'Dashboard',
    canRetry: false,
    onRetry: jest.fn(),
    onBack: jest.fn(),
    onDashboard: jest.fn(),
  })!

  expect(findElementWithText(view, 'Retry')).toBeUndefined()
})
