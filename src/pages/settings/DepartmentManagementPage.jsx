import React, { useEffect, useState } from 'react';
import { Helmet } from 'react-helmet';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/components/ui/use-toast';
import { usePermission } from '@/hooks/usePermission';
import { departmentService } from '@/services/departments';
import ConfirmationModal from '@/components/ConfirmationModal';
import { useTranslation } from 'react-i18next';
import AccessDenied from '@/components/AccessDenied';

const DepartmentManagementPage = () => {
  const { toast } = useToast();
  const { t } = useTranslation();
  const { canView, canAdd, canEdit, canDelete } = usePermission();
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [deleteId, setDeleteId] = useState(null);

  const [formData, setFormData] = useState({
    name: '',
    description: ''
  });

  useEffect(() => {
    if (canView('department')) {
      loadDepartments();
    } else {
      setLoading(false);
    }
  }, [canView]);

  const loadDepartments = async () => {
    setLoading(true);
    try {
      const data = await departmentService.getDepartments();
      setDepartments(data || []);
    } catch (error) {
      toast({
        variant: 'destructive',
        title: t('common.error'),
        description: error.message || t('department.loadError')
      });
    } finally {
      setLoading(false);
    }
  };

  const openCreate = () => {
    setEditing(null);
    setFormData({ name: '', description: '' });
    setShowModal(true);
  };

  const openEdit = (dept) => {
    setEditing(dept);
    setFormData({ name: dept.name || '', description: dept.description || '' });
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (!formData.name) {
      toast({
        variant: 'destructive',
        title: t('common.error'),
        description: t('department.nameRequired')
      });
        return;
      }

      if (editing) {
        await departmentService.updateDepartment(editing.id, formData);
      } else {
        await departmentService.addDepartment(formData);
      }

      toast({
        title: t('common.success'),
        description: editing ? t('department.updated') : t('department.added')
      });
      setShowModal(false);
      loadDepartments();
    } catch (error) {
      toast({
        variant: 'destructive',
        title: t('common.error'),
        description: error.message || t('department.saveError')
      });
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await departmentService.deleteDepartment(deleteId);
      toast({
        title: t('common.success'),
        description: t('department.deleted')
      });
      setDeleteId(null);
      loadDepartments();
    } catch (error) {
      toast({
        variant: 'destructive',
        title: t('common.error'),
        description: error.message || t('department.deleteError')
      });
    }
  };

  if (!canView('department')) {
    return <AccessDenied />;
  }

  return (
    <>
      <Helmet>
        <title>{t('department.title')} - GoAlong HR</title>
      </Helmet>
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">{t('department.title')}</h1>
            <p className="text-slate-500 dark:text-slate-400">{departments.length} {t('department.count')}</p>
          </div>
          {canAdd('department') && (
            <Button onClick={openCreate} className="bg-blue-600 hover:bg-blue-700">
              {t('department.add')}
            </Button>
          )}
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px]">
              <thead className="bg-slate-50 dark:bg-slate-800">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase">{t('department.name')}</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase">{t('department.description')}</th>
                  <th className="px-6 py-3 text-right text-xs font-semibold text-slate-500 uppercase">{t('common.actions')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {loading ? (
                  <tr>
                    <td colSpan={3} className="px-6 py-6 text-center text-slate-500">{t('common.loading')}</td>
                  </tr>
                ) : departments.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="px-6 py-6 text-center text-slate-500">{t('common.noData')}</td>
                  </tr>
                ) : (
                  departments.map((dept) => (
                    <tr key={dept.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                      <td className="px-6 py-4 text-sm text-slate-900 dark:text-white">{dept.name}</td>
                      <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-300">{dept.description || '-'}</td>
                      <td className="px-6 py-4 text-sm text-right">
                        <div className="flex justify-end gap-2">
                          {canEdit('department') && (
                            <Button size="sm" variant="outline" onClick={() => openEdit(dept)}>
                              {t('common.edit')}
                            </Button>
                          )}
                          {canDelete('department') && (
                            <Button size="sm" variant="outline" onClick={() => setDeleteId(dept.id)}>
                              {t('common.delete')}
                            </Button>
                          )}
                        </div>
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
            <DialogTitle>{editing ? t('department.edit') : t('department.add')}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-2">{t('department.name')} *</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
                className="w-full px-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-2">{t('department.description')}</label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full px-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
                rows={3}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setShowModal(false)} className="border-slate-200 dark:border-slate-700">
                {t('common.cancel')}
              </Button>
              <Button type="submit" className="bg-blue-600 hover:bg-blue-700">
                {t('common.save')}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <ConfirmationModal
        isOpen={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={handleDelete}
        title={t('department.delete')}
        description={t('department.deleteConfirm')}
        confirmText={t('common.delete')}
        variant="destructive"
      />
    </>
  );
};

export default DepartmentManagementPage;
