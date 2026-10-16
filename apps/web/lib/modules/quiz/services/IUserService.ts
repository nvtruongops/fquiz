/**
 * IUserService — Interface for cross-module user operations.
 * Quiz module consumes this interface instead of importing User model directly.
 */
export interface IUserService {
  /** Get map of userId → username for a list of userIds */
  getUsernames(userIds: string[]): Promise<Map<string, string>>
}
