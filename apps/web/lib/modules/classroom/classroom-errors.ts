import { Types } from 'mongoose'

export class ClassroomReadError extends Error {
  constructor(public readonly status: 400 | 404, message: string) {
    super(message)
  }
}

export function validateClassroomResourceId(id: string): void {
  if (typeof id !== 'string' || !Types.ObjectId.isValid(id)) {
    throw new ClassroomReadError(400, 'Invalid resource ID')
  }
}
