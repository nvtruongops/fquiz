import { expandAllowedRoles, ROLE_ACCESS_HIERARCHY } from '../constants'

describe('Role Access Hierarchy & expandAllowedRoles', () => {
  it('should expand student requirement to student, teacher, admin, and dev identities', () => {
    const allowed = expandAllowedRoles(['student'])
    expect(allowed).toEqual(['student', 'teacher', 'admin', 'dev'])
  })

  it('should expand teacher requirement to teacher, admin, and dev identities', () => {
    const allowed = expandAllowedRoles(['teacher'])
    expect(allowed).toEqual(['teacher', 'admin', 'dev'])
  })

  it('should expand admin requirement to admin and dev identities only', () => {
    const allowed = expandAllowedRoles(['admin'])
    expect(allowed).toEqual(['admin', 'dev'])
  })

  it('should expand dev requirement to dev identity only', () => {
    const allowed = expandAllowedRoles(['dev'])
    expect(allowed).toEqual(['dev'])
  })

  it('should return undefined when requiredRoles is empty or undefined', () => {
    expect(expandAllowedRoles()).toBeUndefined()
    expect(expandAllowedRoles([])).toBeUndefined()
  })

  it('should correctly evaluate authorization permission matching', () => {
    const adminAllowed = expandAllowedRoles(['admin'])!

    // Student identity attempting admin access -> Denied
    expect(adminAllowed.includes('student')).toBe(false)
    // Teacher identity attempting admin access -> Denied
    expect(adminAllowed.includes('teacher')).toBe(false)
    // Admin identity attempting admin access -> Allowed
    expect(adminAllowed.includes('admin')).toBe(true)
    // Dev identity attempting admin access -> Allowed
    expect(adminAllowed.includes('dev')).toBe(true)
  })
})
