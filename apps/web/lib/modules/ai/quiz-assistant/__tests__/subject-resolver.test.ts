import { SubjectResolver } from '../context/subject-resolver'
import { Category } from '@/lib/modules/quiz/models/Category'

jest.mock('@/lib/modules/quiz/models/Category', () => ({
  Category: {
    findById: jest.fn(),
  },
}))

describe('SubjectResolver & Subject Identity Invariant Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('INVARIANT 1: Quiz with category_id and course_code resolves canonicalCourseCode from authoritative Category', async () => {
    ;(Category.findById as jest.Mock).mockReturnValue({
      select: jest.fn().mockReturnValue({
        lean: jest.fn().mockResolvedValue({
          _id: 'cat-pmg',
          name: 'PMG201C',
        }),
      }),
    })

    const subject = await SubjectResolver.resolve({
      category_id: 'cat-pmg',
      course_code: 'PMG201C_FA24',
    })

    expect(subject.categoryId).toBe('cat-pmg')
    expect(subject.canonicalCourseCode).toBe('PMG201C')
    expect(subject.displayCourseCode).toBe('PMG201C_FA24')
    expect(subject.categoryName).toBe('PMG201C')
  })

  it('INVARIANT 2: Quiz with temporary course_code (e.g. temp_123) resolves canonical identity from Category without regex guessing', async () => {
    ;(Category.findById as jest.Mock).mockReturnValue({
      select: jest.fn().mockReturnValue({
        lean: jest.fn().mockResolvedValue({
          _id: 'cat-pmg',
          name: 'PMG201C',
        }),
      }),
    })

    const subject = await SubjectResolver.resolve({
      category_id: 'cat-pmg',
      course_code: 'temp_123',
    })

    expect(subject.categoryId).toBe('cat-pmg')
    expect(subject.canonicalCourseCode).toBe('PMG201C') // Derived from authoritative Category
    expect(subject.displayCourseCode).toBe('TEMP_123')
  })

  it('INVARIANT 3: QuestionBank category_id = X always binds directly to authoritative Subject X', () => {
    const qbCandidate = {
      category_id: 'cat-pmg',
      text: 'Question text',
    }

    const isMatch = SubjectResolver.isSameSubject(
      { categoryId: 'cat-pmg' },
      { categoryId: qbCandidate.category_id }
    )

    expect(isMatch).toBe(true)
  })

  it('INVARIANT 4: PMG201C_FA24 and PMG201C_SP25 are recognized as the same canonical subject via authoritative Category', async () => {
    ;(Category.findById as jest.Mock).mockReturnValue({
      select: jest.fn().mockReturnValue({
        lean: jest.fn().mockResolvedValue({
          _id: 'cat-pmg',
          name: 'PMG201C',
        }),
      }),
    })

    const subjectA = await SubjectResolver.resolve({
      category_id: 'cat-pmg',
      course_code: 'PMG201C_FA24',
    })

    const subjectB = await SubjectResolver.resolve({
      category_id: 'cat-pmg',
      course_code: 'PMG201C_SP25',
    })

    expect(SubjectResolver.isSameSubject(subjectA, subjectB)).toBe(true)
    expect(subjectA.canonicalCourseCode).toBe(subjectB.canonicalCourseCode)
  })

  it('INVARIANT 5: AI_101 and AI_101_FA24 with DIFFERENT category_ids are NOT assumed same subject (NO naive regex truncation to AI)', async () => {
    // Two distinct categories in database
    const subjectA = {
      categoryId: 'cat-ai-101',
      canonicalCourseCode: 'AI_101',
    }

    const subjectB = {
      categoryId: 'cat-ai-101-fa24',
      canonicalCourseCode: 'AI_101_FA24',
    }

    // Without an authoritative mapping linking them, they must NOT be merged
    expect(SubjectResolver.isSameSubject(subjectA, subjectB)).toBe(false)
    expect(subjectA.canonicalCourseCode).not.toBe('AI') // Never trimmed to AI
    expect(subjectB.canonicalCourseCode).not.toBe('AI') // Never trimmed to AI
  })
})
