import React from 'react'
import { QuestionDisplay } from '../QuestionDisplay'
import { DesktopSessionQuestionBody } from '../DesktopSessionContent'

jest.mock('next/dynamic', () => ({ __esModule: true, default: () => () => null }))

it('passes the Finish Exam handler to QuestionDisplay', () => {
  const onSubmit = jest.fn()
  const output = DesktopSessionQuestionBody({
    activeData: {
      session: { mode: 'review', totalQuestions: 1, courseCode: 'TEST', title: 'Quiz' },
      question: { _id: 'question-1', text: 'Question', options: ['A'] },
    } as any,
    currentQuestionIndex: 0,
    isReadOnlyTab: false,
    isSubmitting: true,
    submitDisabled: false,
    enableAnimation: false,
    handleSelectOption: jest.fn(),
    handleNavigate: jest.fn(),
    saveState: {
      selectedOptions: [],
      submitted: false,
      saveStatus: 'idle',
      retryFailedAnswer: jest.fn(),
    },
    lastAnswerResult: null,
    showImmediateFeedback: false,
    resolvedQuizId: 'quiz-1',
    onSubmit,
    isFinalizing: false,
    hasFinalizationError: false,
  })
  const question = React.Children.toArray(output.props.children).find(
    (child) => React.isValidElement(child) && child.type === QuestionDisplay,
  ) as React.ReactElement<{ onSubmit?: () => void }> | undefined

  expect(question?.props.onSubmit).toBe(onSubmit)
  expect((question?.props as any).isPending).toBe(false)
})
