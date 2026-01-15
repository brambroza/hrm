import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Loader2, AlertTriangle } from 'lucide-react';
import { useUsers } from '@/hooks/useUsers';

const ConfirmDeleteUserModal = ({ isOpen, onClose, user, onSuccess }) => {
  const { t } = useTranslation();
  const { deleteUser } = useUsers();
  const [loading, setLoading] = useState(false);

  const handleConfirm = async () => {
    setLoading(true);
    const { error } = await deleteUser(user.id);
    setLoading(false);

    if (!error) {
      if (onSuccess) onSuccess();
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px] bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
        <DialogHeader>
          <div className="flex items-center gap-2 text-red-500 mb-2">
            <AlertTriangle className="h-6 w-6" />
            <DialogTitle className="text-xl font-semibold">
              {t('userManagement.confirmDelete')}
            </DialogTitle>
          </div>
          <DialogDescription className="text-slate-500 dark:text-slate-400">
            {t('userManagement.deleteWarning')}
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          <p className="text-sm text-slate-700 dark:text-slate-300">
            User: <span className="font-bold">{user?.full_name}</span>
          </p>
          <p className="text-sm text-slate-500">
            Email: {user?.email}
          </p>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
            {t('common.cancel')}
          </Button>
          <Button 
            type="button" 
            disabled={loading} 
            onClick={handleConfirm}
            className="bg-red-600 hover:bg-red-700 text-white"
          >
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {t('common.delete')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ConfirmDeleteUserModal;