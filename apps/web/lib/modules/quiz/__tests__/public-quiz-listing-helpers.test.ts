import {
  buildQuizListingQuery,
  mapPublicQuizRows,
  parseQuizListingParams,
} from '../public-quiz-listing-helpers'

describe('public quiz listing helpers', () => {
  it('parses bounded parameters and applies the caller default sort', () => {
    expect(parseQuizListingParams(new URLSearchParams('limit=5&search=term'), 'popular')).toEqual({
      limit: 5,
      offset: 0,
      search: 'term',
      category_id: undefined,
      sort: 'popular',
    })
    expect(parseQuizListingParams(new URLSearchParams('limit=1000'), 'recent')).toBeNull()
  })

  it('builds literal search filters without changing the category filter', () => {
    expect(buildQuizListingQuery('507f1f77bcf86cd799439012', 'a.b+')).toEqual({
      is_public: true,
      status: 'published',
      is_temp: { $ne: true },
      is_saved_from_explore: { $ne: true },
      category_id: '507f1f77bcf86cd799439012',
      $or: [
        { title: { $regex: 'a\\.b\\+', $options: 'i' } },
        { course_code: { $regex: 'a\\.b\\+', $options: 'i' } },
      ],
    })
  })

  it('maps joined rows with stable fallbacks', () => {
    expect(mapPublicQuizRows(
      [{ _id: 'quiz-1', title: 'Quiz', course_code: 'ABC', category_id: 'cat-1', created_by: 'user-1', questionCount: 2 }],
      [{ _id: 'user-1', username: 'teacher' }],
      [{ _id: 'cat-1', name: 'Science' }],
    )).toEqual([{
      id: 'quiz-1', title: 'Quiz', course_code: 'ABC', source_type: 'explore_public',
      source_label: 'Public Library', source_creator_name: 'teacher', questionCount: 2,
      studentCount: 0, categoryId: 'cat-1', categoryName: 'Science',
      latestCorrectCount: null, latestTotalCount: null, latestScoreOnTen: null,
      totalStudyMinutes: null,
    }])
  })
})
