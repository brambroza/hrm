/**
 * @file Role names as the database stores them.
 *
 * `users.role` is matched by name against `roles.name`, which is lowercase. The
 * user forms used to write 'Admin', 'HR' and a role that does not exist
 * ('Accountant'); those users matched no role and lost every permission.
 */

/** Roles provisioned for every organization, highest privilege first. */
export const USER_ROLES = ['admin', 'hr', 'manager', 'supervisor', 'employee'] as const;

export type UserRole = (typeof USER_ROLES)[number];

/** Role given to a user when none is chosen. */
export const DEFAULT_ROLE: UserRole = 'employee';

/**
 * Whether a value is a role the database knows.
 * @param value - Candidate role name.
 * @returns True only for an exact, lowercase role name.
 */
export const isUserRole = (value: unknown): value is UserRole =>
  typeof value === 'string' && (USER_ROLES as readonly string[]).includes(value);

/**
 * Bring a stored or typed role to its database spelling.
 * @param value - Role in any casing, possibly padded.
 * @returns The matching role, or null when it is not a known role.
 */
export const normalizeRole = (value: unknown): UserRole | null => {
  if (typeof value !== 'string') return null;
  const candidate = value.trim().toLowerCase();
  return isUserRole(candidate) ? candidate : null;
};
