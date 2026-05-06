import { Model, Types } from 'mongoose'
import { JWTPayload } from './auth'

export type ResourceType = 'quiz' | 'session' | 'history'

/**
 * Standard utility to authorize resource ownership.
 * Throws a Response (403 or 404) if authorization fails.
 */
export async function authorizeResource<T>(
  payload: JWTPayload,
  resourceId: string | Types.ObjectId,
  model: Model<T>,
  resourceType: ResourceType,
  ownerField: string = 'user_id'
): Promise<T> {
  const resource = await model.findById(resourceId)

  if (!resource) {
    throw new Response(
      JSON.stringify({ error: `${resourceType} not found` }),
      { status: 404, headers: { 'Content-Type': 'application/json' } }
    )
  }

  // Admin bypasses ownership check
  if (payload.role === 'admin') {
    return resource as T
  }

  // Check ownership
  const ownerId = (resource as any)[ownerField]
  
  if (!ownerId || ownerId.toString() !== payload.userId) {
    throw new Response(
      JSON.stringify({ error: 'Forbidden: You do not own this resource' }),
      { status: 403, headers: { 'Content-Type': 'application/json' } }
    )
  }

  return resource as T
}

/**
 * Test Matrix Criteria (Mandatory for PRs):
 * 1. Positive: Resource owner can access/mutate.
 * 2. Negative (IDOR): Another student cannot access/mutate.
 * 3. Administrative: Admin can access/mutate any resource.
 * 4. Boundary: Non-existent resource ID returns 404.
 */
