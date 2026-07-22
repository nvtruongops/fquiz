import { registerUserCleanupHandler, executeUserCleanup } from '../user-cleanup-registry'

describe('User Cleanup Registry', () => {
  it('should register and execute cleanup handlers for different modules', async () => {
    const mockCommunityCleanup = jest.fn().mockResolvedValue(undefined)
    const mockQuizCleanup = jest.fn().mockResolvedValue(undefined)

    registerUserCleanupHandler('test-community', mockCommunityCleanup)
    registerUserCleanupHandler('test-quiz', mockQuizCleanup)

    await executeUserCleanup('user123')

    expect(mockCommunityCleanup).toHaveBeenCalledWith('user123')
    expect(mockQuizCleanup).toHaveBeenCalledWith('user123')
  })
})
