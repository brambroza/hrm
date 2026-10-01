import { describe, expect, it } from 'vitest';
import { MAX_ACCURACY_M, distanceBetween, evaluatePosition, formatDistance, isLatitude, isLongitude, isRadius } from '../geofence';
import { planPunch } from '../punch';

const factory = { id: 's1', name: 'โรงงานระยอง', latitude: 12.6814, longitude: 101.2816, radius_m: 150 };
const office = { id: 's2', name: 'สำนักงานกรุงเทพ', latitude: 13.7563, longitude: 100.5018, radius_m: 100 };

describe('distanceBetween', () => {
  it('is zero for the same point and symmetric', () => {
    expect(distanceBetween(factory, factory)).toBe(0);
    expect(distanceBetween(factory, office)).toBeCloseTo(distanceBetween(office, factory), 6);
  });

  it('matches a known distance', () => {
    // Bangkok to Rayong factory: about 143 km.
    expect(distanceBetween(office, factory)).toBeGreaterThan(140000);
    expect(distanceBetween(office, factory)).toBeLessThan(150000);
    // 0.001 degree of latitude is about 111 m.
    expect(distanceBetween(factory, { ...factory, latitude: factory.latitude + 0.001 })).toBeCloseTo(111.2, 0);
  });
});

describe('evaluatePosition', () => {
  it('is inside within the radius of the nearest site', () => {
    const result = evaluatePosition({ latitude: 12.6820, longitude: 101.2816, accuracy: 15 }, [office, factory]);
    expect(result.verdict).toBe('inside');
    expect(result.site?.id).toBe('s1');
    expect(result.distance_m).toBe(67);
    expect(result.overshoot_m).toBe(0);
  });

  it('is outside beyond the radius, and says by how much', () => {
    const result = evaluatePosition({ latitude: 12.6840, longitude: 101.2816, accuracy: 15 }, [factory]);
    expect(result.verdict).toBe('outside');
    expect(result.distance_m).toBe(289);
    expect(result.overshoot_m).toBe(139);
  });

  it('does not let poor accuracy stretch the radius', () => {
    const edge = { latitude: 12.6834, longitude: 101.2816 };
    expect(evaluatePosition({ ...edge, accuracy: 190 }, [factory]).verdict).toBe('outside');
    expect(evaluatePosition({ ...edge, accuracy: MAX_ACCURACY_M + 1 }, [factory]).verdict).toBe('imprecise');
  });

  it('ignores inactive or broken sites', () => {
    expect(evaluatePosition({ latitude: 12.6814, longitude: 101.2816 }, [{ ...factory, is_active: false }]).verdict).toBe('no_sites');
    expect(evaluatePosition({ latitude: 12.6814, longitude: 101.2816 }, [{ ...factory, latitude: 999 }]).verdict).toBe('no_sites');
    expect(evaluatePosition({ latitude: 12.6814, longitude: 101.2816 }, []).verdict).toBe('no_sites');
  });

  it('needs a position', () => {
    expect(evaluatePosition(null, [factory]).verdict).toBe('no_position');
    expect(evaluatePosition({ latitude: Number.NaN, longitude: 1 }, [factory]).verdict).toBe('no_position');
  });
});

describe('validation and formatting', () => {
  it('checks coordinates and radius', () => {
    expect(isLatitude(13.7)).toBe(true);
    expect(isLatitude(91)).toBe(false);
    expect(isLatitude('13.7')).toBe(false);
    expect(isLongitude(100.5)).toBe(true);
    expect(isLongitude(-181)).toBe(false);
    expect(isRadius(150)).toBe(true);
    expect(isRadius(10)).toBe(false);
    expect(isRadius(150.5)).toBe(false);
    expect(isRadius(6000)).toBe(false);
  });

  it('writes distances the way people say them', () => {
    expect(formatDistance(85.4)).toBe('85 ม.');
    expect(formatDistance(1234)).toBe('1.2 กม.');
    expect(formatDistance(12345)).toBe('12 กม.');
    expect(formatDistance(null)).toBe('');
  });
});

describe('planPunch', () => {
  const today = '2026-10-01';

  it('starts a day when nothing is open', () => {
    expect(planPunch([], '2026-10-01T01:02:00.000Z', today)).toEqual({ kind: 'in', target: null });
  });

  it('closes the open day', () => {
    const open = { id: 'a', log_date: today, check_in: '2026-10-01T01:02:00.000Z', check_out: null };
    expect(planPunch([open], '2026-10-01T10:00:00.000Z', today)).toEqual({ kind: 'out', target: open });
  });

  it('closes a night shift that started yesterday', () => {
    const open = { id: 'a', log_date: '2026-09-30', check_in: '2026-09-30T15:00:00.000Z', check_out: null };
    expect(planPunch([open], '2026-09-30T23:30:00.000Z', today).kind).toBe('out');
  });

  it('abandons a day left open for too long and starts afresh', () => {
    const stale = { id: 'a', log_date: '2026-09-29', check_in: '2026-09-29T01:00:00.000Z', check_out: null };
    expect(planPunch([stale], '2026-10-01T01:00:00.000Z', today)).toEqual({ kind: 'in', target: null });
  });

  it('refuses a double tap and a third punch in a day', () => {
    const open = { id: 'a', log_date: today, check_in: '2026-10-01T01:02:00.000Z', check_out: null };
    expect(planPunch([open], '2026-10-01T01:02:20.000Z', today).refusal).toContain('เมื่อสักครู่');
    const done = { ...open, check_out: '2026-10-01T10:00:00.000Z' };
    expect(planPunch([done], '2026-10-01T11:00:00.000Z', today).refusal).toContain('ลงเวลาเข้าและออกแล้ว');
  });
});
