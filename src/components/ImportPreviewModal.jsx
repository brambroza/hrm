
import React from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Loader2, FileJson, CheckCircle, AlertTriangle } from 'lucide-react';

const ImportPreviewModal = ({ isOpen, onClose, data, onConfirm, loading }) => {
  const { t } = useTranslation();

  const getStatusBadge = (item) => {
    if (item.action === 'new') return <Badge className="bg-green-100 text-green-700">New</Badge>;
    if (item.action === 'update') return <Badge className="bg-blue-100 text-blue-700">Update</Badge>;
    return <Badge className="bg-slate-100 text-slate-700">Skip</Badge>;
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[800px] max-h-[85vh] flex flex-col bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold text-slate-900 dark:text-white flex items-center gap-2">
            <FileJson className="w-5 h-5 text-indigo-500" />
            {t('translate.importPreview')}
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-hidden flex flex-col space-y-4">
           <div className="flex gap-4 p-3 bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-100 dark:border-slate-700">
              <div className="flex items-center gap-2 text-sm text-green-600">
                 <CheckCircle className="w-4 h-4" />
                 <span>New: {data.filter(i => i.action === 'new').length}</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-blue-600">
                 <AlertTriangle className="w-4 h-4" />
                 <span>Update: {data.filter(i => i.action === 'update').length}</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-slate-500">
                 <span>Total: {data.length}</span>
              </div>
           </div>

           <div className="flex-1 overflow-auto border rounded-md dark:border-slate-700">
             <table className="w-full text-sm">
               <thead className="bg-slate-100 dark:bg-slate-800 sticky top-0">
                 <tr>
                   <th className="px-4 py-3 text-left font-medium text-slate-500">Action</th>
                   <th className="px-4 py-3 text-left font-medium text-slate-500">Key</th>
                   <th className="px-4 py-3 text-left font-medium text-slate-500">Thai</th>
                   <th className="px-4 py-3 text-left font-medium text-slate-500">English</th>
                 </tr>
               </thead>
               <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                 {data.map((item, idx) => (
                   <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                     <td className="px-4 py-2">{getStatusBadge(item)}</td>
                     <td className="px-4 py-2 font-mono text-xs">{item.key}</td>
                     <td className="px-4 py-2 max-w-[150px] truncate" title={item.thai_text}>{item.thai_text}</td>
                     <td className="px-4 py-2 max-w-[150px] truncate" title={item.english_text}>{item.english_text}</td>
                   </tr>
                 ))}
               </tbody>
             </table>
           </div>
        </div>

        <DialogFooter className="mt-4">
          <Button variant="outline" onClick={onClose} disabled={loading}>
            {t('common.cancel')}
          </Button>
          <Button onClick={onConfirm} disabled={loading || data.length === 0} className="bg-indigo-600 hover:bg-indigo-700 text-white">
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {t('common.import')} ({data.length})
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ImportPreviewModal;
