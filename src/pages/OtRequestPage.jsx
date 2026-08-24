import React, { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Helmet } from 'react-helmet';
import { supabase } from '@/lib/customSupabaseClient';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/components/ui/use-toast';
import { usePermission } from '@/hooks/usePermission';
import { useAuth } from '@/contexts/AuthContext';
import ConfirmationModal from '@/components/ConfirmationModal';
import { formatThaiDate } from '@/utils/helpers';
import AccessDenied from '@/components/AccessDenied';

const OtRequestPage = () => {
  const { t } = useTranslation();
  const { toast } = useToast();
  const { canView, canAdd, canEdit } = usePermission();
  const { user, role } = useAuth();
  const [loading, setLoading] = useState(true);
  const [requests, setRequests] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [employeeProfile, setEmployeeProfile] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [approveId, setApproveId] = useState(null);
  const [rejectId, setRejectId] = useState(null);

  const [formData, setFormData] = useState({
    employee_id: '',
    request_date: '',
    start_time: '',
    end_time: '',
    reason: ''
  });

  const canManageAll = role === 'admin' || role === 'hr';
  const canManageTeam = role === 'supervisor';

  useEffect(() => {
    if (!canView('ot_request')) {
      setLoading(false);
      return;
    }
    loadData();
  }, [role, user?.id]);

  const loadData = async () => {
    setLoading(true);
    try {
      const { data: profile } = await supabase
        .from('employees')
        .select('id, department, employee_id, name')
        .eq('user_id', user?.id)
        .maybeSingle();

      setEmployeeProfile(profile || null);

      if (canManageAll) {
        const [employeeRes, requestRes] = await Promise.all([
          supabase.from('employees').select('id, employee_id, name, department').eq('status', 'active'),
          supabase.from('ot_requests').select('*, employees(employee_id, name, department)').order('created_at', { ascending: false })
        ]);
        if (employeeRes.error) throw employeeRes.error;
        if (requestRes.error) throw requestRes.error;
        setEmployees(employeeRes.data || []);
        setRequests(requestRes.data || []);
        return;
      }

      if (canManageTeam && profile?.department) {
        const { data: teamEmployees, error: teamError } = await supabase
          .from('employees')
          .select('id, employee_id, name, department')
          .eq('status', 'active')
          .eq('department', profile.department);
        if (teamError) throw teamError;

        const teamIds = (teamEmployees || []).map((emp) => emp.id);
        const { data: teamRequests, error: requestError } = await supabase
          .from('ot_requests')
          .select('*, employees(employee_id, name, department)')
          .in('employee_id', teamIds.length ? teamIds : ['00000000-0000-0000-0000-000000000000'])
          .order('created_at', { ascending: false });
        if (requestError) throw requestError;
        setEmployees(teamEmployees || []);
        setRequests(teamRequests || []);
        return;
      }

      if (profile?.id) {
        const [employeeRes, requestRes] = await Promise.all([
          supabase.from('employees').select('id, employee_id, name, department').eq('id', profile.id).maybeSingle(),
          supabase.from('ot_requests').select('*').eq('employee_id', profile.id).order('created_at', { ascending: false })
        ]);
        if (employeeRes.error) throw employeeRes.error;
        if (requestRes.error) throw requestRes.error;
        setEmployees(employeeRes.data ? [employeeRes.data] : []);
        setRequests(requestRes.data || []);
      } else {
        setEmployees([]);
        setRequests([]);
      }
    } catch (error) {
      toast({
        variant: 'destructive',
        title: t('common.error'),
        description: error.message || 'Failed to load OT requests'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const targetEmployeeId = canManageAll || canManageTeam ? formData.employee_id : employeeProfile?.id;
      if (!targetEmployeeId) {
        toast({
          variant: 'destructive',
          title: t('common.error'),
          description: 'Employee is required'
        });
        return;
      }

      const minutes = calculateMinutes(formData.start_time, formData.end_time);
      const payload = {
        employee_id: targetEmployeeId,
        request_date: formData.request_date,
        start_time: formData.start_time,
        end_time: formData.end_time,
        minutes,
        reason: formData.reason || null,
        status: 'pending'
      };

      const { error } = await supabase.from('ot_requests').insert([payload]);
      if (error) throw error;

      toast({ title: t('common.success'), description: 'OT request created' });
      setShowModal(false);
      setFormData({ employee_id: '', request_date: '', start_time: '', end_time: '', reason: '' });
      loadData();
    } catch (error) {
      toast({
        variant: 'destructive',
        title: t('common.error'),
        description: error.message || 'Failed to create OT request'
      });
    }
  };

  const handleApprove = async () => {
    if (!approveId) return;
    try {
      const { error } = await supabase
        .from('ot_requests')
        .update({
          status: 'approved',
          approved_by: user?.id || null,
          approved_at: new Date().toISOString()
        })
        .eq('id', approveId);
      if (error) throw error;
      setApproveId(null);
      loadData();
    } catch (error) {
      toast({
        variant: 'destructive',
        title: t('common.error'),
        description: error.message || 'Failed to approve'
      });
    }
  };

  const handleReject = async () => {
    if (!rejectId) return;
    try {
      const { error } = await supabase
        .from('ot_requests')
        .update({
          status: 'rejected',
          approved_by: user?.id || null,
          approved_at: new Date().toISOString()
        })
        .eq('id', rejectId);
      if (error) throw error;
      setRejectId(null);
      loadData();
    } catch (error) {
      toast({
        variant: 'destructive',
        title: t('common.error'),
        description: error.message || 'Failed to reject'
      });
    }
  };

  if (!canView('ot_request')) {
    return <AccessDenied />;
  }

  return (
    <>
      <Helmet>
        <title>{t('ot.title')} - HRM System</title>
      </Helmet>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">{t('ot.title')}</h1>
            <p className="text-slate-500 dark:text-slate-400">{requests.length} requests</p>
          </div>
          {canAdd('ot_request') && (
            <Button onClick={() => setShowModal(true)} className="bg-blue-600 hover:bg-blue-700">
              Add OT Request
            </Button>
          )}
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px]">
              <thead className="bg-slate-50 dark:bg-slate-800">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase">{t('ot.requestDate')}</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase">{t('common.employee')}</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase">{t('ot.startTime')} - {t('ot.endTime')}</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase">{t('ot.minutes')}</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase">{t('common.status')}</th>
                  <th className="px-6 py-3 text-right text-xs font-semibold text-slate-500 uppercase">{t('common.actions')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-6 text-center text-slate-500">Loading...</td>
                  </tr>
                ) : requests.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-6 text-center text-slate-500">{t('ot.noRecords')}</td>
                  </tr>
                ) : (
                  requests.map((req) => (
                    <tr key={req.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                      <td className="px-6 py-4 text-sm text-slate-700 dark:text-slate-300">{formatThaiDate(req.request_date)}</td>
                      <td className="px-6 py-4 text-sm text-slate-900 dark:text-white">
                        {req.employees?.employee_id} - {req.employees?.name}
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-300">{req.start_time} - {req.end_time}</td>
                      <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-300">{req.minutes}</td>
                      <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-300">{t(`leave.status.${req.status || 'pending'}`, req.status)}</td>
                      <td className="px-6 py-4 text-sm text-right">
                        {canEdit('ot_request') && req.status === 'pending' && (
                          <div className="flex justify-end gap-2">
                            <Button size="sm" variant="outline" onClick={() => setApproveId(req.id)}>{t('common.approve')}</Button>
                            <Button size="sm" variant="outline" onClick={() => setRejectId(req.id)}>{t('common.reject')}</Button>
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
            <DialogTitle>{t('ot.newRequest')}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            {(canManageAll || canManageTeam) && (
              <div>
                <label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-2">Employee *</label>
                <select
                  name="employee_id"
                  value={formData.employee_id}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
                >
                  <option value="">{t('common.selectEmployee')}</option>
                  {employees.map((emp) => (
                    <option key={emp.id} value={emp.id}>{emp.employee_id} - {emp.name}</option>
                  ))}
                </select>
              </div>
            )}
            <div>
              <label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-2">Date *</label>
              <input
                type="date"
                name="request_date"
                value={formData.request_date}
                onChange={handleChange}
                required
                className="w-full px-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-2">Start Time *</label>
                <input
                  type="time"
                  name="start_time"
                  value={formData.start_time}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-2">End Time *</label>
                <input
                  type="time"
                  name="end_time"
                  value={formData.end_time}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
                />
              </div>
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
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setShowModal(false)} className="border-slate-200 dark:border-slate-700">
                Cancel
              </Button>
              <Button type="submit" className="bg-blue-600 hover:bg-blue-700">
                Save
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <ConfirmationModal
        isOpen={!!approveId}
        onClose={() => setApproveId(null)}
        onConfirm={handleApprove}
        title="Approve OT"
        description="Confirm approve this OT request?"
        confirmText="Approve"
      />
      <ConfirmationModal
        isOpen={!!rejectId}
        onClose={() => setRejectId(null)}
        onConfirm={handleReject}
        title="Reject OT"
        description="Confirm reject this OT request?"
        confirmText="Reject"
        variant="destructive"
      />
    </>
  );
};

const calculateMinutes = (start, end) => {
  if (!start || !end) return 0;
  const startTime = new Date(`2000-01-01T${start}:00+07:00`);
  const endTime = new Date(`2000-01-01T${end}:00+07:00`);
  const diff = Math.round((endTime - startTime) / 60000);
  return Math.max(diff, 0);
};

export default OtRequestPage;
