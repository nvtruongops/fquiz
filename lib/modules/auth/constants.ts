/**
 * Role access map: Maps a minimum required role to all user roles (identities)
 * that possess equal or elevated access rights to satisfy the requirement.
 * 
 * Example:
 * - Requiring 'student' access permits 'student', 'teacher', 'admin', and 'dev'.
 * - Requiring 'admin' access permits only 'admin' and 'dev'.
 */
export const ROLE_ACCESS_HIERARCHY: Record<string, string[]> = {
  student: ['student', 'teacher', 'admin', 'dev'],
  teacher: ['teacher', 'admin', 'dev'],
  admin: ['admin', 'dev'],
  dev: ['dev'],
}

/** Backward compatibility alias */
export const ROLE_HIERARCHY = ROLE_ACCESS_HIERARCHY

/**
 * Returns all user identity roles that are permitted to satisfy the minimum required roles.
 * Returns undefined if no specific role requirement is specified.
 */
export function expandAllowedRoles(requiredRoles?: string[]): string[] | undefined {
  if (!requiredRoles || requiredRoles.length === 0) return undefined
  const allowedIdentities = new Set<string>()
  for (const role of requiredRoles) {
    const matchingIdentities = ROLE_ACCESS_HIERARCHY[role] ?? [role]
    for (const identity of matchingIdentities) {
      allowedIdentities.add(identity)
    }
  }
  return Array.from(allowedIdentities)
}
