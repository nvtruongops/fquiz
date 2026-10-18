import React from 'react'
import { renderHook, resetHooks } from '../../../../../../test/hookHarness'
import { InteractiveResultViewer, type ResultQuestion } from '../InteractiveResultViewer'

jest.mock('react', () => ({ ...jest.requireActual('react'), ...require('../../../../../../test/hookHarness').reactHooks }))

const questions: ResultQuestion[] = [
  { _id: '1', text: 'first correct', options: ['A', 'B'], correct_answer: 0, submitted_answer: 0, is_correct: true },
  { _id: '2', text: 'first wrong', options: ['A', 'B'], correct_answer: 0, submitted_answer: 1, is_correct: false },
  { _id: '3', text: 'second correct', options: ['A', 'B'], correct_answer: 0, submitted_answer: 0, is_correct: true },
  { _id: '4', text: 'second wrong', options: ['A', 'B'], correct_answer: 0, submitted_answer: 1, is_correct: false },
  { _id: '5', text: 'skipped', options: ['A', 'B'], correct_answer: 0, submitted_answer: null, is_correct: false },
]

function descendants(node: any): any[] {
  if (!React.isValidElement(node)) return []
  return [node, ...React.Children.toArray(node.props.children).flatMap(descendants)]
}

function filterButton(tree: any, label: string) {
  return descendants(tree).find((node) => node.type === 'button' &&
    React.Children.toArray(node.props.children).some((child) => typeof child === 'string' && child.startsWith(label)))
}

function detail(tree: any) {
  return descendants(tree).find((node) => typeof node.type === 'function' && node.type.name === 'QuestionDetailCard')
}

function navigationDisabled(tree: any) {
  const card = detail(tree)
  return descendants(card.type(card.props)).filter((node) => typeof node.props.disabled === 'boolean')
    .map((node) => node.props.disabled)
}

describe('InteractiveResultViewer filtered navigation', () => {
  beforeEach(resetHooks)

  it('keeps navigation inside wrong questions and disables both filtered boundaries', () => {
    let tree = renderHook(() => InteractiveResultViewer({ questions }))
    expect(detail(tree).props.question.text).toBe('first wrong')

    filterButton(tree, 'Wrong').props.onClick()
    tree = renderHook(() => InteractiveResultViewer({ questions }))
    expect(detail(tree).props.question.text).toBe('first wrong')
    expect(detail(tree).props.canPrev).toBe(false)
    expect(detail(tree).props.canNext).toBe(true)
    expect(navigationDisabled(tree)).toEqual([true, false])
    expect(descendants(tree).filter((node) => node.type === 'button' && node.props['aria-label']?.startsWith('Question ')).map((node) => node.props['aria-label']))
      .toEqual(['Question 2: Incorrect', 'Question 4: Incorrect'])

    detail(tree).props.onNext()
    tree = renderHook(() => InteractiveResultViewer({ questions }))
    expect(detail(tree).props.question.text).toBe('second wrong')
    expect(detail(tree).props.index).toBe(3)
    expect(detail(tree).props.canNext).toBe(false)
    expect(navigationDisabled(tree)).toEqual([false, true])
    detail(tree).props.onPrev()
    tree = renderHook(() => InteractiveResultViewer({ questions }))
    expect(detail(tree).props.question.text).toBe('first wrong')
  })

  it('chooses first matching question when switching filters and preserves a matching selection', () => {
    let tree = renderHook(() => InteractiveResultViewer({ questions }))
    filterButton(tree, 'Correct').props.onClick()
    tree = renderHook(() => InteractiveResultViewer({ questions }))
    expect(detail(tree).props.question.text).toBe('first correct')
    detail(tree).props.onNext()
    tree = renderHook(() => InteractiveResultViewer({ questions }))
    expect(detail(tree).props.question.text).toBe('second correct')

    filterButton(tree, 'All').props.onClick()
    tree = renderHook(() => InteractiveResultViewer({ questions }))
    expect(detail(tree).props.question.text).toBe('second correct')
    filterButton(tree, 'Skipped').props.onClick()
    tree = renderHook(() => InteractiveResultViewer({ questions }))
    expect(detail(tree).props.question.text).toBe('skipped')
    expect(detail(tree).props.canPrev).toBe(false)
    expect(detail(tree).props.canNext).toBe(false)
    expect(navigationDisabled(tree)).toEqual([true, true])
  })

  it('shows empty feedback without unrelated detail for an empty filter', () => {
    let tree = renderHook(() => InteractiveResultViewer({ questions: questions.slice(0, 1) }))
    filterButton(tree, 'Wrong').props.onClick()
    tree = renderHook(() => InteractiveResultViewer({ questions: questions.slice(0, 1) }))
    expect(detail(tree)).toBeUndefined()
    expect(descendants(tree).some((node) => React.Children.toArray(node.props.children).includes('No questions match this filter.'))).toBe(true)
  })

  it('shows its existing empty state for zero questions', () => {
    const tree = renderHook(() => InteractiveResultViewer({ questions: [] }))
    expect(descendants(tree).some((node) => React.Children.toArray(node.props.children).includes('No question detail information available.'))).toBe(true)
  })
})
