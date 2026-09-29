
import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Helmet } from 'react-helmet';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Loader2, Database, Download, RotateCcw, Trash2, HardDrive, FileJson } from 'lucide-react';
import { usePermission } from '@/hooks/usePermission';
import PermissionGuard from '@/components/PermissionGuard';
import { backupService } from '@/services/backups';
import { formatThaiDateTime } from '@/utils/helpers';
import { useApi } from '@/hooks/useApi';
import ConfirmationModal from '@/components/ConfirmationModal';
import AccessDenied from '@/components/AccessDenied';

const BackupRecoveryPage = () => {
  const { t } = useTranslation();
  const { canView } = usePermission();
  const { loading: apiLoading, request } = useApi();
  
  const [backups, setBackups] = useState([]);
  const [deleteId, setDeleteId] = useState(null);
  const [settings, setSettings] = useState({
    auto_backup: true,
    frequency: 'daily',
    retention: '30'
  });

  useEffect(() => {
    if (canView('backup_recovery')) {
      loadBackups();
    }
  }, []);

  const loadBackups = async () => {
    const { data } = await request(backupService.getBackups);
    if (data) setBackups(data);
  };

  const handleCreateBackup = async () => {
    // Simulate backup creation
    const filename = `backup_${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
    const size = Math.floor(Math.random() * 5000000) + 1000000;
    
    await request(
      () => backupService.createBackup({
        filename,
        size_bytes: size,
        status: 'completed'
      }),
      null,
      'Backup created successfully'
    );
    loadBackups();
  };

  const handleDelete = async () => {
    if (deleteId) {
      await request(
        () => backupService.deleteBackup(deleteId),
        null,
        'Backup deleted'
      );
      setDeleteId(null);
      loadBackups();
    }
  };

  const handleRestore = () => {
    // Placeholder for restore functionality
    alert("Restore functionality would go here. It requires careful implementation to avoid data loss.");
  };

  const formatSize = (bytes) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  if (!canView('backup_recovery')) return <AccessDenied />;

  return (
    <>
      <Helmet>
        <title>{t('settings.backupRecovery')} - GoAlong HR</title>
      </Helmet>
      
      <div className="space-y-6 max-w-5xl mx-auto">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">{t('settings.backupRecovery')}</h1>
            <p className="text-slate-500 dark:text-slate-400">Secure your data with backups</p>
          </div>
          <PermissionGuard permission="backup_recovery" action="add">
            <Button onClick={handleCreateBackup} disabled={apiLoading} className="bg-blue-600 hover:bg-blue-700 shadow-md">
              {apiLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Database className="w-4 h-4 mr-2" />}
              {t('settings.createBackup')}
            </Button>
          </PermissionGuard>
        </div>

        {/* Auto Backup Settings */}
        <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <HardDrive className="w-5 h-5 text-indigo-500" />
              Automatic Backup Settings
            </CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-6">
             <div className="flex items-center justify-between p-4 border rounded-lg bg-slate-50 dark:bg-slate-800/50">
                <Label className="font-medium">{t('settings.enableAutoBackup')}</Label>
                <Switch 
                   checked={settings.auto_backup} 
                   onCheckedChange={(c) => setSettings({...settings, auto_backup: c})}
                />
             </div>
             <div className="space-y-2">
                <Label>{t('settings.backupFrequency')}</Label>
                <Select value={settings.frequency} onValueChange={(v) => setSettings({...settings, frequency: v})}>
                   <SelectTrigger><SelectValue /></SelectTrigger>
                   <SelectContent>
                      <SelectItem value="daily">Daily</SelectItem>
                      <SelectItem value="weekly">Weekly</SelectItem>
                      <SelectItem value="monthly">Monthly</SelectItem>
                   </SelectContent>
                </Select>
             </div>
             <div className="space-y-2">
                <Label>{t('settings.retentionPeriod')}</Label>
                <Select value={settings.retention} onValueChange={(v) => setSettings({...settings, retention: v})}>
                   <SelectTrigger><SelectValue /></SelectTrigger>
                   <SelectContent>
                      <SelectItem value="7">7 Days</SelectItem>
                      <SelectItem value="30">30 Days</SelectItem>
                      <SelectItem value="90">90 Days</SelectItem>
                   </SelectContent>
                </Select>
             </div>
          </CardContent>
        </Card>

        {/* Backups Table */}
        <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
           <div className="overflow-x-auto">
             <table className="w-full min-w-[720px]">
               <thead className="bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
                 <tr>
                   <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase">Date & Time</th>
                   <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase">Filename</th>
                   <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase">Size</th>
                   <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase">Status</th>
                   <th className="px-6 py-4 text-right text-xs font-semibold text-slate-500 uppercase">Actions</th>
                 </tr>
               </thead>
               <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {backups.length === 0 ? (
                    <tr><td colSpan="5" className="p-8 text-center text-slate-500">No backups found</td></tr>
                  ) : (
                    backups.map((backup) => (
                      <tr key={backup.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                        <td className="px-6 py-4 text-sm text-slate-700 dark:text-slate-300">
                           {formatThaiDateTime(backup.created_at)}
                        </td>
                        <td className="px-6 py-4 text-sm text-slate-900 dark:text-white font-medium flex items-center gap-2">
                           <FileJson className="w-4 h-4 text-slate-400" />
                           {backup.filename}
                        </td>
                        <td className="px-6 py-4 text-sm text-slate-500 font-mono">
                           {formatSize(backup.size_bytes)}
                        </td>
                         <td className="px-6 py-4 text-sm">
                           <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
                             {backup.status}
                           </span>
                        </td>
                        <td className="px-6 py-4 text-right space-x-2">
                           <Button size="sm" variant="ghost" title="Download">
                              <Download className="w-4 h-4 text-slate-500" />
                           </Button>
                           <PermissionGuard permission="backup_recovery" action="edit">
                            <Button size="sm" variant="ghost" title="Restore" onClick={handleRestore} className="text-yellow-600 hover:text-yellow-700 hover:bg-yellow-50">
                                <RotateCcw className="w-4 h-4" />
                            </Button>
                           </PermissionGuard>
                           <PermissionGuard permission="backup_recovery" action="delete">
                            <Button size="sm" variant="ghost" title="Delete" onClick={() => setDeleteId(backup.id)} className="text-red-600 hover:text-red-700 hover:bg-red-50">
                                <Trash2 className="w-4 h-4" />
                            </Button>
                           </PermissionGuard>
                        </td>
                      </tr>
                    ))
                  )}
               </tbody>
             </table>
           </div>
        </Card>
      </div>

      <ConfirmationModal
        isOpen={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={handleDelete}
        title="Delete Backup"
        description="Are you sure you want to delete this backup? This action cannot be undone."
        confirmText="Delete"
        variant="destructive"
      />
    </>
  );
};

export default BackupRecoveryPage;
