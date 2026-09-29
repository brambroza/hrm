import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Helmet } from 'react-helmet';
import { supabase } from '@/lib/customSupabaseClient';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { usePermission } from '@/hooks/usePermission';
import { useAuth } from '@/contexts/AuthContext';
import { ensureSession, logAuditTrail } from '@/utils/helpers';
import AccessDenied from '@/components/AccessDenied';
import SetupHint from '@/components/SetupHint';

const defaultPolicy = {
  name: 'Default Policy',
  late_grace_minutes: 5,
  late_threshold_minutes: 5,
  absent_by_late_minutes: 30,
  ot_method: 'scan',
  ot_rounding: 'none',
  missing_scan_action: 'notify_hr'
};

const AttendancePolicyPage = () => {
  const { t } = useTranslation();
  const { toast } = useToast();
  const { canView, canEdit, role } = usePermission();
  const { user } = useAuth();
  const [policy, setPolicy] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (canView('attendance_policy')) {
      fetchPolicy();
    } else {
      setLoading(false);
    }
  }, [role]);

  const fetchPolicy = async () => {
    setLoading(true);
    try {
      await ensureSession(supabase);
      const { data, error } = await supabase
        .from('attendance_policies')
        .select('*')
        .order('created_at', { ascending: true })
        .limit(1)
        .maybeSingle();

      if (error) {
        throw error;
      }

      if (!data) {
        const { data: created, error: createError } = await supabase
          .from('attendance_policies')
          .insert([defaultPolicy])
          .select()
          .single();

        if (createError) {
          throw createError;
        }
        setPolicy(created);
      } else {
        setPolicy(data);
      }
    } catch (error) {
      toast({
        variant: 'destructive',
        title: t('common.error'),
        description: error?.message || 'Failed to load attendance policy'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field, value) => {
    setPolicy((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    if (!policy) return;
    setSaving(true);
    const oldPolicy = { ...policy };
    try {
      await ensureSession(supabase);
      const payload = {
        name: policy.name,
        late_grace_minutes: Number(policy.late_grace_minutes || 0),
        late_threshold_minutes: Number(policy.late_threshold_minutes || 0),
        absent_by_late_minutes: Number(policy.absent_by_late_minutes || 0),
        ot_method: policy.ot_method,
        ot_rounding: policy.ot_rounding,
        missing_scan_action: policy.missing_scan_action
      };

      const { data, error } = await supabase
        .from('attendance_policies')
        .update(payload)
        .eq('id', policy.id)
        .select()
        .single();

      if (error) {
        throw error;
      }

      await logAuditTrail(
        user?.id || null,
        'UPDATE',
        'attendance_policies',
        policy.id,
        oldPolicy,
        data
      );

      setPolicy(data);
      toast({
        title: t('common.success'),
        description: t('attendancePolicy.saved')
      });
    } catch (error) {
      toast({
        variant: 'destructive',
        title: t('common.error'),
        description: error?.message || 'Failed to save policy'
      });
    } finally {
      setSaving(false);
    }
  };

  if (!canView('attendance_policy')) {
    return <AccessDenied />;
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (!policy) {
    return (
      <div className="text-center py-12 text-slate-500">
        No policy found
      </div>
    );
  }

  return (
    <>
      <Helmet>
        <title>{t('attendancePolicy.title')} - HRM System</title>
        <meta name="description" content="Attendance policy configuration" />
      </Helmet>
      <div className="space-y-6">
        <SetupHint />
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">{t('attendancePolicy.title')}</h1>
          <p className="text-slate-500 dark:text-slate-400">{t('attendancePolicy.subtitle')}</p>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6 space-y-6">
          <div>
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">{t('attendancePolicy.latePolicy')}</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-2">{t('attendancePolicy.lateGrace')}</label>
                <input
                  type="number"
                  value={policy.late_grace_minutes}
                  onChange={(e) => handleChange('late_grace_minutes', e.target.value)}
                  className="w-full px-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-2">{t('attendancePolicy.lateThreshold')}</label>
                <input
                  type="number"
                  value={policy.late_threshold_minutes}
                  onChange={(e) => handleChange('late_threshold_minutes', e.target.value)}
                  className="w-full px-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-2">{t('attendancePolicy.absentByLate')}</label>
                <input
                  type="number"
                  value={policy.absent_by_late_minutes}
                  onChange={(e) => handleChange('absent_by_late_minutes', e.target.value)}
                  className="w-full px-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
                />
              </div>
            </div>
          </div>

          <div>
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">{t('attendancePolicy.otPolicy')}</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-2">{t('attendancePolicy.otMethod')}</label>
                <select
                  value={policy.ot_method}
                  onChange={(e) => handleChange('ot_method', e.target.value)}
                  className="w-full px-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
                >
                  <option value="scan">{t('attendancePolicy.otMethodScan')}</option>
                  <option value="request">{t('attendancePolicy.otMethodRequest')}</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-2">{t('attendancePolicy.otRounding')}</label>
                <select
                  value={policy.ot_rounding}
                  onChange={(e) => handleChange('ot_rounding', e.target.value)}
                  className="w-full px-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
                >
                  <option value="none">{t('attendancePolicy.roundNone')}</option>
                  <option value="up">{t('attendancePolicy.roundUp')}</option>
                  <option value="down">{t('attendancePolicy.roundDown')}</option>
                </select>
              </div>
            </div>
          </div>

          <div>
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">{t('attendancePolicy.missingScanPolicy')}</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-2">{t('attendancePolicy.missingScanAction')}</label>
                <select
                  value={policy.missing_scan_action}
                  onChange={(e) => handleChange('missing_scan_action', e.target.value)}
                  className="w-full px-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
                >
                  <option value="notify_hr">{t('attendancePolicy.notifyHr')}</option>
                  <option value="require_reason">{t('attendancePolicy.requireReason')}</option>
                </select>
              </div>
            </div>
          </div>

          <div className="flex justify-end">
            <Button onClick={handleSave} disabled={!canEdit('attendance_policy') || saving}>
              {saving ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </div>
      </div>
    </>
  );
};

export default AttendancePolicyPage;
