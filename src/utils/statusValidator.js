
// Status constants matching database constraints
// Based on common patterns and the error description, valid statuses are likely: 'draft', 'open', 'closed'
// If 'active' was used before, it should map to 'open'
export const VALID_STATUSES = {
  DRAFT: 'draft',
  OPEN: 'open',
  CLOSED: 'closed'
};

// Check if status is valid
export const isValidStatus = (status) => {
  if (!status) return false;
  const normalized = String(status).trim().toLowerCase();
  return Object.values(VALID_STATUSES).includes(normalized);
};

// Normalize status to valid value (defaults to DRAFT)
export const normalizeStatus = (status) => {
  if (!status) return VALID_STATUSES.DRAFT;
  
  const normalized = String(status).trim().toLowerCase();
  
  if (Object.values(VALID_STATUSES).includes(normalized)) {
    return normalized;
  }
  
  // Map legacy/alternative statuses to valid ones
  if (normalized === 'active') return VALID_STATUSES.OPEN;
  if (normalized === 'pending') return VALID_STATUSES.DRAFT;
  if (normalized === 'locked') return VALID_STATUSES.CLOSED;
  
  return VALID_STATUSES.DRAFT;
};

/**
 * Whether a payroll period is closed and therefore locked against changes.
 * Goes through normalizeStatus so 'CLOSED', 'closed' and 'locked' all count;
 * comparing the raw value against one spelling left closed periods editable.
 * @param {string|null|undefined} status - Raw status from the database.
 * @returns {boolean} True when the period must not be modified.
 */
export const isPeriodClosed = (status) => normalizeStatus(status) === VALID_STATUSES.CLOSED;

/** Message used whenever a change to a closed period is refused. */
export const CLOSED_PERIOD_MESSAGE = 'งวดนี้ปิดแล้ว แก้ไขไม่ได้ การแก้ไขให้ทำเป็นรายการปรับปรุงในงวดถัดไป';

// Get display label in Thai
export const getStatusLabel = (status) => {
  const s = normalizeStatus(status);
  switch (s) {
    case VALID_STATUSES.DRAFT: return 'ร่าง';
    case VALID_STATUSES.OPEN: return 'เปิดใช้งาน';
    case VALID_STATUSES.CLOSED: return 'ปิดงวด';
    default: return 'ร่าง';
  }
};

// Get Tailwind CSS classes for status badge
export const getStatusColor = (status) => {
  const s = normalizeStatus(status);
  switch (s) {
    case VALID_STATUSES.DRAFT: 
      return 'bg-yellow-100 text-yellow-800 border-yellow-200 hover:bg-yellow-200';
    case VALID_STATUSES.OPEN: 
      return 'bg-green-100 text-green-800 border-green-200 hover:bg-green-200';
    case VALID_STATUSES.CLOSED: 
      return 'bg-gray-100 text-gray-800 border-gray-200 hover:bg-gray-200';
    default: 
      return 'bg-gray-100 text-gray-800 border-gray-200';
  }
};
