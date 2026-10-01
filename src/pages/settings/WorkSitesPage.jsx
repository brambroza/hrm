import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Helmet } from 'react-helmet';
import { AlertCircle, LocateFixed, MapPin, Pencil, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { usePermission } from '@/hooks/usePermission';
import AccessDenied from '@/components/AccessDenied';
import { workSiteService } from '@/services/clock';
import { locate } from '@/lib/clock/locate';
import { MAX_RADIUS_M, MIN_RADIUS_M, isLatitude, isLongitude, isRadius } from '@/lib/clock/geofence';

const EMPTY = { id: null, name: '', latitude: '', longitude: '', radius_m: '150', is_active: true };
const fieldClass = 'h-10 w-full min-w-0 rounded-lg border border-slate-300 bg-white px-3 text-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-200';

/**
 * Check the form and turn it into a row.
 * @param {typeof EMPTY} form - Values as typed.
 * @returns {{ errors: Record<string, string>, row: object|null }} Problems, or the row to save.
 */
export const parseSiteForm = (form) => {
  const errors = {};
  const name = String(form.name || '').trim();
  const latitude = Number(form.latitude);
  const longitude = Number(form.longitude);
  const radius_m = Number(form.radius_m);
  if (!name || name.length > 120) errors.name = 'กรุณาตั้งชื่อจุด ไม่เกิน 120 ตัวอักษร';
  if (String(form.latitude).trim() === '' || !isLatitude(latitude)) errors.latitude = 'ละติจูดต้องอยู่ระหว่าง -90 ถึง 90';
  if (String(form.longitude).trim() === '' || !isLongitude(longitude)) errors.longitude = 'ลองจิจูดต้องอยู่ระหว่าง -180 ถึง 180';
  if (!isRadius(radius_m)) errors.radius_m = `รัศมีต้องเป็นจำนวนเต็ม ${MIN_RADIUS_M} ถึง ${MAX_RADIUS_M} เมตร`;
  if (Object.keys(errors).length) return { errors, row: null };
  return { errors, row: { id: form.id || undefined, name, latitude, longitude, radius_m, is_active: Boolean(form.is_active) } };
};

/**
 * Where employees may clock in from a phone, and how far from each place.
 */
const WorkSitesPage = () => {
  const { t } = useTranslation();
  const { toast } = useToast();
  const { canView, canAdd, canEdit, canDelete } = usePermission();
  const [sites, setSites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [form, setForm] = useState(null);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [locating, setLocating] = useState(false);

  const load = async () => {
    setLoading(true);
    setLoadError(null);
    try {
      setSites(await workSiteService.list());
    } catch (problem) {
      setLoadError(problem.message || String(problem));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (canView('time_attendance')) load();
  }, []);

  if (!canView('time_attendance')) return <AccessDenied />;

  const set = (key, value) => setForm((current) => ({ ...current, [key]: value }));

  const useHere = async () => {
    setLocating(true);
    try {
      const here = await locate();
      setForm((current) => ({ ...current, latitude: here.latitude.toFixed(6), longitude: here.longitude.toFixed(6) }));
    } catch (problem) {
      toast({ variant: 'destructive', title: t('common.error'), description: problem.message });
    } finally {
      setLocating(false);
    }
  };

  const save = async (event) => {
    event.preventDefault();
    const parsed = parseSiteForm(form);
    setErrors(parsed.errors);
    if (!parsed.row) return;
    setSaving(true);
    try {
      await workSiteService.save(parsed.row);
      toast({ title: t('common.success'), description: t('workSites.saved') });
      setForm(null);
      await load();
    } catch (problem) {
      toast({ variant: 'destructive', title: t('common.error'), description: problem.message });
    } finally {
      setSaving(false);
    }
  };

  const remove = async (site) => {
    if (!window.confirm(t('workSites.confirmDelete', { name: site.name }))) return;
    try {
      await workSiteService.remove(site.id);
      await load();
    } catch (problem) {
      toast({ variant: 'destructive', title: t('common.error'), description: problem.message });
    }
  };

  return (
    <div className="mx-auto max-w-5xl space-y-6 text-slate-900">
      <Helmet>
        <title>{t('workSites.title')} - GoAlong HR</title>
      </Helmet>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold">
            <MapPin className="h-6 w-6 text-emerald-600" aria-hidden="true" />
            {t('workSites.title')}
          </h1>
          <p className="mt-1 text-sm text-slate-600">{t('workSites.subtitle')}</p>
        </div>
        {canAdd('time_attendance') && !form && (
          <Button type="button" onClick={() => { setForm(EMPTY); setErrors({}); }} className="bg-emerald-600 text-white hover:bg-emerald-700">
            <Plus className="mr-2 h-4 w-4" aria-hidden="true" /> {t('workSites.add')}
          </Button>
        )}
      </div>

      <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
        <p className="font-medium">{t('workSites.howTitle')}</p>
        <ol className="mt-1 list-decimal space-y-0.5 pl-5">
          <li>{t('workSites.how1')}</li>
          <li>{t('workSites.how2')}</li>
          <li>{t('workSites.how3')}</li>
        </ol>
      </div>

      {form && (
        <form onSubmit={save} className="space-y-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="font-semibold">{form.id ? t('workSites.edit') : t('workSites.add')}</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="min-w-0 sm:col-span-2">
              <label className="text-sm font-medium" htmlFor="site-name">{t('workSites.name')}</label>
              <input id="site-name" className={fieldClass} maxLength={120} value={form.name} onChange={(e) => set('name', e.target.value)} />
              {errors.name && <p className="mt-1 text-xs text-red-700">{errors.name}</p>}
            </div>
            <div className="min-w-0">
              <label className="text-sm font-medium" htmlFor="site-lat">{t('workSites.latitude')}</label>
              <input id="site-lat" className={fieldClass} inputMode="decimal" value={form.latitude} onChange={(e) => set('latitude', e.target.value)} />
              {errors.latitude && <p className="mt-1 text-xs text-red-700">{errors.latitude}</p>}
            </div>
            <div className="min-w-0">
              <label className="text-sm font-medium" htmlFor="site-lng">{t('workSites.longitude')}</label>
              <input id="site-lng" className={fieldClass} inputMode="decimal" value={form.longitude} onChange={(e) => set('longitude', e.target.value)} />
              {errors.longitude && <p className="mt-1 text-xs text-red-700">{errors.longitude}</p>}
            </div>
            <div className="min-w-0">
              <label className="text-sm font-medium" htmlFor="site-radius">{t('workSites.radius')}</label>
              <input id="site-radius" className={fieldClass} inputMode="numeric" value={form.radius_m} onChange={(e) => set('radius_m', e.target.value)} />
              <p className="mt-1 text-xs text-slate-500">{t('workSites.radiusHint')}</p>
              {errors.radius_m && <p className="mt-1 text-xs text-red-700">{errors.radius_m}</p>}
            </div>
            <div className="flex items-end gap-3">
              <Button type="button" variant="outline" onClick={useHere} disabled={locating}>
                <LocateFixed className="mr-2 h-4 w-4" aria-hidden="true" /> {locating ? t('workSites.locating') : t('workSites.useHere')}
              </Button>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={form.is_active} onChange={(e) => set('is_active', e.target.checked)} /> {t('workSites.active')}
              </label>
            </div>
          </div>
          <p className="text-xs text-slate-500">{t('workSites.mapHint')}</p>
          <div className="flex flex-wrap gap-2">
            <Button type="submit" disabled={saving} className="bg-emerald-600 text-white hover:bg-emerald-700">{t('common.save')}</Button>
            <Button type="button" variant="outline" onClick={() => setForm(null)}>{t('common.cancel')}</Button>
          </div>
        </form>
      )}

      {loadError && (
        <div role="alert" className="flex flex-wrap items-center gap-3 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          <AlertCircle className="h-4 w-4" aria-hidden="true" /> {loadError}
          <Button type="button" variant="outline" size="sm" onClick={load}>{t('documents.retry')}</Button>
        </div>
      )}

      {!loading && !loadError && sites.length === 0 && !form && (
        <p className="rounded-xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-600">{t('workSites.empty')}</p>
      )}

      {sites.length > 0 && (
        <ul className="divide-y divide-slate-100 rounded-xl border border-slate-200 bg-white shadow-sm">
          {sites.map((site) => (
            <li key={site.id} className="flex flex-wrap items-center gap-3 px-5 py-4">
              <div className="min-w-0 flex-1">
                <p className="font-medium">
                  {site.name}
                  {!site.is_active && <span className="ml-2 rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600">{t('workSites.inactive')}</span>}
                </p>
                <p className="text-sm tabular-nums text-slate-600">
                  {Number(site.latitude).toFixed(6)}, {Number(site.longitude).toFixed(6)} · {t('workSites.radiusValue', { metres: site.radius_m })}
                </p>
              </div>
              <a
                className="text-sm text-emerald-700 underline"
                href={`https://www.google.com/maps?q=${site.latitude},${site.longitude}`}
                target="_blank"
                rel="noreferrer"
              >
                {t('workSites.viewMap')}
              </a>
              {canEdit('time_attendance') && (
                <Button type="button" variant="outline" size="sm" onClick={() => { setForm({ ...site, latitude: String(site.latitude), longitude: String(site.longitude), radius_m: String(site.radius_m) }); setErrors({}); }}>
                  <Pencil className="h-4 w-4" aria-hidden="true" />
                </Button>
              )}
              {canDelete('time_attendance') && (
                <Button type="button" variant="outline" size="sm" onClick={() => remove(site)} aria-label={t('common.delete')}>
                  <Trash2 className="h-4 w-4 text-red-600" aria-hidden="true" />
                </Button>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default WorkSitesPage;
