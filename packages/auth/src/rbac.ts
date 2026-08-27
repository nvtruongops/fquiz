export const ROLE_ACCESS_HIERARCHY: Record<string, string[]> = {
  student: ['student', 'teacher', 'admin', 'dev'],
  teacher: ['teacher', 'admin', 'dev'],
  admin: ['admin', 'dev'],
  dev: ['dev'],
}

export const ROLE_HIERARCHY = ROLE_ACCESS_HIERARCHY

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

export function hasRole(userRole: string, requiredRole: string): boolean {
  const allowed = ROLE_ACCESS_HIERARCHY[requiredRole] ?? [requiredRole]
  return allowed.includes(userRole)
}
