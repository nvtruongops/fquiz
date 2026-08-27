/**
 * Model Registry — Giải pháp đăng ký schema/models Mongoose an toàn
 * Mục đích DUY NHẤT: tránh MissingSchemaError trong Next.js Serverless Routes.
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
