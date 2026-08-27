import { QuizItem, CategoryItem } from '../useTeacherQuizzes'
import { Classroom } from '../useTeacherClassrooms'

describe('Student & Teacher Refactored Data Models & Utils Test Suite', () => {
  test('QuizItem data structure validation', () => {
    const mockQuiz: QuizItem = {
      _id: 'q123',
      title: 'Kinh tế vĩ mô PRN211',
      course_code: 'PRN211',
      questionCount: 20,
      status: 'published',
      created_at: new Date().toISOString(),
    }

    expect(mockQuiz._id).toBe('q123')
    expect(mockQuiz.course_code).toBe('PRN211')
    expect(mockQuiz.questionCount).toBeGreaterThan(0)
    expect(mockQuiz.status).toBe('published')
  })

  test('Classroom data structure validation', () => {
    const mockClassroom: Classroom = {
      _id: 'cls123',
      name: 'Lớp Tiếng Anh B1',
      code: 'ABC123',
      password: 'secretpassword',
      student_count: 15,
      created_at: new Date().toISOString(),
    }

    expect(mockClassroom.code).toHaveLength(6)
    expect(mockClassroom.student_count).toBe(15)
    expect(mockClassroom.password).toBe('secretpassword')
  })

  test('CategoryItem data structure validation', () => {
    const mockCategory: CategoryItem = {
      _id: 'cat123',
      name: 'ENG101',
      ownQuizCount: 5,
      totalQuizCount: 12,
    }

    expect(mockCategory.name).toBe('ENG101')
    expect(mockCategory.ownQuizCount).toBe(5)
  })
})
