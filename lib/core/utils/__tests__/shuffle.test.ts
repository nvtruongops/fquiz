import { secureShuffle, shuffleQuestionOptions, hasDependentOptions } from '../shuffle'

describe('secureShuffle', () => {
  it('should return an array of the same length', () => {
    const result = secureShuffle([1, 2, 3, 4, 5])
    expect(result).toHaveLength(5)
  })

  it('should contain all original elements', () => {
    const original = [1, 2, 3, 4, 5]
    const result = secureShuffle(original)
    expect(result.sort()).toEqual(original.sort())
  })

  it('should not mutate the original array', () => {
    const original = [1, 2, 3, 4, 5]
    const originalCopy = [...original]
    secureShuffle(original)
    expect(original).toEqual(originalCopy)
  })

  it('should handle empty array', () => {
    expect(secureShuffle([])).toEqual([])
  })

  it('should handle single element array', () => {
    expect(secureShuffle([42])).toEqual([42])
  })

  it('should produce different orderings (probabilistic)', () => {
    const arr = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]
    // Run multiple shuffles and check that at least one is different from original
    const results = Array.from({ length: 10 }, () => secureShuffle(arr))
    const allSame = results.every((r) => r.every((v, i) => v === arr[i]))
    expect(allSame).toBe(false)
  })
})

describe('hasDependentOptions', () => {
  it('should detect dependent option phrases in Vietnamese', () => {
    expect(hasDependentOptions(['Đáp án A', 'Đáp án B', 'Tất cả các đáp án trên'])).toBe(true)
    expect(hasDependentOptions(['Lựa chọn 1', 'Cả hai đáp án đều đúng'])).toBe(true)
    expect(hasDependentOptions(['A', 'B', 'Không có đáp án nào đúng'])).toBe(true)
  })

  it('should detect options referencing letter labels A through H', () => {
    expect(hasDependentOptions(['Nội dung 1', 'Nội dung 2', 'Cả A và B đều đúng'])).toBe(true)
    expect(hasDependentOptions(['H₂O', 'CO₂', 'Gồm A và B'])).toBe(true)
    expect(hasDependentOptions(['Opt A', 'Opt B', 'Opt C', 'A, B và C'])).toBe(true)
    expect(hasDependentOptions(['Opt A', 'Opt B', 'Opt C', 'Opt D', 'Opt E', 'Chỉ C và E'])).toBe(true)
  })

  it('should return false for independent options', () => {
    expect(hasDependentOptions(['Hà Nội', 'Huế', 'Đà Nẵng', 'TP. Hồ Chí Minh'])).toBe(false)
  })
})

describe('shuffleQuestionOptions', () => {
  it('should correctly map single correct answer (as number)', () => {
    const q = {
      text: 'Thủ đô của Việt Nam là gì?',
      options: ['Hà Nội', 'Huế', 'Đà Nẵng', 'Cần Thơ'],
      correct_answer: 0, // 'Hà Nội'
    }

    // Test multiple times to account for randomness
    for (let i = 0; i < 20; i++) {
      const shuffled = shuffleQuestionOptions(q)
      expect(typeof shuffled.correct_answer).toBe('number')
      const correctIdx = shuffled.correct_answer as number
      expect(shuffled.options[correctIdx]).toBe('Hà Nội')
    }
  })

  it('should correctly map single correct answer (as array)', () => {
    const q = {
      text: 'Biển nào nằm ở Việt Nam?',
      options: ['Biển Đen', 'Biển Đông', 'Biển Đỏ'],
      correct_answer: [1], // 'Biển Đông'
    }

    for (let i = 0; i < 20; i++) {
      const shuffled = shuffleQuestionOptions(q)
      expect(Array.isArray(shuffled.correct_answer)).toBe(true)
      const correctIndices = shuffled.correct_answer as number[]
      expect(correctIndices).toHaveLength(1)
      expect(shuffled.options[correctIndices[0]]).toBe('Biển Đông')
    }
  })

  it('should correctly map 2 correct answers (multi-answer)', () => {
    const q = {
      text: 'Chọn các thành phố thuộc miền Nam Việt Nam?',
      options: ['TP. Hồ Chí Minh', 'Hà Nội', 'Cần Thơ', 'Hải Phòng', 'Đà Nẵng'],
      correct_answer: [0, 2], // 'TP. Hồ Chí Minh' and 'Cần Thơ'
    }

    for (let i = 0; i < 20; i++) {
      const shuffled = shuffleQuestionOptions(q)
      const correctIndices = shuffled.correct_answer as number[]
      expect(correctIndices).toHaveLength(2)

      const selectedOptionTexts = correctIndices.map((idx) => shuffled.options[idx]).sort()
      expect(selectedOptionTexts).toEqual(['Cần Thơ', 'TP. Hồ Chí Minh'])
    }
  })

  it('should correctly map 3 correct answers (multi-answer)', () => {
    const q = {
      text: 'Chọn các số nguyên tố nhỏ hơn 10?',
      options: ['1', '2', '3', '4', '5', '6'],
      correct_answer: [1, 2, 4], // '2', '3', '5'
    }

    for (let i = 0; i < 20; i++) {
      const shuffled = shuffleQuestionOptions(q)
      const correctIndices = shuffled.correct_answer as number[]
      expect(correctIndices).toHaveLength(3)

      const selectedOptionTexts = correctIndices.map((idx) => shuffled.options[idx]).sort()
      expect(selectedOptionTexts).toEqual(['2', '3', '5'])
    }
  })

  it('should strip option prefixes A, B, C, D, E, F, G, H when shuffling', () => {
    const q = {
      text: 'Chọn thành phố?',
      options: ['A. Hà Nội', 'B. Huế', 'C. Đà Nẵng', 'D. Sài Gòn', 'E. Cần Thơ', 'F. Hải Phòng', 'G. Nha Trang', 'H. Quy Nhơn'],
      correct_answer: 0, // 'A. Hà Nội' -> stripped to 'Hà Nội'
    }

    for (let i = 0; i < 20; i++) {
      const shuffled = shuffleQuestionOptions(q)
      const correctIdx = shuffled.correct_answer as number
      expect(shuffled.options[correctIdx]).toBe('Hà Nội')
      expect(shuffled.options.every((opt) => !/^[A-H]\.\s/.test(opt))).toBe(true)
    }
  })

  it('should preserve original order if dependent option phrases (like "Cả A và B") are present', () => {
    const q = {
      text: 'Khí hậu Việt Nam?',
      options: ['A. Nhiệt đới', 'B. Gió mùa', 'C. Cả A và B đều đúng'],
      correct_answer: 2,
    }

    const shuffled = shuffleQuestionOptions(q)
    expect(shuffled.options).toEqual(['A. Nhiệt đới', 'B. Gió mùa', 'C. Cả A và B đều đúng'])
    expect(shuffled.correct_answer).toBe(2)
  })

  it('should return original question if options length < 2', () => {
    const q = {
      text: 'Một câu hỏi đơn',
      options: ['Duy nhất'],
      correct_answer: 0,
    }

    const result = shuffleQuestionOptions(q)
    expect(result).toEqual(q)
  })
})


