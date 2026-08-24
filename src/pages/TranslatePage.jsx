
import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/components/ui/use-toast';
import { motion, AnimatePresence } from 'framer-motion';
import { 
   Plus, Search, Download, Edit, Trash2, Upload, RefreshCw, 
   Globe, CheckCircle, AlertCircle, Eye
} from 'lucide-react';
import { Helmet } from 'react-helmet';
import { useTranslation } from 'react-i18next';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';

import AddTranslationModal from '@/components/AddTranslationModal';
import EditTranslationModal from '@/components/EditTranslationModal';
import ViewTranslationModal from '@/components/ViewTranslationModal';
import ImportPreviewModal from '@/components/ImportPreviewModal';
import ConfirmationModal from '@/components/ConfirmationModal';
import { exportToExcel } from '@/utils/helpers';
import { usePermission } from '@/hooks/usePermission';
import PermissionGuard from '@/components/PermissionGuard';
import AccessDenied from '@/components/AccessDenied';

const TranslatePage = () => {
  const { t } = useTranslation();
  const { toast } = useToast();
  const { canView } = usePermission();
  
  // State
  const [translations, setTranslations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  
  // Selection
  const [selectedItems, setSelectedItems] = useState(new Set());
  
  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showBulkDeleteConfirm, setShowBulkDeleteConfirm] = useState(false);
  
  // Data for modals
  const [selectedTranslation, setSelectedTranslation] = useState(null);
  const [importData, setImportData] = useState([]);
  const [importLoading, setImportLoading] = useState(false);

  useEffect(() => {
    if (canView('translate')) {
      fetchTranslations();
    } else {
      setLoading(false);
    }
  }, []);

  const fetchTranslations = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('translations')
        .select('*')
        .order('key', { ascending: true });

      if (error) throw error;
      setTranslations(data || []);
    } catch (error) {
      toast({
        variant: 'destructive',
        title: t('common.error'),
        description: 'Failed to fetch translations'
      });
    } finally {
      setLoading(false);
    }
  };

  // Filter Logic
  const filteredTranslations = useMemo(() => {
    return translations.filter(item => {
      const matchesSearch = 
        item.key.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.thai_text?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.english_text?.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesStatus = 
        filterStatus === 'all' ? true : 
        filterStatus === 'complete' ? (item.thai_text && item.english_text) :
        (!item.thai_text || !item.english_text);

      return matchesSearch && matchesStatus;
    });
  }, [translations, searchTerm, filterStatus]);

  // Stats
  const stats = useMemo(() => {
    const total = translations.length;
    const complete = translations.filter(t => t.thai_text && t.english_text).length;
    const incomplete = total - complete;
    const rate = total > 0 ? Math.round((complete / total) * 100) : 0;
    return { total, complete, incomplete, rate };
  }, [translations]);

  // Bulk Actions
  const handleSelectAll = (checked) => {
    if (checked) {
      setSelectedItems(new Set(filteredTranslations.map(i => i.id)));
    } else {
      setSelectedItems(new Set());
    }
  };

  const handleSelectItem = (id, checked) => {
    const newSet = new Set(selectedItems);
    if (checked) newSet.add(id);
    else newSet.delete(id);
    setSelectedItems(newSet);
  };

  const handleBulkDelete = async () => {
    try {
      const ids = Array.from(selectedItems);
      const { error } = await supabase.from('translations').delete().in('id', ids);
      if (error) throw error;
      
      toast({ title: t('messages.deletedSuccess') });
      setSelectedItems(new Set());
      fetchTranslations();
    } catch (error) {
       toast({ variant: 'destructive', title: 'Error', description: error.message });
    } finally {
       setShowBulkDeleteConfirm(false);
    }
  };

  // Export / Import
  const handleExport = () => {
    const dataToExport = (selectedItems.size > 0 
       ? translations.filter(t => selectedItems.has(t.id)) 
       : filteredTranslations
    ).map(item => ({
      key: item.key,
      thai_text: item.thai_text,
      english_text: item.english_text,
      category: item.category,
      status: (item.thai_text && item.english_text) ? 'complete' : 'incomplete'
    }));
    
    exportToExcel(dataToExport, 'Translations');
    toast({ title: t('translate.exportSuccess'), description: `Exported ${dataToExport.length} items.` });
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const json = JSON.parse(e.target.result);
        if (!Array.isArray(json)) throw new Error('Format must be an array');
        
        const preview = json.map(item => {
           const existing = translations.find(t => t.key === item.key);
           return { ...item, action: existing ? 'update' : 'new' };
        });
        
        setImportData(preview);
        setShowImportModal(true);
      } catch (err) {
        toast({ variant: 'destructive', title: 'Invalid JSON', description: err.message });
      }
    };
    reader.readAsText(file);
    e.target.value = null; 
  };

  const confirmImport = async () => {
    try {
      setImportLoading(true);
      const updates = [];
      const inserts = [];

      for (const item of importData) {
         if (item.action === 'new') {
            inserts.push({
               key: item.key,
               thai_text: item.thai_text,
               english_text: item.english_text,
               category: item.category || 'Imported',
               status: (item.thai_text && item.english_text) ? 'complete' : 'incomplete'
            });
         } else if (item.action === 'update') {
            const id = translations.find(t => t.key === item.key)?.id;
            if(id) {
               updates.push({
                  id,
                  thai_text: item.thai_text,
                  english_text: item.english_text,
                  updated_at: new Date()
               });
            }
         }
      }

      if (inserts.length > 0) await supabase.from('translations').insert(inserts);
      for (const update of updates) {
         await supabase.from('translations').update(update).eq('id', update.id);
      }

      toast({ title: t('translate.importSuccess'), description: `Imported ${inserts.length} new, ${updates.length} updated.` });
      fetchTranslations();
      setShowImportModal(false);
    } catch (error) {
       toast({ variant: 'destructive', title: 'Import Failed', description: error.message });
    } finally {
       setImportLoading(false);
    }
  };

  const handleDeleteSingle = async () => {
    if (!selectedTranslation) return;
    try {
       await supabase.from('translations').delete().eq('id', selectedTranslation.id);
       toast({ title: t('messages.deletedSuccess') });
       fetchTranslations();
    } catch (error) {
       toast({ variant: 'destructive', title: 'Error', description: error.message });
    } finally {
       setShowDeleteConfirm(false);
       setSelectedTranslation(null);
    }
  };

  if (!canView('translate')) {
    return <AccessDenied />;
  }

  return (
    <>
      <Helmet>
        <title>{t('translate.title')} - HRM System</title>
      </Helmet>

      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">{t('translate.title')}</h1>
            <p className="text-slate-500 dark:text-slate-400">{t('translate.subtitle')}</p>
          </div>
          <div className="flex gap-2">
             <Button variant="outline" onClick={fetchTranslations} className="hidden sm:flex" disabled={loading}>
                <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                {t('common.reset')}
             </Button>
             <PermissionGuard permission="translate" action="add">
               <Button onClick={() => setShowAddModal(true)} className="bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-500/20">
                 <Plus className="w-4 h-4 mr-2" />
                 {t('translate.addTranslation')}
               </Button>
             </PermissionGuard>
          </div>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
           {/* ... Stats UI ... */}
        </div>

        {/* Filters & Actions */}
        <div className="flex flex-col lg:flex-row gap-4 bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
           <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input 
                 id="search-translation"
                 placeholder={t('translate.searchPlaceholder')} 
                 value={searchTerm}
                 onChange={(e) => setSearchTerm(e.target.value)}
                 className="pl-9 bg-slate-50 dark:bg-slate-950"
              />
           </div>
           <div className="flex gap-2 flex-wrap">
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                 <SelectTrigger className="w-[140px]">
                    <SelectValue placeholder={t('translate.status')} />
                 </SelectTrigger>
                 <SelectContent>
                    <SelectItem value="all">{t('translate.all')}</SelectItem>
                    <SelectItem value="complete">{t('translate.complete')}</SelectItem>
                    <SelectItem value="incomplete">{t('translate.incomplete')}</SelectItem>
                 </SelectContent>
              </Select>
              
              <div className="h-10 w-px bg-slate-200 dark:bg-slate-800 mx-1 hidden sm:block"></div>

              <input 
                 type="file" 
                 id="import-json" 
                 className="hidden" 
                 accept=".json" 
                 onChange={handleFileUpload}
              />
              <PermissionGuard permission="translate" action="add">
                <Button variant="outline" onClick={() => document.getElementById('import-json').click()}>
                  <Upload className="w-4 h-4 mr-2" />
                  {t('common.import')}
                </Button>
              </PermissionGuard>
              <Button variant="outline" onClick={handleExport}>
                 <Download className="w-4 h-4 mr-2" />
                 {t('common.export')}
              </Button>
           </div>
        </div>

        {/* Bulk Actions Toolbar */}
        <AnimatePresence>
           {selectedItems.size > 0 && (
              <motion.div 
                 initial={{ opacity: 0, y: 10 }} 
                 animate={{ opacity: 1, y: 0 }} 
                 exit={{ opacity: 0, y: 10 }}
                 className="fixed bottom-6 left-1/2 transform -translate-x-1/2 z-50 bg-slate-900 text-white px-6 py-3 rounded-full shadow-xl flex items-center gap-4"
              >
                 <span className="text-sm font-medium">{t('common.itemsSelected', { count: selectedItems.size })}</span>
                 <div className="h-4 w-px bg-slate-700"></div>
                 <PermissionGuard permission="translate" action="delete">
                   <button onClick={() => setShowBulkDeleteConfirm(true)} className="text-red-400 hover:text-red-300 text-sm font-medium flex items-center gap-1">
                      <Trash2 className="w-4 h-4" /> {t('common.deleteAll')}
                   </button>
                 </PermissionGuard>
                 <button onClick={handleExport} className="text-blue-400 hover:text-blue-300 text-sm font-medium flex items-center gap-1">
                    <Download className="w-4 h-4" /> {t('common.exportSelected')}
                 </button>
                 <button onClick={() => setSelectedItems(new Set())} className="text-slate-400 hover:text-white text-sm font-medium ml-2">
                    {t('common.deselectAll')}
                 </button>
              </motion.div>
           )}
        </AnimatePresence>

        {/* Table */}
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
           <div className="overflow-x-auto">
              <table className="w-full min-w-[720px]">
                 <thead className="bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
                    <tr>
                       <th className="px-6 py-4 w-12">
                          <Checkbox 
                             checked={selectedItems.size === filteredTranslations.length && filteredTranslations.length > 0}
                             onCheckedChange={handleSelectAll}
                          />
                       </th>
                       <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">{t('translate.key')}</th>
                       <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">{t('translate.thaiText')}</th>
                       <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">{t('translate.englishText')}</th>
                       <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">{t('translate.status')}</th>
                       <th className="px-6 py-4 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">{t('common.actions')}</th>
                    </tr>
                 </thead>
                 <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {loading ? (
                       <tr><td colSpan="6" className="p-8 text-center text-slate-500">{t('common.loading')}</td></tr>
                    ) : filteredTranslations.length === 0 ? (
                       <tr><td colSpan="6" className="p-12 text-center text-slate-500 flex flex-col items-center">
                          <Search className="w-12 h-12 text-slate-300 mb-2" />
                          <p className="text-lg font-medium text-slate-900 dark:text-white">{t('common.noData')}</p>
                          <p className="text-sm">{t('translate.subtitle')}</p>
                       </td></tr>
                    ) : (
                       filteredTranslations.map((item) => (
                          <motion.tr 
                             key={item.id} 
                             initial={{ opacity: 0 }}
                             animate={{ opacity: 1 }}
                             className={`hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors ${selectedItems.has(item.id) ? 'bg-blue-50 dark:bg-blue-900/10' : ''}`}
                          >
                             <td className="px-6 py-4">
                                <Checkbox 
                                   checked={selectedItems.has(item.id)} 
                                   onCheckedChange={(c) => handleSelectItem(item.id, c)}
                                />
                             </td>
                             <td className="px-6 py-4">
                                <div className="flex flex-col">
                                   <span className="text-sm font-medium font-mono text-slate-900 dark:text-white">{item.key}</span>
                                   {item.category && <span className="text-xs text-slate-400">{item.category}</span>}
                                </div>
                             </td>
                             <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-300 max-w-xs truncate" title={item.thai_text}>
                                {item.thai_text || <span className="text-slate-300 italic">-</span>}
                             </td>
                             <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-300 max-w-xs truncate" title={item.english_text}>
                                {item.english_text || <span className="text-slate-300 italic">-</span>}
                             </td>
                             <td className="px-6 py-4">
                                {item.thai_text && item.english_text ? (
                                   <Badge className="bg-green-100 text-green-700 hover:bg-green-200 border-none">{t('translate.complete')}</Badge>
                                ) : (
                                   <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-200 border-none">{t('translate.incomplete')}</Badge>
                                )}
                             </td>
                             <td className="px-6 py-4 text-right">
                                <div className="flex justify-end gap-2">
                                   <Button size="sm" variant="ghost" onClick={() => { setSelectedTranslation(item); setShowViewModal(true); }}>
                                      <Eye className="w-4 h-4 text-slate-500" />
                                   </Button>
                                   <PermissionGuard permission="translate" action="edit">
                                     <Button size="sm" variant="ghost" onClick={() => { setSelectedTranslation(item); setShowEditModal(true); }}>
                                        <Edit className="w-4 h-4 text-blue-500" />
                                     </Button>
                                   </PermissionGuard>
                                   <PermissionGuard permission="translate" action="delete">
                                     <Button size="sm" variant="ghost" onClick={() => { setSelectedTranslation(item); setShowDeleteConfirm(true); }}>
                                        <Trash2 className="w-4 h-4 text-red-500" />
                                     </Button>
                                   </PermissionGuard>
                                </div>
                             </td>
                          </motion.tr>
                       ))
                    )}
                 </tbody>
              </table>
           </div>
           
           <div className="bg-slate-50 dark:bg-slate-800 p-4 border-t border-slate-200 dark:border-slate-700 flex justify-between items-center text-sm text-slate-500">
               <span>{t('translate.total')}: {filteredTranslations.length}</span>
           </div>
        </div>
      </div>

      <AddTranslationModal isOpen={showAddModal} onClose={() => setShowAddModal(false)} onSuccess={fetchTranslations} />
      
      {selectedTranslation && (
         <>
            <EditTranslationModal isOpen={showEditModal} onClose={() => { setShowEditModal(false); setSelectedTranslation(null); }} translation={selectedTranslation} onSuccess={fetchTranslations} />
            <ViewTranslationModal isOpen={showViewModal} onClose={() => { setShowViewModal(false); setSelectedTranslation(null); }} translation={selectedTranslation} onEdit={() => { setShowViewModal(false); setShowEditModal(true); }} />
         </>
      )}

      <ImportPreviewModal isOpen={showImportModal} onClose={() => setShowImportModal(false)} data={importData} onConfirm={confirmImport} loading={importLoading} />

      <ConfirmationModal 
         isOpen={showDeleteConfirm} 
         onClose={() => setShowDeleteConfirm(false)} 
         onConfirm={handleDeleteSingle} 
         title={t('translate.confirmDelete')}
         description={t('translate.deleteDescription')}
         confirmText={t('common.delete')}
         variant="destructive"
      />
      
      <ConfirmationModal 
         isOpen={showBulkDeleteConfirm} 
         onClose={() => setShowBulkDeleteConfirm(false)} 
         onConfirm={handleBulkDelete} 
         title={t('translate.confirmDelete')}
         description={`Are you sure you want to delete ${selectedItems.size} items?`}
         confirmText={t('common.deleteAll')}
         variant="destructive"
      />
    </>
  );
};

export default TranslatePage;
