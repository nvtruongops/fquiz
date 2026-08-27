import { getAnswerSelectionCount } from '../utils/question-selection-helper'

describe('getAnswerSelectionCount', () => {
  it('should return correct_answer length when array is provided', () => {
    const q = {
      text: 'Which statement is true?',
      correct_answer: [0, 2],
      options: ['A', 'B', 'C', 'D'],
    }
    expect(getAnswerSelectionCount(q)).toBe(2)
  })

  it('should infer 2 from text "(Choose two.)" even if correct_answer has 1 element', () => {
    const q = {
      text: 'Which two statements describe a switch port that is configured with PortFast? (Choose two.)',
      correct_answer: [1],
      options: ['A', 'B', 'C', 'D', 'E'],
    }
    expect(getAnswerSelectionCount(q)).toBe(2)
  })

  it('should infer 2 from text "Choose 2"', () => {
    const q = {
      text: 'Select the primary advantages of VLANs. Choose 2',
      correct_answer: [0],
      options: ['A', 'B', 'C', 'D'],
    }
    expect(getAnswerSelectionCount(q)).toBe(2)
  })

  it('should infer 3 from text "(Select 3 answers)"', () => {
    const q = {
      text: 'Which features are supported? (Select 3 answers)',
      correct_answer: [0, 1],
      options: ['A', 'B', 'C', 'D', 'E'],
    }
    expect(getAnswerSelectionCount(q)).toBe(3)
  })

  it('should infer 2 from Vietnamese text "(Chọn 2 đáp án)"', () => {
    const q = {
      text: 'Đâu là đặc điểm của mô hình OSI? (Chọn 2 đáp án)',
      correct_answer: [0],
      options: ['A', 'B', 'C', 'D'],
    }
    expect(getAnswerSelectionCount(q)).toBe(2)
  })

  it('should return 1 for standard single choice questions', () => {
    const q = {
      text: 'What is the default port for HTTP?',
      correct_answer: [1],
      options: ['21', '80', '443', '8080'],
    }
    expect(getAnswerSelectionCount(q)).toBe(1)
  })

  it('should not exceed total options length', () => {
    const q = {
      text: 'Select options (Choose 4)',
      correct_answer: [0],
      options: ['A', 'B'],
    }
    expect(getAnswerSelectionCount(q)).toBe(2)
  })

  it('should not misinterpret prose like "choose 64-bit" as choosing 64 answers', () => {
    const q = {
      text: 'Why should administrators choose 64-bit versions of SQL Server when possible?',
      correct_answer: [0],
      options: [
        'To fully leverage the capability of 64-bit operating systems.',
        'To reduce the cost of licensing.',
        'To simplify the installation process.',
        'To avoid compatibility issues with 32-bit applications.',
      ],
    }
    expect(getAnswerSelectionCount(q)).toBe(1)
  })
})
