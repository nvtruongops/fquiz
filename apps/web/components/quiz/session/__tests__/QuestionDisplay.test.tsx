import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { QuestionDisplay } from '../QuestionDisplay'

jest.mock('@/hooks/quiz/usePinnedQuestions', () => ({ usePinnedQuestions: () => ({ pinnedQuestions: [], togglePinMutation: { isPending: false, mutate() {} } }) }))
jest.mock('@/components/shared/selection/InteractiveText', () => ({ InteractiveText: ({ content }: any) => content }))
jest.mock('@/components/quiz/shared/UsageBadge', () => ({ UsageBadge: () => null }))

const props = {
  question: { _id: 'q1', text: 'Choose 2', options: ['A', 'B', 'C'], answer_selection_count: 2 },
  currentIndex: 0, totalQuestions: 1, selectedOptions: [0], submitted: false,
  showImmediateFeedback: false, lastAnswerResult: null, onSelectOption: jest.fn(),
  isPending: false, sessionMode: 'review' as const,
}

it.each([false, true])('disables every option during read-only/finalization in animation=%s', (enableAnimation) => {
  const html = renderToStaticMarkup(<QuestionDisplay {...props} enableAnimation={enableAnimation} isPending />)
  const options = html.match(/<(?:input|button)[^>]*(?:type="checkbox"|role="checkbox")[^>]*>/g) ?? []
  expect(options.length).toBeGreaterThan(0)
  expect(options.filter((tag) => tag.includes('disabled=""'))).toHaveLength(enableAnimation ? 3 : 6)
})

it.each([false, true])('locks immediate options at N before feedback is available in animation=%s', (enableAnimation) => {
  const html = renderToStaticMarkup(<QuestionDisplay {...props} sessionMode="immediate" enableAnimation={enableAnimation} submitted />)
  const options = html.match(/<(?:input|button)[^>]*(?:type="checkbox"|role="checkbox")[^>]*>/g) ?? []
  expect(options.length).toBeGreaterThan(0)
  expect(options.filter((tag) => tag.includes('disabled=""'))).toHaveLength(enableAnimation ? 3 : 6)
})
