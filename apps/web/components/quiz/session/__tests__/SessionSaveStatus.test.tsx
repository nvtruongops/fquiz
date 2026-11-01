import React from 'react'
import { SessionSaveStatus } from '../SessionSaveStatus'

jest.mock('@fquiz/ui/i18n', () => {
  const actual = jest.requireActual('@fquiz/ui/i18n')
  return { ...actual, useTranslations: () => (key: string) => actual.translateMessage('en', key) }
})

it.each(['idle', 'saving', 'saved', 'unsaved'] as const)('hides normal %s save state', (status) => {
  expect(SessionSaveStatus({ status, onRetry: jest.fn(), disabled: false })).toBeNull()
})

it('shows only save failure and retry for real errors', () => {
  const retry = jest.fn()
  const strip = SessionSaveStatus({ status: 'error', onRetry: retry, disabled: false })!
  const children = React.Children.toArray(strip.props.children) as React.ReactElement[]
  expect(children[0].props.children).toBe('Failed to save')
  expect(children[1].props.children).toBe('Try again')
  children[1].props.onClick()
  expect(retry).toHaveBeenCalledTimes(1)
})
