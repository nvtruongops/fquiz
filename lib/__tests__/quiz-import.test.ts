import { buildQuizImportPreview } from '@/lib/quiz-import'

describe('Quiz import pipeline', () => {
  it('normalizes valid JSON payload', () => {
    const result = buildQuizImportPreview({
      quizMeta: {
        course_code: ' de-01 ',
        title: '  Tieu de ',
        description: '  Mo ta ',
      },
      questions: [
        {
          text: ' Cau 1 ',
          options: [' A ', ' B ', ''],
          correct_answers: [1],
        },
      ],
    })

    expect(result.isValid).toBe(true)
    expect(result.normalizedQuiz.course_code).toBe('DE-01')
    expect(result.normalizedQuiz.title).toBe('Tieu de')
    expect(result.normalizedQuiz.questions[0].options).toEqual(['A', 'B'])
    expect(result.normalizedQuiz.questions[0].correct_answer).toEqual([1])
  })

  it('returns error for missing required fields', () => {
    const result = buildQuizImportPreview({
      quizMeta: {},
      questions: [{}],
    })

    expect(result.isValid).toBe(false)
    expect(
      result.diagnostics.some((item) => item.code === 'MISSING_COURSE_CODE' && item.level === 'warning')
    ).toBe(true)
    expect(result.diagnostics.some((item) => item.code === 'MISSING_QUESTION_TEXT')).toBe(true)
  })

  it('supports both correct_answer and correct_answers', () => {
    const fromCorrectAnswer = buildQuizImportPreview({
      quizMeta: { course_code: 'CODE-1' },
      questions: [
        {
          text: 'Question',
          options: ['A', 'B'],
          correct_answer: [0],
        },
      ],
    })
    const fromCorrectAnswers = buildQuizImportPreview({
      quizMeta: { course_code: 'CODE-2' },
      questions: [
        {
          text: 'Question',
          options: ['A', 'B'],
          correct_answers: [1],
        },
      ],
    })

    expect(fromCorrectAnswer.normalizedQuiz.questions[0].correct_answer).toEqual([0])
    expect(fromCorrectAnswers.normalizedQuiz.questions[0].correct_answer).toEqual([1])
  })

  it('supports vietnamese question key, option labels and letter answers', () => {
    const result = buildQuizImportPreview({
      quizMeta: { category_id: 'frs401c', course_code: 'de-01', description: 'mo ta' },
      questions: [
        {
          'Câu 1': {
            'câu hỏi': '2 + 2 bang bao nhieu?',
            options: ['[A]"3"', '[B]"4"', '[C]"5"', '[D]"6"'],
            correct_answer: ['A', 'C'],
            explanation: '2 + 2 = 4',
          },
        },
      ],
    })

    expect(result.normalizedQuiz.questions[0].text).toBe('2 + 2 bang bao nhieu?')
    expect(result.normalizedQuiz.questions[0].options).toEqual(['3', '4', '5', '6'])
    expect(result.normalizedQuiz.questions[0].correct_answer).toEqual([0, 2])
    expect(result.diagnostics.some((item) => item.code === 'CATEGORY_ID_NOT_OBJECT_ID')).toBe(true)
  })

  it('detects duplicate and invalid indexes', () => {
    const result = buildQuizImportPreview({
      quizMeta: { course_code: 'CODE-1' },
      questions: [
        {
          text: 'Question',
          options: ['A', 'a', ''],
          correct_answer: [3],
        },
      ],
    })

    expect(result.isValid).toBe(false)
    expect(result.diagnostics.some((item) => item.code === 'DUPLICATE_OPTION')).toBe(true)
    expect(result.diagnostics.some((item) => item.code === 'CORRECT_ANSWER_OUT_OF_RANGE')).toBe(true)
  })

  it('flags duplicate correct answers like C, C', () => {
    const result = buildQuizImportPreview({
      quizMeta: { course_code: 'DE-01' },
      questions: [
        {
          question: 'Question 1',
          options: ['[A]"Option A"', '[B]"Option B"', '[C]"Option C"'],
          correct_answer: ['C', 'C'],
        },
      ],
    })

    expect(result.isValid).toBe(false)
    expect(result.diagnostics.some((item) => item.code === 'DUPLICATE_CORRECT_ANSWER')).toBe(true)
  })

  it('rejects unknown top-level fields', () => {
    const result = buildQuizImportPreview({
      quizMeta: { course_code: 'CODE-1' },
      questions: [
        {
          text: 'Question',
          options: ['A', 'B'],
          correct_answer: [1],
        },
      ],
      unknown: 'nope',
    })

    expect(result.isValid).toBe(false)
    expect(result.diagnostics.some((item) => item.code === 'UNKNOWN_TOP_LEVEL_FIELD')).toBe(true)
  })

  it('parses plain txt format with Cau/Question and A. B. style', () => {
    const txt = `
category_id: frs401c
ma quiz: de-03
mo ta quiz: Import from plain txt

Câu 1
Question: 2 + 2 equals what?
A. 3
B. 4
C. 5
D. 6
Dap an: B
Mo ta: Basic arithmetic

Question 2
Question: Select even numbers.
A. 2
B. 3
C. 4
D. 5
Answer: A, C
`
    const result = buildQuizImportPreview(txt)
    expect(result.normalizedQuiz.course_code).toBe('DE-03')
    expect(result.normalizedQuiz.questions.length).toBe(2)
    expect(result.normalizedQuiz.questions[0].text).toBe('2 + 2 equals what?')
    expect(result.normalizedQuiz.questions[0].options).toEqual(['3', '4', '5', '6'])
    expect(result.normalizedQuiz.questions[1].correct_answer).toEqual([0, 2])
  })

  it('accepts english meta aliases for plain txt', () => {
    const txt = `
category: frs401c
quiz code: de-99
quiz description: English aliases

Question 1
Question: Sample question?
A. Option A
B. Option B
Answer: B
`
    const result = buildQuizImportPreview(txt)
    expect(result.normalizedQuiz.course_code).toBe('DE-99')
    expect(result.normalizedQuiz.category_id).toBe('frs401c')
    expect(result.normalizedQuiz.description).toBe('English aliases')
  })

  it('accepts Fquiz code alias for course code', () => {
    const txt = `
category: frs401c
Fquiz code: DE-FQ-01
quiz description: Alias test

Question 1
Question: Sample question?
A. Option A
B. Option B
Answer: A
`
    const result = buildQuizImportPreview(txt)
    expect(result.normalizedQuiz.course_code).toBe('DE-FQ-01')
  })

  it('supports multiple answers in text format A B C and options up to F', () => {
    const txt = `
category: frs401c
quiz code: de-88
quiz description: multi answer

Question 1
Question: Choose valid options.
A. Option A
B. Option B
C. Option C
D. Option D
E. Option E
F. Option F
Answer: A B C
`
    const result = buildQuizImportPreview(txt)
    expect(result.normalizedQuiz.questions[0].options.length).toBe(6)
    expect(result.normalizedQuiz.questions[0].correct_answer).toEqual([0, 1, 2])
  })

  it('parses explanation when content is on next lines', () => {
    const txt = `
category: frs401c
quiz code: de-77

Question 1
Question: Sample question?
A. Option A
B. Option B
Answer: A
Explanation:
Dong 1 giai thich.
Dong 2 giai thich.
`
    const result = buildQuizImportPreview(txt)
    expect(result.normalizedQuiz.questions[0].explanation).toBe('Dong 1 giai thich.\nDong 2 giai thich.')
  })

  it('parses multi-line question text until options start', () => {
    const txt = `
Question 25

Question: The key to Forensic Investigation is
1. Preserver
2. Analyse
3. Report
4. Collect
Arrange them in the correct sequence:
A. 1,3,4,2
B. 4,1,3,2
C. 4,1,2,3
D. 2,3,4,1
Answer: C
Explanation:
Collect -> Preserve -> Analyse -> Report
`
    const result = buildQuizImportPreview(txt)
    expect(result.normalizedQuiz.questions[0].text).toBe(
      'The key to Forensic Investigation is\n1. Preserver\n2. Analyse\n3. Report\n4. Collect\nArrange them in the correct sequence:'
    )
    expect(result.normalizedQuiz.questions[0].options).toEqual(['1,3,4,2', '4,1,3,2', '4,1,2,3', '2,3,4,1'])
    expect(result.normalizedQuiz.questions[0].correct_answer).toEqual([2])
  })

  it('keeps explanation lines starting with A. as explanation text', () => {
    const txt = `
Question 1
Question: Sample?
A. Option 1
B. Option 2
Answer: A
Explanation:
A. Day la dong giai thich, khong phai dap an.
B. Dong tiep theo van la giai thich.
`
    const result = buildQuizImportPreview(txt)
    expect(result.normalizedQuiz.questions[0].options).toEqual(['Option 1', 'Option 2'])
    expect(result.normalizedQuiz.questions[0].explanation).toBe(
      'A. Day la dong giai thich, khong phai dap an.\nB. Dong tiep theo van la giai thich.'
    )
  })

  it('preserves blank lines inside explanation paragraphs', () => {
    const txt = `
Question 46
Question: Five areas that make up the identity management life cycle.
A. Proofing
B. Maintenance
C. Authorization
D. Authentication
E. Provisioning
F. Entitlement
Answer: A, B, C, E, F
Explanation: Vong doi Identity Management Lifecycle thuong gom cac thanh phan:

Proofing -> Xac minh danh tinh ban dau
Provisioning -> Cap tai khoan/quyen
Authorization -> Phan quyen truy cap
Entitlement -> Xac dinh quyen cu the nguoi dung duoc cap
Maintenance -> Duy tri, cap nhat, thu hoi quyen
`
    const result = buildQuizImportPreview(txt)
    expect(result.normalizedQuiz.questions[0].explanation).toBe(
      'Vong doi Identity Management Lifecycle thuong gom cac thanh phan:\n\nProofing -> Xac minh danh tinh ban dau\nProvisioning -> Cap tai khoan/quyen\nAuthorization -> Phan quyen truy cap\nEntitlement -> Xac dinh quyen cu the nguoi dung duoc cap\nMaintenance -> Duy tri, cap nhat, thu hoi quyen'
    )
  })
})
