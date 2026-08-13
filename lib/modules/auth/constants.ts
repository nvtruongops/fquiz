/**
 * Role hierarchy for explicit permission matching.
 * Higher/elevated roles include access rights to lower roles.
 */
export const ROLE_HIERARCHY: Record<string, string[]> = {
  student: ['student', 'teacher', 'admin', 'dev'],
  teacher: ['teacher', 'admin', 'dev'],
  admin: ['admin', 'dev'],
  dev: ['dev'],
}

/**
 * Returns all roles that satisfy the required roles (including elevated roles).
 */
export function expandAllowedRoles(requiredRoles?: string[]): string[] | undefined {
  if (!requiredRoles || requiredRoles.length === 0) return undefined
  const expanded = new Set<string>()
  for (const role of requiredRoles) {
    const inherited = ROLE_HIERARCHY[role] ?? [role]
    for (const r of inherited) {
      expanded.add(r)
    }
  }
  return Array.from(expanded)
}
