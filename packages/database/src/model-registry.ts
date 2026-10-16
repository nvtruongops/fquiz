/**
 * Model Registry — Safe Mongoose schema/model registration pattern
 * SOLE PURPOSE: Prevent MissingSchemaError in Next.js Serverless Routes.
 */

type ModelRegistration = () => Promise<void> | void

declare global {
  // eslint-disable-next-line no-var
  var __fquizModelRegistry: Array<ModelRegistration> | undefined
}

const registry: Array<ModelRegistration> =
  global.__fquizModelRegistry ?? (global.__fquizModelRegistry = [])

export function registerModel(registration: ModelRegistration): void {
  if (!registry.includes(registration)) {
    registry.push(registration)
  }
}

export async function bootstrapModels(): Promise<void> {
  for (const register of registry) {
    await register()
  }
}

