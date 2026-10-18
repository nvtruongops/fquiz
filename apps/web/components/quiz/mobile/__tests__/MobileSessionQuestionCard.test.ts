import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { MobileSessionQuestionCard } from '../MobileSessionQuestionCard'

describe('MobileSessionQuestionCard lite answer controls', () => {
  it('renders answer choices without an all-property transition', () => {
    const markup = renderToStaticMarkup(React.createElement(MobileSessionQuestionCard, {
      question: { _id: 'q1', text: 'Question?', options: ['First', 'Second'] },
      effectiveIndex: 0,
      effectiveTotal: 1,
      requiredSelectionCount: 1,
      isQuestionPinned: false,
      isPinPending: false,
      onTogglePin: () => undefined,
      isNoteMode: false,
      showImmediateFeedback: false,
      correctAnswerSet: [],
      selectedOptions: [],
      submitted: false,
      isSubmitting: false,
      onSelectOption: () => undefined,
      mode: 'immediate',
    }))

    expect(markup).toMatch(/rounded-2xl border-2 p-3\.5 text-left transition-none cursor-pointer/)
  })
})
