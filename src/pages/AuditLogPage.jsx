
import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { useTranslation } from 'react-i18next';
import { Helmet } from 'react-helmet';
import { Download, Search, Filter } from 'lucide-react';
import { exportToExcel } from '@/utils/helpers';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { usePermission } from '@/hooks/usePermission';
import { formatThaiDateTime } from '@/utils/helpers';
import PermissionGuard from '@/components/PermissionGuard';
import AccessDenied from '@/components/AccessDenied';
import { useToast } from '@/components/ui/use-toast';
import { addDays, isIsoDate, toBangkokTimestamp } from '@/lib/thaiTime';

const AuditLogPage = () => {
  const { t } = useTranslation();
  const { canView } = usePermission();
  const { toast } = useToast();
  const [logs, setLogs] = useState([]);
  const [userNames, setUserNames] = useState({});
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState({
    user: '',
    action: 'all',
    date: ''
  });

  useEffect(() => {
    if (canView('audit_log')) {
      fetchLogs();
    } else {
      setLoading(false);
    }
  }, [filter]);

  const fetchLogs = async () => {
    try {
      setLoading(true);
      // The column is created_at. Ordering by `timestamp`, which does not
      // exist, made every read fail and the page show an empty list.
      let query = supabase
        .from('audit_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(200);

      if (filter.action !== 'all') {
        query = query.eq('action', filter.action);
      }

      if (isIsoDate(filter.date)) {
        // One Thai calendar day, midnight to midnight.
        query = query
          .gte('created_at', toBangkokTimestamp(filter.date, '00:00'))
          .lt('created_at', toBangkokTimestamp(addDays(filter.date, 1), '00:00'));
      }

      const [{ data, error }, { data: users, error: usersError }] = await Promise.all([
        query,
        supabase.from('users').select('id, full_name, email'),
      ]);
      if (error) throw error;
      if (usersError) throw usersError;

      const names = {};
      (users || []).forEach((u) => { names[u.id] = u.full_name || u.email; });
      setUserNames(names);

      const needle = filter.user.trim().toLowerCase();
      const rows = (data || []).filter((log) =>
        !needle || (names[log.user_id] || '').toLowerCase().includes(needle)
      );
      setLogs(rows);
    } catch (error) {
      setLogs([]);
      toast({ variant: 'destructive', title: t('common.error'), description: error.message });
    } finally {
      setLoading(false);
    }
  };

  const handleExport = () => {
    exportToExcel(logs, 'Audit_Logs');
  };

  if (!canView('audit_log')) {
    return <AccessDenied />;
  }

  return (
    <>
      <Helmet>
        <title>{t('audit.title')} - GoAlong HR</title>
      </Helmet>
      
      <div className="space-y-6 max-w-6xl mx-auto">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">{t('audit.title')}</h1>
            <p className="text-slate-500 dark:text-slate-400">Track system activities and changes</p>
          </div>
          <PermissionGuard permission="audit_log" action="export">
            <Button onClick={handleExport} variant="outline" className="border-slate-300">
              <Download className="w-4 h-4 mr-2" />
              {t('common.export')}
            </Button>
          </PermissionGuard>
        </div>

        {/* Filters */}
        <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
           <CardContent className="p-4 grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="relative">
                 <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                 <Input 
                   placeholder="Search user..." 
                   className="pl-9"
                   value={filter.user}
                   onChange={(e) => setFilter({...filter, user: e.target.value})}
                 />
              </div>
              <div>
                 <Select value={filter.action} onValueChange={(v) => setFilter({...filter, action: v})}>
                    <SelectTrigger><SelectValue placeholder="Action" /></SelectTrigger>
                    <SelectContent>
                       <SelectItem value="all">All Actions</SelectItem>
                       <SelectItem value="INSERT">Create</SelectItem>
                       <SelectItem value="UPDATE">Update</SelectItem>
                       <SelectItem value="DELETE">Delete</SelectItem>
                    </SelectContent>
                 </Select>
              </div>
              <div>
                 <Input type="date" value={filter.date} onChange={(e) => setFilter({...filter, date: e.target.value})} />
              </div>
              <div>
                 <Button className="w-full bg-slate-800 text-white hover:bg-slate-700" onClick={fetchLogs}>
                    <Filter className="w-4 h-4 mr-2" />
                    Apply Filters
                 </Button>
              </div>
           </CardContent>
        </Card>

        {/* Logs Table */}
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
           <div className="overflow-x-auto">
              <table className="w-full min-w-[720px]">
                 <thead className="bg-slate-50 dark:bg-slate-800 border-b border-slate-100 dark:border-slate-700">
                    <tr>
                       <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase">{t('audit.time')}</th>
                       <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase">{t('audit.user')}</th>
                       <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase">{t('audit.action')}</th>
                       <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase">{t('audit.table')}</th>
                       <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase">{t('audit.details')}</th>
                    </tr>
                 </thead>
                 <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {loading ? (
                       <tr><td colSpan="5" className="p-8 text-center">Loading...</td></tr>
                    ) : logs.map((log) => (
                       <tr key={log.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                          <td className="px-6 py-4 text-sm text-slate-500 whitespace-nowrap">
                            {formatThaiDateTime(log.created_at)}
                          </td>
                          <td className="px-6 py-4 text-sm font-medium text-slate-900 dark:text-white">
                             {userNames[log.user_id] || log.user_id || 'System'}
                          </td>
                          <td className="px-6 py-4 text-sm">
                             <span className={`inline-flex px-2 py-1 rounded text-xs font-semibold ${
                                log.action === 'INSERT' ? 'bg-green-100 text-green-700' :
                                log.action === 'UPDATE' ? 'bg-blue-100 text-blue-700' :
                                log.action === 'DELETE' ? 'bg-red-100 text-red-700' : 'bg-slate-100 text-slate-700'
                             }`}>
                                {log.action}
                             </span>
                          </td>
                          <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-300 font-mono">
                             {log.table_name}
                          </td>
                          <td className="px-6 py-4 text-sm text-slate-500 truncate max-w-xs" title={JSON.stringify(log.new_value)}>
                             {JSON.stringify(log.new_value || log.old_value)}
                          </td>
                       </tr>
                    ))}
                    {!loading && logs.length === 0 && (
                       <tr><td colSpan="5" className="p-8 text-center text-slate-500">No logs found</td></tr>
                    )}
                 </tbody>
              </table>
           </div>
        </div>
      </div>
    </>
  );
};

export default AuditLogPage;
