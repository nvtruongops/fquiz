/**
 * User Cleanup Registry — Registry cho phép các module đăng ký xử lý dọn dẹp dữ liệu cá nhân
 * của người dùng khi tài khoản bị xóa vĩnh viễn (GDPR / Right to be Forgotten).
 *
 * Giúp tuân thủ ranh giới module: auth module không cần import trực tiếp Mongoose models từ các module khác.
 */

export type UserCleanupHandler = (userId: string) => Promise<void>

const registry: Map<string, UserCleanupHandler> = new Map()

export function registerUserCleanupHandler(moduleName: string, handler: UserCleanupHandler): void {
  registry.set(moduleName, handler)
}

export async function executeUserCleanup(userId: string): Promise<void> {
  for (const [moduleName, handler] of registry.entries()) {
    try {
      await handler(userId)
    } catch (err) {
      console.error(`[UserCleanupRegistry] Error executing cleanup for module '${moduleName}':`, err)
      throw err
    }
  }
}
