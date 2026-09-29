import { describe, expect, it } from 'vitest';
import { VALID_STATUSES, isPeriodClosed, isValidStatus, normalizeStatus, getStatusLabel } from '../statusValidator';

describe('normalizeStatus', () => {
  it('lowercases and trims', () => {
    expect(normalizeStatus('CLOSED')).toBe(VALID_STATUSES.CLOSED);
    expect(normalizeStatus('  Open ')).toBe(VALID_STATUSES.OPEN);
  });

  it('maps legacy names', () => {
    expect(normalizeStatus('active')).toBe(VALID_STATUSES.OPEN);
    expect(normalizeStatus('pending')).toBe(VALID_STATUSES.DRAFT);
    expect(normalizeStatus('locked')).toBe(VALID_STATUSES.CLOSED);
  });

  it('falls back to draft', () => {
    expect(normalizeStatus(null)).toBe(VALID_STATUSES.DRAFT);
    expect(normalizeStatus('whatever')).toBe(VALID_STATUSES.DRAFT);
  });
});

describe('isPeriodClosed', () => {
  it('is true for every spelling of closed', () => {
    // Regression: the page compared against 'CLOSED' while the app stored 'closed'.
    expect(isPeriodClosed('closed')).toBe(true);
    expect(isPeriodClosed('CLOSED')).toBe(true);
    expect(isPeriodClosed('Locked')).toBe(true);
  });

  it('is false for open, draft and missing statuses', () => {
    expect(isPeriodClosed('open')).toBe(false);
    expect(isPeriodClosed('OPEN')).toBe(false);
    expect(isPeriodClosed('draft')).toBe(false);
    expect(isPeriodClosed(undefined)).toBe(false);
  });
});

describe('isValidStatus and labels', () => {
  it('validates known statuses only', () => {
    expect(isValidStatus('Draft')).toBe(true);
    expect(isValidStatus('active')).toBe(false);
    expect(isValidStatus('')).toBe(false);
  });

  it('labels in Thai', () => {
    expect(getStatusLabel('CLOSED')).toBe('ปิดงวด');
    expect(getStatusLabel('open')).toBe('เปิดใช้งาน');
  });
});
