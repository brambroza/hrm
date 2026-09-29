/**
 * @file Thai public holidays that fall on the same date every year.
 *
 * Holidays set by the lunar calendar (Makha Bucha, Visakha Bucha, Asalha Bucha,
 * Buddhist Lent) and substitution days move each year and are announced
 * officially, so they are not listed here; the user adds them by hand.
 */

export interface FixedHoliday {
  /** Month and day, `MM-DD`. */
  monthDay: string;
  name: string;
}

export const FIXED_THAI_HOLIDAYS: FixedHoliday[] = [
  { monthDay: '01-01', name: 'วันขึ้นปีใหม่' },
  { monthDay: '04-06', name: 'วันจักรี' },
  { monthDay: '04-13', name: 'วันสงกรานต์' },
  { monthDay: '04-14', name: 'วันสงกรานต์' },
  { monthDay: '04-15', name: 'วันสงกรานต์' },
  { monthDay: '05-01', name: 'วันแรงงานแห่งชาติ' },
  { monthDay: '05-04', name: 'วันฉัตรมงคล' },
  { monthDay: '06-03', name: 'วันเฉลิมพระชนมพรรษาสมเด็จพระราชินี' },
  { monthDay: '07-28', name: 'วันเฉลิมพระชนมพรรษาพระบาทสมเด็จพระเจ้าอยู่หัว' },
  { monthDay: '08-12', name: 'วันแม่แห่งชาติ' },
  { monthDay: '10-13', name: 'วันนวมินทรมหาราช' },
  { monthDay: '10-23', name: 'วันปิยมหาราช' },
  { monthDay: '12-05', name: 'วันพ่อแห่งชาติ' },
  { monthDay: '12-10', name: 'วันรัฐธรรมนูญ' },
  { monthDay: '12-31', name: 'วันสิ้นปี' },
];

/**
 * The fixed-date holidays of a year as calendar dates.
 * @param year - Gregorian year, e.g. 2026.
 * @returns One entry per holiday, in date order.
 * @throws {RangeError} When the year is not a four-digit Gregorian year.
 */
export const fixedHolidaysForYear = (year: number): { holiday_date: string; name: string }[] => {
  if (!Number.isInteger(year) || year < 1900 || year > 2400) throw new RangeError(`Invalid year: ${year}`);
  return FIXED_THAI_HOLIDAYS.map((holiday) => ({
    holiday_date: `${year}-${holiday.monthDay}`,
    name: holiday.name,
  }));
};
