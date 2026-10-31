import React from 'react'
import { renderHook, resetHooks } from '../../../../../../test/hookHarness'
import { InteractiveFlashcardResultViewer } from '../InteractiveFlashcardResultViewer'
jest.mock('react', () => ({ ...jest.requireActual('react'), ...require('../../../../../../test/hookHarness').reactHooks }))
function text(node: any): string {
  if (typeof node === 'string' || typeof node === 'number') return String(node)
  if (!React.isValidElement(node)) return ''
  return React.Children.toArray(node.props.children).map(text).join(' ')
}
function descendants(node: any): any[] {
  if (!React.isValidElement(node)) return []
  return [node, ...React.Children.toArray(node.props.children).flatMap(descendants)]
}
beforeEach(resetHooks)
test('flashcard result renders every correct option and preserves the self-assessed mark', () => {
  const tree = renderHook(() => InteractiveFlashcardResultViewer({ questions: [{ _id: 'q', text: 'Prompt', options: ['Apple', 'Berry', 'Cherry', 'Date'], correct_answer: [0, 1, 2], submitted_answer: null, is_correct: true }] }))
  const rendered = text(descendants(tree).find(node => node.props.className?.includes('shadow-xs space-y-1')))
  for (const option of ['Apple', 'Berry', 'Cherry']) expect(rendered).toContain(option)
  expect(text(tree)).toContain('Mastered')
  expect(rendered).not.toContain('Date')
})
