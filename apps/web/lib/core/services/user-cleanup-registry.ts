/**
 * User Cleanup Registry — Registry allowing modules to register personal data cleanup handlers
 * when a user account is permanently deleted (GDPR / Right to be Forgotten).
 *
 * Helps maintain module boundaries: the auth module does not need to directly import Mongoose models from other modules.
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
