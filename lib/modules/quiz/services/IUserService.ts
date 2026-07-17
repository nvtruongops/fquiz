/**
 * IUserService — Interface cho cross-module user operations.
 * Quiz module dùng interface này thay vì import User model trực tiếp.
 */
export interface IUserService {
  /** Lấy map userId → username cho danh sách userIds */
  getUsernames(userIds: string[]): Promise<Map<string, string>>
}
