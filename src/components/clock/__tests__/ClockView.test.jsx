import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import ClockView from '../ClockView';
import { evaluatePosition } from '@/lib/clock/geofence';
import { planPunch } from '@/lib/clock/punch';
import { parseSiteForm } from '@/pages/settings/WorkSitesPage';
import { LOCATION_ERRORS, describeLocationError } from '@/lib/clock/locate';

const site = { id: 's1', name: 'โรงงานระยอง', latitude: 12.6814, longitude: 101.2816, radius_m: 150 };
const inside = { latitude: 12.6818, longitude: 101.2816, accuracy: 12 };
const outside = { latitude: 12.6840, longitude: 101.2816, accuracy: 12 };
const now = '2026-10-01T01:05:00.000Z';

const render = (overrides = {}) =>
  renderToStaticMarkup(
    <ClockView
      stage="ready"
      source="line"
      employee={{ code: 'EMP-0031', name: 'สมชาย ใจดี' }}
      position={inside}
      positionError={null}
      locating={false}
      geofence={evaluatePosition(inside, [site])}
      plan={planPunch([], now, '2026-10-01')}
      result={null}
      error={null}
      busy={false}
      days={[{ id: 'a', log_date: '2026-09-30', check_in: '2026-09-30T01:02:00Z', check_out: '2026-09-30T10:03:00Z' }]}
      linkForm={{ employeeCode: '', nationalId: '' }}
      now={now}
      onLocate={() => {}}
      onPunch={() => {}}
      onLinkField={() => {}}
      onLink={() => {}}
      {...overrides}
    />,
  );

describe('ClockView', () => {
  it('offers to clock in when inside the radius', () => {
    const html = render();
    expect(html).toContain('ลงเวลาเข้า');
    expect(html).toContain('อยู่ในรัศมี ลงเวลาได้');
    expect(html).toContain('โรงงานระยอง');
    expect(html).toContain('ห่าง 44 ม. จากรัศมี 150 ม.');
    expect(html).toContain('ผ่าน LINE');
    expect(html).toContain('EMP-0031 · สมชาย ใจดี');
    expect(html).not.toMatch(/<button type="button"[^>]*disabled=""[^>]*>[^<]*<svg[^>]*>.*?<\/svg>ลงเวลาเข้า/);
  });

  it('shows the clock in Bangkok time with the Thai year', () => {
    const html = render();
    expect(html).toContain('08:05');
    expect(html).toContain('2569');
  });

  it('disables the button and says by how much when outside', () => {
    const html = render({ position: outside, geofence: evaluatePosition(outside, [site]) });
    expect(html).toContain('อยู่นอกรัศมี');
    expect(html).toContain('เกินมา 139 ม.');
    expect(html).toMatch(/disabled=""[^>]*class="mt-5 flex h-16/);
  });

  it('offers to clock out when a day is open, and shows the history', () => {
    const open = { id: 'b', log_date: '2026-10-01', check_in: '2026-10-01T01:00:00Z', check_out: null };
    const html = render({ days: [open], plan: planPunch([open], now, '2026-10-01') });
    expect(html).toContain('ลงเวลาออก');
    expect(html).toContain('เข้า 08:00');
    expect(html).toContain('ออก --:--');
  });

  it('explains when the position is missing or refused', () => {
    expect(render({ position: null, geofence: evaluatePosition(null, [site]), positionError: LOCATION_ERRORS.denied })).toContain('ไม่ได้รับอนุญาตให้ใช้ตำแหน่ง');
    expect(render({ geofence: evaluatePosition(inside, []) })).toContain('บริษัทยังไม่ได้ตั้งจุดลงเวลา');
  });

  it('asks a LINE user who is not linked to link', () => {
    const html = render({ stage: 'link', employee: null, error: 'ข้อมูลไม่ตรง' });
    expect(html).toContain('ผูกบัญชี LINE กับพนักงาน');
    expect(html).toContain('id="clock-code"');
    expect(html).toMatch(/inputmode="numeric"/i);
    expect(html).toContain('ข้อมูลไม่ตรง');
    expect(html).not.toContain('ลงเวลาเข้า');
  });

  it('sends a browser user without a session to sign in', () => {
    const html = render({ stage: 'login', source: 'mobile', employee: null });
    expect(html).toContain('href="/login"');
    expect(html).not.toContain('ผ่าน LINE');
  });

  it('confirms a punch', () => {
    const html = render({ result: { kind: 'in', at: '2026-10-01T01:05:00Z', site: 'โรงงานระยอง' } });
    expect(html).toContain('ลงเวลาเข้าแล้ว 08:05 น. ที่ โรงงานระยอง');
  });
});

describe('parseSiteForm', () => {
  it('turns typed values into a row', () => {
    const { errors, row } = parseSiteForm({ id: null, name: ' โรงงานระยอง ', latitude: '12.6814', longitude: '101.2816', radius_m: '150', is_active: true });
    expect(errors).toEqual({});
    expect(row).toEqual({ id: undefined, name: 'โรงงานระยอง', latitude: 12.6814, longitude: 101.2816, radius_m: 150, is_active: true });
  });

  it('names every problem', () => {
    const { errors, row } = parseSiteForm({ name: '', latitude: '', longitude: 'abc', radius_m: '10', is_active: true });
    expect(row).toBeNull();
    expect(Object.keys(errors).sort()).toEqual(['latitude', 'longitude', 'name', 'radius_m']);
  });
});

describe('describeLocationError', () => {
  it('maps the browser codes', () => {
    expect(describeLocationError({ code: 1 })).toBe(LOCATION_ERRORS.denied);
    expect(describeLocationError({ code: 3 })).toBe(LOCATION_ERRORS.timeout);
    expect(describeLocationError({ code: 2 })).toBe(LOCATION_ERRORS.unavailable);
    expect(describeLocationError(undefined)).toBe(LOCATION_ERRORS.unavailable);
  });
});
