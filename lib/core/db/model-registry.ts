/**
 * Model Registry — Giải pháp thay thế import tĩnh trong mongodb.ts.
 *
 * Mỗi module tự đăng ký model của mình. Khi connectDB() được gọi,
 * bootstrapModels() đảm bảo tất cả model đã được import → đăng ký với Mongoose.
 *
 * Mục đích DUY NHẤT: tránh MissingSchemaError trong Next.js Serverless Routes.
 * KHÔNG phải là DI container hay framework.
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

/** Kiểm tra model đã được đăng ký trong registry (dùng cho test) */
export function getRegistrySize(): number {
  return registry.length
}
