import { describe, expect, it } from 'vitest';
import { bangkokDate, decidePunch, lineUserFromVerification, parseRequest } from '../logic';

const site = { id: 's1', name: 'โรงงานระยอง', latitude: 12.6814, longitude: 101.2816, radius_m: 150 };
const inside = { latitude: 12.6818, longitude: 101.2816, accuracy: 12 };

describe('parseRequest', () => {
  it('accepts a punch with a position', () => {
    const result = parseRequest({ action: 'punch', position: { latitude: 12.68, longitude: 101.28, accuracy: 9.6 } });
    expect(result).toEqual({ ok: true, request: { action: 'punch', position: { latitude: 12.68, longitude: 101.28, accuracy: 10 }, lineIdToken: null, employeeCode: '', nationalId: '' } });
  });

  it('refuses a punch without a position or with a bad one', () => {
    expect(parseRequest({ action: 'punch' })).toEqual({ ok: false, error: 'ต้องเปิดตำแหน่งที่ตั้งก่อนลงเวลา' });
    expect(parseRequest({ action: 'punch', position: { latitude: 'x', longitude: 1 } })).toEqual({ ok: false, error: 'พิกัดไม่ถูกต้อง' });
    expect(parseRequest({ action: 'punch', position: { latitude: 95, longitude: 1 } })).toEqual({ ok: false, error: 'พิกัดไม่ถูกต้อง' });
  });

  it('refuses unknown actions and junk', () => {
    expect(parseRequest(null).ok).toBe(false);
    expect(parseRequest({ action: 'drop' }).ok).toBe(false);
    expect(parseRequest('status').ok).toBe(false);
  });

  it('checks what a link needs', () => {
    expect(parseRequest({ action: 'link', employeeCode: 'EMP-1', nationalId: '1234567890121' })).toEqual({ ok: false, error: 'ผูกบัญชีได้เฉพาะจาก LINE' });
    expect(parseRequest({ action: 'link', lineIdToken: 't', nationalId: '1234567890121' })).toEqual({ ok: false, error: 'กรุณากรอกรหัสพนักงาน' });
    expect(parseRequest({ action: 'link', lineIdToken: 't', employeeCode: 'EMP-1', nationalId: '12345' })).toEqual({ ok: false, error: 'เลขประจำตัวประชาชนต้องมี 13 หลัก' });
    const ok = parseRequest({ action: 'link', lineIdToken: 't', employeeCode: ' EMP-1 ', nationalId: '1-2345-67890-12-1' });
    expect(ok.ok && ok.request.employeeCode).toBe('EMP-1');
    expect(ok.ok && ok.request.nationalId).toBe('1234567890121');
  });

  it('cuts over-long text', () => {
    const result = parseRequest({ action: 'status', lineIdToken: 'x'.repeat(5000) });
    expect(result.ok && result.request.lineIdToken?.length).toBe(4096);
  });
});

describe('lineUserFromVerification', () => {
  const now = new Date('2026-10-01T03:00:00Z');
  const exp = Math.floor(now.getTime() / 1000) + 600;

  it('returns the user id of a token for our channel', () => {
    expect(lineUserFromVerification({ aud: '1234', exp, sub: 'U1' }, '1234', now)).toBe('U1');
  });

  it('rejects another channel, an expired token or no subject', () => {
    expect(lineUserFromVerification({ aud: '9999', exp, sub: 'U1' }, '1234', now)).toBeNull();
    expect(lineUserFromVerification({ aud: '1234', exp: exp - 1200, sub: 'U1' }, '1234', now)).toBeNull();
    expect(lineUserFromVerification({ aud: '1234', exp }, '1234', now)).toBeNull();
    expect(lineUserFromVerification(null, '1234', now)).toBeNull();
  });
});

describe('decidePunch', () => {
  const now = new Date('2026-10-01T01:00:00Z');

  it('allows a first punch inside the radius', () => {
    const decision = decidePunch(inside, [site], [], now, '2026-10-01');
    expect(decision.allowed).toBe(true);
    expect(decision.plan.kind).toBe('in');
    expect(decision.geofence.site?.name).toBe('โรงงานระยอง');
  });

  it('refuses outside the radius and says by how much', () => {
    const decision = decidePunch({ latitude: 12.6840, longitude: 101.2816, accuracy: 12 }, [site], [], now, '2026-10-01');
    expect(decision.allowed).toBe(false);
    expect(decision.reason).toBe('อยู่นอกรัศมีของจุดลงเวลา โรงงานระยอง เกินมา 139 ม.');
  });

  it('refuses when there are no sites, or the fix is poor', () => {
    expect(decidePunch(inside, [], [], now, '2026-10-01').reason).toContain('ยังไม่ได้ตั้งจุดลงเวลา');
    expect(decidePunch({ ...inside, accuracy: 900 }, [site], [], now, '2026-10-01').reason).toContain('GPS');
  });

  it('refuses a third punch in the day even inside the radius', () => {
    const done = { id: 'a', log_date: '2026-10-01', check_in: '2026-10-01T00:00:00Z', check_out: '2026-10-01T00:30:00Z' };
    const decision = decidePunch(inside, [site], [done], now, '2026-10-01');
    expect(decision.allowed).toBe(false);
    expect(decision.reason).toContain('ลงเวลาเข้าและออกแล้ว');
  });
});

describe('bangkokDate', () => {
  it('is the date in Bangkok, not UTC', () => {
    expect(bangkokDate(new Date('2026-09-30T18:00:00Z'))).toBe('2026-10-01');
    expect(bangkokDate(new Date('2026-09-30T16:59:00Z'))).toBe('2026-09-30');
  });
});
