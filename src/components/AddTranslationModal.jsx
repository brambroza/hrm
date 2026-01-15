
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/lib/customSupabaseClient';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, AlertCircle } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

const AddTranslationModal = ({ isOpen, onClose, onSuccess }) => {
  const { t } = useTranslation();
  const { toast } = useToast();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    key: '',
    thai_text: '',
    english_text: '',
    category: 'Common'
  });
  const [errors, setErrors] = useState({});

  const categories = ['Dashboard', 'Employee', 'Payroll', 'Settings', 'Common', 'Validation', 'Messages', 'Audit', 'Auth'];

  const validate = () => {
    const newErrors = {};
    if (!formData.key) newErrors.key = t('validation.required');
    if (!formData.key.includes('.')) newErrors.keyHint = t('translate.dotNotationHint');
    if (formData.thai_text.length > 500) newErrors.thai_text = t('translate.charLimit');
    if (formData.english_text.length > 500) newErrors.english_text = t('translate.charLimit');
    setErrors(newErrors);
    return Object.keys(newErrors).filter(k => k !== 'keyHint').length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    try {
      setLoading(true);
      
      const { data: existing } = await supabase
        .from('translations')
        .select('id')
        .eq('key', formData.key)
        .single();
        
      if (existing) {
        setErrors(prev => ({ ...prev, key: t('validation.keyUnique') }));
        throw new Error(t('validation.keyUnique'));
      }

      const { error } = await supabase
        .from('translations')
        .insert([{
          key: formData.key,
          thai_text: formData.thai_text,
          english_text: formData.english_text,
          category: formData.category,
          status: (formData.thai_text && formData.english_text) ? 'complete' : 'incomplete',
          created_by: user?.id,
          last_modified_by: user?.id,
          created_at: new Date(),
          updated_at: new Date()
        }]);

      if (error) throw error;

      toast({
        title: t('messages.savedSuccess'),
        description: `Key "${formData.key}" added successfully.`
      });
      
      setFormData({ key: '', thai_text: '', english_text: '', category: 'Common' });
      setErrors({});
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

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !loading && onClose(open)}>
      <DialogContent className="sm:max-w-[600px] bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800" onKeyDown={(e) => {
        if (e.key === 'Enter' && e.ctrlKey) handleSubmit(e);
      }}>
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold text-slate-900 dark:text-white">
            {t('translate.addTranslation')}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          <div className="grid gap-2">
            <Label htmlFor="key" className="flex justify-between">
              {t('translate.key')} <span className="text-red-500">*</span>
            </Label>
            <Input
              id="key"
              value={formData.key}
              onChange={(e) => setFormData({ ...formData, key: e.target.value })}
              className={`bg-slate-50 dark:bg-slate-800 ${errors.key ? 'border-red-500' : ''}`}
              placeholder="e.g. common.save_button"
              autoFocus
            />
            {errors.key && <p className="text-xs text-red-500 flex items-center gap-1"><AlertCircle className="w-3 h-3"/> {errors.key}</p>}
            {errors.keyHint && !errors.key && <p className="text-xs text-amber-500">{errors.keyHint}</p>}
          </div>

          <div className="grid gap-2">
            <Label htmlFor="category">{t('translate.category')}</Label>
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
            <div className="flex justify-between items-center">
              <Label htmlFor="thai">{t('translate.thaiText')}</Label>
              <span className={`text-xs ${formData.thai_text.length > 500 ? 'text-red-500' : 'text-slate-400'}`}>
                {formData.thai_text.length}/500
              </span>
            </div>
            <Textarea
              id="thai"
              value={formData.thai_text}
              onChange={(e) => setFormData({ ...formData, thai_text: e.target.value })}
              className="bg-slate-50 dark:bg-slate-800 min-h-[80px]"
              placeholder="ข้อความภาษาไทย"
            />
          </div>

          <div className="grid gap-2">
            <div className="flex justify-between items-center">
              <Label htmlFor="english">{t('translate.englishText')}</Label>
               <span className={`text-xs ${formData.english_text.length > 500 ? 'text-red-500' : 'text-slate-400'}`}>
                {formData.english_text.length}/500
              </span>
            </div>
            <Textarea
              id="english"
              value={formData.english_text}
              onChange={(e) => setFormData({ ...formData, english_text: e.target.value })}
              className="bg-slate-50 dark:bg-slate-800 min-h-[80px]"
              placeholder="English text"
            />
          </div>

          <DialogFooter className="mt-4">
            <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
              {t('common.cancel')} (Esc)
            </Button>
            <Button type="submit" disabled={loading} className="bg-emerald-600 hover:bg-emerald-700 text-white">
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {t('common.add')} (Ctrl+Enter)
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default AddTranslationModal;
