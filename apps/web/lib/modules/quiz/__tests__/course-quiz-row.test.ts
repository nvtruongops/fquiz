import { mapCourseQuizRow } from '../course-quiz-row'

describe('mapCourseQuizRow', () => {
  it('keeps a zero best score and defaults a missing question count', () => {
    expect(mapCourseQuizRow({ _id: 'quiz-1', title: 'Course quiz' }, new Map([['quiz-1', 0]]))).toEqual({
      _id: 'quiz-1', title: 'Course quiz', questionCount: 0, bestScore: 0,
    })
  })
})
