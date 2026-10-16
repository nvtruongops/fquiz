import { fetchPublicCategories, usePublicCategories } from '../quiz/usePublicCategories'
import { useQuery } from '@tanstack/react-query'

jest.mock('@tanstack/react-query', () => ({
  useQuery: jest.fn(),
}))

describe('usePublicCategories & fetchPublicCategories', () => {
  const originalFetch = global.fetch

  beforeEach(() => {
    jest.clearAllMocks()
  })

  afterEach(() => {
    global.fetch = originalFetch
  })

  describe('fetchPublicCategories', () => {
    it('should successfully fetch and map category items', async () => {
      const mockData = [
        { id: '1', name: 'Mathematics', publishedQuizCount: 10 },
        { _id: '2', name: 'Physics', quizCount: 5 },
        { id: '3', name: 'Chemistry' },
      ]

      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ data: mockData }),
      } as Response)

      const result = await fetchPublicCategories()

      expect(global.fetch).toHaveBeenCalledWith('/api/v1/public/categories', {
        headers: { Accept: 'application/json' },
      })
      expect(result).toEqual([
        { id: '1', name: 'Mathematics', quizCount: 10 },
        { id: '2', name: 'Physics', quizCount: 5 },
        { id: '3', name: 'Chemistry', quizCount: 0 },
      ])
    })

    it('should throw an error when API response is not ok', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: false,
        status: 503,
        json: async () => ({ error: 'Database connection failed' }),
      } as Response)

      await expect(fetchPublicCategories()).rejects.toThrow('Database connection failed')
    })

    it('should throw fallback error message if response json has no message/error', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: false,
        status: 500,
        json: async () => {
          throw new Error('invalid json')
        },
      } as unknown as Response)

      await expect(fetchPublicCategories()).rejects.toThrow('Failed to load course categories (500)')
    })
  })

  describe('usePublicCategories', () => {
    it('should call useQuery with correct options and return categories', () => {
      const mockCategories = [{ id: '1', name: 'Subject A', quizCount: 3 }]
      ;(useQuery as jest.Mock).mockReturnValue({
        data: mockCategories,
        isLoading: false,
        isError: false,
      })

      const res = usePublicCategories({ initialData: mockCategories })

      expect(useQuery).toHaveBeenCalledWith(
        expect.objectContaining({
          queryKey: ['public', 'categories'],
          queryFn: fetchPublicCategories,
          initialData: mockCategories,
          retry: 2,
          staleTime: 5 * 60 * 1000,
          gcTime: 10 * 60 * 1000,
        })
      )

      expect(res.categories).toEqual(mockCategories)
    })

    it('should fallback to empty array when query data is undefined', () => {
      ;(useQuery as jest.Mock).mockReturnValue({
        data: undefined,
        isLoading: true,
        isError: false,
      })

      const res = usePublicCategories()

      expect(res.categories).toEqual([])
      expect(res.isLoading).toBe(true)
    })
  })
})
