import { describe, expect, it } from 'vitest';
import { DEFAULT_ROLE, USER_ROLES, isUserRole, normalizeRole } from '../roles';

describe('roles', () => {
  it('lists the five provisioned roles in lowercase', () => {
    expect(USER_ROLES).toEqual(['admin', 'hr', 'manager', 'supervisor', 'employee']);
    expect(DEFAULT_ROLE).toBe('employee');
  });

  it('accepts only exact database spellings', () => {
    expect(isUserRole('hr')).toBe(true);
    expect(isUserRole('HR')).toBe(false);
    expect(isUserRole('accountant')).toBe(false);
    expect(isUserRole(undefined)).toBe(false);
  });

  it('normalizes casing written by the old forms', () => {
    expect(normalizeRole('Admin')).toBe('admin');
    expect(normalizeRole(' HR ')).toBe('hr');
    expect(normalizeRole('Supervisor')).toBe('supervisor');
  });

  it('returns null for roles that do not exist', () => {
    expect(normalizeRole('Accountant')).toBeNull();
    expect(normalizeRole('')).toBeNull();
    expect(normalizeRole(null)).toBeNull();
  });
});
