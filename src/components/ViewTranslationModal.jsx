
import React from 'react';
import { formatThaiDateTime } from '@/utils/helpers';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Edit, Clock, User, Globe } from 'lucide-react';

const ViewTranslationModal = ({ isOpen, onClose, translation, onEdit }) => {
  const { t } = useTranslation();

  if (!translation) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold text-slate-900 dark:text-white flex items-center gap-2">
            <Globe className="w-5 h-5 text-blue-500" />
            {t('translate.viewTranslation')}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          <div className="flex flex-wrap gap-4 items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
             <div className="space-y-1">
                <Label className="text-xs text-slate-500 uppercase font-bold">{t('translate.key')}</Label>
                <div className="text-lg font-mono font-bold text-slate-800 dark:text-slate-100 bg-slate-100 dark:bg-slate-800 px-3 py-1 rounded-md">
                   {translation.key}
                </div>
             </div>
             <div className="flex gap-2">
                <Badge variant={translation.thai_text && translation.english_text ? 'success' : 'warning'} className={`${translation.thai_text && translation.english_text ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                   {translation.thai_text && translation.english_text ? t('translate.complete') : t('translate.incomplete')}
                </Badge>
                {translation.category && (
                   <Badge variant="outline" className="border-blue-200 text-blue-700 bg-blue-50">
                      {translation.category}
                   </Badge>
                )}
             </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card className="bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700">
               <CardContent className="p-4 space-y-2">
                  <Label className="text-slate-500 flex items-center gap-2">
                     <span className="text-2xl">🇹🇭</span> {t('translate.thaiText')}
                  </Label>
                  <p className="text-slate-900 dark:text-slate-100 whitespace-pre-wrap leading-relaxed">
                     {translation.thai_text || <span className="text-slate-400 italic">Empty</span>}
                  </p>
               </CardContent>
            </Card>

            <Card className="bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700">
               <CardContent className="p-4 space-y-2">
                  <Label className="text-slate-500 flex items-center gap-2">
                     <span className="text-2xl">🇬🇧</span> {t('translate.englishText')}
                  </Label>
                  <p className="text-slate-900 dark:text-slate-100 whitespace-pre-wrap leading-relaxed">
                     {translation.english_text || <span className="text-slate-400 italic">Empty</span>}
                  </p>
               </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-2 gap-4 text-sm text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-900 p-3 rounded-lg border border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-2">
               <Clock className="w-4 h-4" />
               <span>{t('translate.lastModified')}: {translation.updated_at ? formatThaiDateTime(translation.updated_at) : '-'}</span>
            </div>
            <div className="flex items-center gap-2">
               <User className="w-4 h-4" />
               <span>{t('translate.createdBy')}: {translation.created_by || 'System'}</span>
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="secondary" onClick={onClose}>
            {t('common.actions')}
          </Button>
          <Button onClick={() => { onClose(); onEdit(translation); }} className="bg-blue-600 hover:bg-blue-700">
            <Edit className="w-4 h-4 mr-2" />
            {t('common.edit')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ViewTranslationModal;
