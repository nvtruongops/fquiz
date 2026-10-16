import { getPublicCategories, getStudentPinnedCategoryIds } from '@/lib/modules/quiz/services/category.service'
import { Category, PUBLIC_CATEGORY_MATCH, Quiz, User } from '@fquiz/models'
import { connectDB } from '@/lib/core/db/mongodb'

jest.mock('@/lib/core/db/mongodb', () => ({
  connectDB: jest.fn().mockResolvedValue(undefined),
}))

jest.mock('@fquiz/models', () => ({
  Category: {
    find: jest.fn(),
  },
  PUBLIC_CATEGORY_MATCH: {
    $or: [{ type: 'public' }, { is_public: true }],
  },
  Quiz: {
    aggregate: jest.fn(),
  },
  User: {
    findById: jest.fn(),
  },
}))

describe('CategoryService', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('getPublicCategories', () => {
    it('should connect to db, fetch categories and map published quiz counts', async () => {
      const mockCategories = [
        { _id: 'cat_1', name: 'Advanced Mathematics' },
        { _id: 'cat_2', name: 'Marxist-Leninist Philosophy' },
        { _id: 'cat_3', name: 'C++ Programming' },
      ]

      const mockQuizCounts = [
        { _id: 'cat_1', count: 5 },
        { _id: 'cat_2', count: 12 },
      ]

      const leanMock = jest.fn().mockResolvedValue(mockCategories)
      const sortMock = jest.fn().mockReturnValue({ lean: leanMock })
      const selectMock = jest.fn().mockReturnValue({ sort: sortMock })
      ;(Category.find as jest.Mock).mockReturnValue({ select: selectMock })
      ;(Quiz.aggregate as jest.Mock).mockResolvedValue(mockQuizCounts)

      const result = await getPublicCategories()

      expect(connectDB).toHaveBeenCalled()
      expect(Category.find).toHaveBeenCalledWith(PUBLIC_CATEGORY_MATCH)
      expect(selectMock).toHaveBeenCalledWith('name')
      expect(sortMock).toHaveBeenCalledWith({ name: 1 })
      expect(Quiz.aggregate).toHaveBeenCalledWith([
        {
          $match: {
            category_id: { $in: ['cat_1', 'cat_2', 'cat_3'] },
            is_public: true,
            status: 'published',
            is_temp: { $ne: true },
          },
        },
        {
          $group: {
            _id: '$category_id',
            count: { $sum: 1 },
          },
        },
      ])

      expect(result).toEqual([
        { id: 'cat_1', name: 'Advanced Mathematics', publishedQuizCount: 5, quizCount: 5, type: 'public' },
        { id: 'cat_2', name: 'Marxist-Leninist Philosophy', publishedQuizCount: 12, quizCount: 12, type: 'public' },
        { id: 'cat_3', name: 'C++ Programming', publishedQuizCount: 0, quizCount: 0, type: 'public' },
      ])
    })
  })

  describe('getStudentPinnedCategoryIds', () => {
    it('should return empty array if userId is empty or invalid ObjectId', async () => {
      const resultEmpty = await getStudentPinnedCategoryIds('')
      expect(resultEmpty).toEqual([])

      const resultInvalid = await getStudentPinnedCategoryIds('invalid_id')
      expect(resultInvalid).toEqual([])
      expect(connectDB).not.toHaveBeenCalled()
    })

    it('should return user pinned categories if found', async () => {
      const validUserId = '507f1f77bcf86cd799439011'
      const leanMock = jest.fn().mockResolvedValue({ pinned_categories: ['cat_1', 'cat_2'] })
      const selectMock = jest.fn().mockReturnValue({ lean: leanMock })
      ;(User.findById as jest.Mock).mockReturnValue({ select: selectMock })

      const result = await getStudentPinnedCategoryIds(validUserId)

      expect(connectDB).toHaveBeenCalled()
      expect(User.findById).toHaveBeenCalledWith(validUserId)
      expect(selectMock).toHaveBeenCalledWith('pinned_categories')
      expect(result).toEqual(['cat_1', 'cat_2'])
    })

    it('should return empty array if user has no pinned categories', async () => {
      const validUserId = '507f191e810c19729de860ea'
      const leanMock = jest.fn().mockResolvedValue(null)
      const selectMock = jest.fn().mockReturnValue({ lean: leanMock })
      ;(User.findById as jest.Mock).mockReturnValue({ select: selectMock })

      const result = await getStudentPinnedCategoryIds(validUserId)

      expect(result).toEqual([])
    })
  })
})
