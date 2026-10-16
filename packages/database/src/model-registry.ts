/**
 * Model Registry — Safe Mongoose schema/model registration pattern
 * SOLE PURPOSE: Prevent MissingSchemaError in Next.js Serverless Routes.
 */

const registry: Array<() => Promise<void> | void> = []

export function registerModel(registration: () => Promise<void> | void): void {
  registry.push(registration)
}

export async function bootstrapModels(): Promise<void> {
  for (const register of registry) {
    await register()
  }
}
