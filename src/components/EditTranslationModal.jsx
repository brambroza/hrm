
import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/lib/customSupabaseClient';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Trash2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import ConfirmationModal from '@/components/ConfirmationModal';

const EditTranslationModal = ({ isOpen, onClose, translation, onSuccess }) => {
  const { t } = useTranslation();
  const { toast } = useToast();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [formData, setFormData] = useState({
    key: '',
    thai_text: '',
    english_text: '',
    category: ''
  });

  const categories = ['Dashboard', 'Employee', 'Payroll', 'Settings', 'Common', 'Validation', 'Messages', 'Audit', 'Auth'];

  useEffect(() => {
    if (translation) {
      setFormData({
        key: translation.key,
        thai_text: translation.thai_text || '',
        english_text: translation.english_text || '',
        category: translation.category || 'Common'
      });
    }
  }, [translation]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);

      const { error } = await supabase
        .from('translations')
        .update({
          thai_text: formData.thai_text,
          english_text: formData.english_text,
          category: formData.category,
          status: (formData.thai_text && formData.english_text) ? 'complete' : 'incomplete',
          updated_at: new Date(),
          last_modified_by: user?.id
        })
        .eq('id', translation.id);

      if (error) throw error;

      toast({
        title: t('messages.savedSuccess'),
        description: t('messages.savedSuccess')
      });
      
      onSuccess();
      onClose();

    } catch (error) {
      toast({
        variant: 'destructive',
        title: t('common.error'),
        description: error.message
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    try {
      setLoading(true);
      const { error } = await supabase.from('translations').delete().eq('id', translation.id);
      if (error) throw error;
      
      toast({ title: t('messages.deletedSuccess') });
      onSuccess();
      onClose();
    } catch (error) {
      toast({ variant: 'destructive', title: 'Error', description: error.message });
    } finally {
      setLoading(false);
      setShowDeleteConfirm(false);
    }
  };

  return (
    <>
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold text-slate-900 dark:text-white">
            {t('translate.editTranslation')}
          </DialogTitle>
          {translation?.updated_at && (
            <p className="text-xs text-slate-400">
              {t('translate.lastModified')}: {new Date(translation.updated_at).toLocaleString()}
            </p>
          )}
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          <div className="grid gap-2">
            <Label htmlFor="edit-key">{t('translate.key')}</Label>
            <Input
              id="edit-key"
              value={formData.key}
              disabled
              className="bg-slate-100 dark:bg-slate-800/50 opacity-70 cursor-not-allowed font-mono text-sm"
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="edit-category">{t('translate.category')}</Label>
            <Select 
              value={formData.category} 
              onValueChange={(val) => setFormData({...formData, category: val})}
            >
              <SelectTrigger className="bg-slate-50 dark:bg-slate-800">
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent>
                {categories.map(cat => (
                  <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="edit-thai">{t('translate.thaiText')}</Label>
            <Textarea
              id="edit-thai"
              value={formData.thai_text}
              onChange={(e) => setFormData({ ...formData, thai_text: e.target.value })}
              className="bg-slate-50 dark:bg-slate-800 min-h-[80px]"
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="edit-english">{t('translate.englishText')}</Label>
            <Textarea
              id="edit-english"
              value={formData.english_text}
              onChange={(e) => setFormData({ ...formData, english_text: e.target.value })}
              className="bg-slate-50 dark:bg-slate-800 min-h-[80px]"
            />
          </div>

          <DialogFooter className="flex justify-between sm:justify-between w-full mt-4">
            <Button 
               type="button" 
               variant="destructive" 
               className="bg-red-100 text-red-600 hover:bg-red-200 border-none" 
               onClick={() => setShowDeleteConfirm(true)}
               disabled={loading}
            >
               <Trash2 className="w-4 h-4 mr-2" />
               {t('common.delete')}
            </Button>
            <div className="flex gap-2">
               <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
                 {t('common.cancel')}
               </Button>
               <Button type="submit" disabled={loading} className="bg-blue-600 hover:bg-blue-700 text-white">
                 {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                 {t('common.save')}
               </Button>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>

    <ConfirmationModal
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={handleDelete}
        title={t('translate.confirmDelete')}
        description={t('translate.deleteDescription')}
        confirmText={t('common.delete')}
        variant="destructive"
     />
    </>
  );
};

export default EditTranslationModal;
