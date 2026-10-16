/**
 * Model Registry — Alternative solution to static imports in mongodb.ts.
 *
 * Each module registers its own models. When connectDB() is called,
 * bootstrapModels() ensures all models are imported → registered with Mongoose.
 *
 * SOLE PURPOSE: Prevent MissingSchemaError in Next.js Serverless Routes.
 * NOT a DI container or framework.
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
