import React, { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Helmet } from 'react-helmet';
import { supabase } from '@/lib/customSupabaseClient';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/components/ui/use-toast';
import { usePermission } from '@/hooks/usePermission';
import { useAuth } from '@/contexts/AuthContext';
import { ensureSession, formatThaiDate, logAuditTrail } from '@/utils/helpers';
import AccessDenied from '@/components/AccessDenied';
import { canDecideRequest, validateLeaveRequest, validateRejection } from '@/lib/requests';

const LeaveManagementPage = () => {
  const { t } = useTranslation();
  const { toast } = useToast();
  const { canAdd, canEdit, canUseSelfService } = usePermission();
  const { user, role } = useAuth();

  const [loading, setLoading] = useState(true);
  const [leaves, setLeaves] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [employeeProfile, setEmployeeProfile] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [decision, setDecision] = useState(null); // { leave, action: 'approved' | 'rejected' }
  const [decisionNote, setDecisionNote] = useState('');
  const [deciding, setDeciding] = useState(false);

  const [formData, setFormData] = useState({
    employee_id: '',
    leave_type: 'annual',
    start_date: '',
    end_date: '',
    is_half_day: false,
    reason: '',
    attachment_url: ''
  });

  const canManageAll = role === 'admin' || role === 'hr';
  const canManageTeam = role === 'supervisor' || role === 'manager';
  const canOpen = canUseSelfService('leave');
  // Filing for yourself needs no permission; filing for someone else does.
  const canFile = canAdd('leave') || Boolean(employeeProfile?.id);
  const canPickEmployee = canAdd('leave') && (canManageAll || canManageTeam);

  useEffect(() => {
    if (!canOpen) {
      setLoading(false);
      return;
    }
    loadData();
  }, [role, user?.id, canOpen]);

  const loadData = async () => {
    setLoading(true);
    try {
      await ensureSession(supabase);
      const { data: profile, error: profileError } = await supabase
        .from('employees')
        .select('id, department, employee_id, name')
        .eq('user_id', user?.id)
        .maybeSingle();

      if (profileError) throw profileError;
      setEmployeeProfile(profile || null);

      const { employeesData, leavesData } = await fetchLeaveDataByRole(profile);

      setEmployees(employeesData);
      setLeaves(leavesData);
    } catch (error) {
      toast({
        variant: 'destructive',
        title: t('common.error'),
        description: error.message || 'Failed to load leaves'
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchLeaveDataByRole = async (profile) => {
    if (canManageAll) {
      const [employeesRes, leavesRes] = await Promise.all([
        supabase
          .from('employees')
          .select('id, employee_id, name, department, status')
          .eq('status', 'active'),
        supabase
          .from('leaves')
          .select('id, employee_id, leave_type, start_date, end_date, status, created_at, employees(name, employee_id, department)')
          .order('created_at', { ascending: false })
      ]);
      if (employeesRes.error) throw employeesRes.error;
      if (leavesRes.error) throw leavesRes.error;
      return {
        employeesData: employeesRes.data || [],
        leavesData: leavesRes.data || []
      };
    }

    if (canManageTeam && profile?.department) {
      const { data: teamEmployees, error: teamError } = await supabase
        .from('employees')
        .select('id, employee_id, name, department, status')
        .eq('status', 'active')
        .eq('department', profile.department);
      if (teamError) throw teamError;

      const teamIds = (teamEmployees || []).map((emp) => emp.id);
      const { data: teamLeaves, error: leaveError } = await supabase
        .from('leaves')
        .select('id, employee_id, leave_type, start_date, end_date, status, created_at, employees(name, employee_id, department)')
        .in('employee_id', teamIds.length ? teamIds : ['00000000-0000-0000-0000-000000000000'])
        .order('created_at', { ascending: false });
      if (leaveError) throw leaveError;

      return {
        employeesData: teamEmployees || [],
        leavesData: teamLeaves || []
      };
    }

    if (!profile?.id) {
      return { employeesData: [], leavesData: [] };
    }

    const [employeeRes, leaveRes] = await Promise.all([
      supabase
        .from('employees')
        .select('id, employee_id, name, department, status')
        .eq('id', profile.id)
        .maybeSingle(),
      supabase
        .from('leaves')
        .select('id, employee_id, leave_type, start_date, end_date, status, created_at')
        .eq('employee_id', profile.id)
        .order('created_at', { ascending: false })
    ]);

    if (employeeRes.error) throw employeeRes.error;
    if (leaveRes.error) throw leaveRes.error;

    return {
      employeesData: employeeRes.data ? [employeeRes.data] : [],
      leavesData: leaveRes.data || []
    };
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const targetEmployeeId = canPickEmployee
      ? formData.employee_id
      : employeeProfile?.id;

    if (!targetEmployeeId) {
      toast({
        variant: 'destructive',
        title: t('common.error'),
        description: t('common.required')
      });
      return;
    }

    try {
      // Checked against the database, not the list on screen, which a
      // supervisor's view may have narrowed to their team.
      const { data: existing, error: existingError } = await supabase
        .from('leaves')
        .select('start_date, end_date, status')
        .eq('employee_id', targetEmployeeId)
        .lte('start_date', formData.end_date || formData.start_date)
        .gte('end_date', formData.start_date);
      if (existingError) throw existingError;

      const problem = validateLeaveRequest(formData, existing || []);
      if (problem) {
        toast({ variant: 'destructive', title: t('common.error'), description: t(problem) });
        return;
      }

      const payload = {
        employee_id: targetEmployeeId,
        leave_type: formData.leave_type,
        start_date: formData.start_date,
        end_date: formData.end_date,
        is_half_day: formData.is_half_day,
        reason: formData.reason || null,
        attachment_url: formData.attachment_url || null,
        status: 'pending'
      };

      const { data, error } = await supabase
        .from('leaves')
        .insert([payload])
        .select()
        .single();

      if (error) throw error;

      await logAuditTrail(
        user?.id || null,
        'INSERT',
        'leaves',
        data.id,
        null,
        data
      );

      toast({
        title: t('common.success'),
      });

      setShowModal(false);
      setFormData({
        employee_id: '',
        leave_type: 'annual',
        start_date: '',
        end_date: '',
        is_half_day: false,
        reason: '',
        attachment_url: ''
      });
      loadData();
    } catch (error) {
      toast({
        variant: 'destructive',
        title: t('common.error'),
        description: error.message || 'Failed to create leave'
      });
    }
  };

  /**
   * Record an approval or a rejection.
   * The row is matched on status 'pending' as well as id, so a request that
   * someone else decided a moment ago is not overwritten.
   */
  const handleDecision = async () => {
    if (!decision) return;
    const { leave, action } = decision;

    if (action === 'rejected') {
      const problem = validateRejection(decisionNote);
      if (problem) {
        toast({ variant: 'destructive', title: t('common.error'), description: t(problem) });
        return;
      }
    }

    setDeciding(true);
    try {
      const changes = {
        status: action,
        approved_by: user?.id || null,
        approved_at: new Date().toISOString(),
      };
      // decision_note is added by migration 0006.
      if (action === 'rejected') changes.decision_note = decisionNote.trim();

      const { data, error } = await supabase
        .from('leaves')
        .update(changes)
        .eq('id', leave.id)
        .eq('status', 'pending')
        .select();

      if (error) throw error;
      if (!data || data.length === 0) throw new Error(t('requests.alreadyDecided'));

      await logAuditTrail(user?.id || null, 'UPDATE', 'leaves', leave.id, leave, data[0]);

      toast({ title: t('common.success'), description: t(`leave.status.${action}`) });
      setDecision(null);
      setDecisionNote('');
      loadData();
    } catch (error) {
      toast({ variant: 'destructive', title: t('common.error'), description: error.message });
    } finally {
      setDeciding(false);
    }
  };

  const emptyState = useMemo(() => {
    if (!employeeProfile && !canManageAll) {
      return t('leave.noEmployeeProfile');
    }
    return t('leave.noRecords');
  }, [employeeProfile, canManageAll, t]);

  const employeeLookup = useMemo(() => {
    const map = new Map();
    employees.forEach((emp) => {
      map.set(emp.id, emp);
    });
    if (employeeProfile) {
      map.set(employeeProfile.id, employeeProfile);
    }
    return map;
  }, [employees, employeeProfile]);

  if (!canOpen) {
    return <AccessDenied />;
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <>
      <Helmet>
        <title>{t('leave.title')} - HRM System</title>
      </Helmet>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">{t('leave.title')}</h1>
            <p className="text-slate-500 dark:text-slate-400">{t('leave.subtitle')}</p>
          </div>
          {canFile && (
            <Button onClick={() => setShowModal(true)} className="bg-blue-600 hover:bg-blue-700">
              {t('leave.newRequest')}
            </Button>
          )}
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px]">
              <thead className="bg-slate-50 dark:bg-slate-800">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase">{t('common.employee')}</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase">{t('leave.leaveType')}</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase">{t('leave.startDate')}</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase">{t('leave.endDate')}</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase">{t('common.status')}</th>
                  <th className="px-6 py-4 text-right text-xs font-semibold text-slate-500 uppercase">{t('common.actions')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {leaves.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-10 text-center text-slate-500">
                      {emptyState}
                    </td>
                  </tr>
                ) : (
                  leaves.map((leave) => (
                    <tr key={leave.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                      <td className="px-6 py-4 text-sm text-slate-900 dark:text-white">
                        {leave.employees?.employee_id || employeeLookup.get(leave.employee_id)?.employee_id || '-'} - {leave.employees?.name || employeeLookup.get(leave.employee_id)?.name || '-'}
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-300">{t(`leave.type.${leave.leave_type}`, leave.leave_type)}</td>
                      <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-300">{formatThaiDate(leave.start_date)}</td>
                      <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-300">{formatThaiDate(leave.end_date)}</td>
                      <td className="px-6 py-4 text-sm">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          leave.status === 'approved'
                            ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                            : leave.status === 'rejected'
                            ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                            : 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
                        }`}>
                          {t(`leave.status.${leave.status || 'pending'}`, leave.status)}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-right">
                        {canDecideRequest({
                          canEdit: canEdit('leave'),
                          status: leave.status,
                          requestEmployeeId: leave.employee_id,
                          deciderEmployeeId: employeeProfile?.id,
                        }) && (
                          <div className="flex justify-end gap-2">
                            <Button size="sm" variant="outline" onClick={() => { setDecisionNote(''); setDecision({ leave, action: 'approved' }); }}>
                              {t('common.approve')}
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => { setDecisionNote(''); setDecision({ leave, action: 'rejected' }); }}>
                              {t('common.reject')}
                            </Button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white">
          <DialogHeader>
            <DialogTitle>{t('leave.newRequest')}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            {canPickEmployee && (
              <div>
                <label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-2">{t('common.employee')} *</label>
                <select
                  name="employee_id"
                  value={formData.employee_id}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
                >
                  <option value="">{t('common.selectEmployee')}</option>
                  {employees.map((emp) => (
                    <option key={emp.id} value={emp.id}>
                      {emp.employee_id} - {emp.name_th || emp.name}
                    </option>
                  ))}
                </select>
              </div>
            )}
            <div>
              <label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-2">Leave Type *</label>
              <select
                name="leave_type"
                value={formData.leave_type}
                onChange={handleChange}
                required
                className="w-full px-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
              >
                <option value="annual">{t('leave.type.annual')}</option>
                <option value="sick">{t('leave.type.sick')}</option>
                <option value="personal">{t('leave.type.personal')}</option>
                <option value="maternity">{t('leave.type.maternity')}</option>
                <option value="unpaid">{t('leave.type.unpaid')}</option>
              </select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-2">Start Date *</label>
                <input
                  type="date"
                  name="start_date"
                  value={formData.start_date}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-2">End Date *</label>
                <input
                  type="date"
                  name="end_date"
                  value={formData.end_date}
                  onChange={handleChange}
                  required
                  min={formData.start_date || undefined}
                  className="w-full px-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
                />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="is_half_day"
                name="is_half_day"
                checked={formData.is_half_day}
                onChange={handleChange}
                className="w-4 h-4 border-slate-300 dark:border-slate-700"
              />
              <label htmlFor="is_half_day" className="text-sm text-slate-600 dark:text-slate-300">{t('leave.halfDay')}</label>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-2">{t('common.reason')}</label>
              <textarea
                name="reason"
                value={formData.reason}
                onChange={handleChange}
                className="w-full px-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
                rows={3}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-2">{t('leave.attachment')}</label>
              <input
                type="text"
                name="attachment_url"
                value={formData.attachment_url}
                onChange={handleChange}
                className="w-full px-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
              />
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <Button type="button" variant="outline" onClick={() => setShowModal(false)} className="border-slate-200 dark:border-slate-700">
                Cancel
              </Button>
              <Button type="submit" className="bg-blue-600 hover:bg-blue-700">
                Submit
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={decision !== null} onOpenChange={(open) => { if (!open && !deciding) setDecision(null); }}>
        <DialogContent className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white">
          <DialogHeader>
            <DialogTitle>
              {decision?.action === 'rejected' ? t('requests.confirmReject') : t('requests.confirmApprove')}
            </DialogTitle>
          </DialogHeader>
          {decision && (
            <div className="space-y-4">
              <p className="text-sm text-slate-600 dark:text-slate-300">
                {decision.leave.employees?.name || employeeLookup.get(decision.leave.employee_id)?.name || '-'}
                {' · '}
                {t(`leave.type.${decision.leave.leave_type}`, decision.leave.leave_type)}
                {' · '}
                {formatThaiDate(decision.leave.start_date)} – {formatThaiDate(decision.leave.end_date)}
              </p>
              {decision.action === 'rejected' && (
                <div>
                  <label htmlFor="decision_note" className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-2">
                    {t('requests.rejectReason')} *
                  </label>
                  <textarea
                    id="decision_note"
                    value={decisionNote}
                    onChange={(e) => setDecisionNote(e.target.value)}
                    maxLength={500}
                    rows={3}
                    className="w-full px-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
                  />
                </div>
              )}
              <div className="flex justify-end gap-3">
                <Button type="button" variant="outline" disabled={deciding} onClick={() => setDecision(null)}>
                  {t('common.cancel')}
                </Button>
                <Button type="button" disabled={deciding} onClick={handleDecision} className="bg-blue-600 hover:bg-blue-700">
                  {decision.action === 'rejected' ? t('common.reject') : t('common.approve')}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};

export default LeaveManagementPage;
