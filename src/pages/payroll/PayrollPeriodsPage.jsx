
import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { 
  Calendar, Plus, Search, RefreshCw, Edit, Trash2, Lock, MoreVertical, 
  ArrowUpDown, ChevronLeft, ChevronRight, AlertCircle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useToast } from '@/components/ui/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { getPayrollPeriods, deletePayrollPeriod, closePayrollPeriod } from '@/services/payrollPeriods';
import ConfirmationModal from '@/components/ConfirmationModal';
import AddPayrollPeriodModal from '@/components/AddPayrollPeriodModal';
import EditPayrollPeriodModal from '@/components/EditPayrollPeriodModal';
import { getStatusLabel, getStatusColor, VALID_STATUSES, normalizeStatus } from '@/utils/statusValidator';
import { formatThaiDate } from '@/utils/helpers';

const formatDate = (dateString) => {
  if (!dateString) return "-";
  return formatThaiDate(dateString);
};

const PayrollPeriodsPage = () => {
  const { t } = useTranslation();
  const { toast } = useToast();
  
  // Data State
  const [periods, setPeriods] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filter & Search State
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [yearFilter, setYearFilter] = useState('all');

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Sorting State
  const [sortColumn, setSortColumn] = useState('start_date');
  const [sortDirection, setSortDirection] = useState('desc');

  // Modal State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isCloseModalOpen, setIsCloseModalOpen] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState({ isOpen: false, id: null });
  const [selectedPeriod, setSelectedPeriod] = useState(null);

  // Helper: Fetch Data
  const fetchPeriods = async () => {
    console.log("[Page] Fetching payroll periods...");
    setLoading(true);
    setError(null);
    try {
        const { data, error } = await getPayrollPeriods();
        if (error) {
            throw new Error(error.message);
        }
        setPeriods(data || []);
        console.log(`[Page] Loaded ${data?.length || 0} periods.`);
    } catch (err) {
        console.error("[Page] Error fetching periods:", err);
        setError("ไม่สามารถโหลดข้อมูลได้ กรุณาลองใหม่");
    } finally {
        setLoading(false);
    }
  };

  useEffect(() => {
    fetchPeriods();
  }, []);

  // Filtering Logic
  const filteredPeriods = periods.filter(period => {
    const matchesSearch = period.name.toLowerCase().includes(searchTerm.toLowerCase());
    const normalizedStatus = normalizeStatus(period.status);
    const matchesStatus = statusFilter === 'all' || normalizedStatus === statusFilter;
    const periodYear = new Date(period.start_date).getFullYear().toString();
    const matchesYear = yearFilter === 'all' || periodYear === yearFilter;
    return matchesSearch && matchesStatus && matchesYear;
  });

  // Sorting Logic
  const sortedPeriods = [...filteredPeriods].sort((a, b) => {
    let aValue = a[sortColumn];
    let bValue = b[sortColumn];

    if (sortColumn === 'name') {
        aValue = aValue.toLowerCase();
        bValue = bValue.toLowerCase();
        return sortDirection === 'asc' ? aValue.localeCompare(bValue) : bValue.localeCompare(aValue);
    }
    
    // Date sorting
    if (sortColumn === 'start_date' || sortColumn === 'end_date') {
        return sortDirection === 'asc' 
            ? new Date(aValue) - new Date(bValue) 
            : new Date(bValue) - new Date(aValue);
    }

    return 0;
  });

  const handleSort = (column) => {
      if (sortColumn === column) {
          setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
      } else {
          setSortColumn(column);
          setSortDirection('asc');
      }
  };

  // Pagination Logic
  const totalPages = Math.ceil(sortedPeriods.length / itemsPerPage);
  const paginatedPeriods = sortedPeriods.slice(
      (currentPage - 1) * itemsPerPage,
      currentPage * itemsPerPage
  );

  useEffect(() => {
      setCurrentPage(1);
  }, [searchTerm, statusFilter, yearFilter]);

  // Handlers for Add/Edit Modal
  const handleSuccess = () => {
    fetchPeriods();
  };

  // Handlers for Edit
  const openEditModal = (period) => {
    setSelectedPeriod(period);
    setIsEditModalOpen(true);
  };

  // Close Period Handler
  const handleClosePeriod = async () => {
      if (!selectedPeriod) return;
      try {
          const { error } = await closePayrollPeriod(selectedPeriod.id);
          if (error) throw error;

          toast({ title: "สำเร็จ", description: "ปิดงวดการจ่ายเรียบร้อยแล้ว", className: "bg-blue-500 text-white" });
          setIsCloseModalOpen(false);
          fetchPeriods();
      } catch (err) {
          console.error("[Page] Error closing period:", err);
          toast({ variant: "destructive", title: "เกิดข้อผิดพลาด", description: "ไม่สามารถปิดงวดการจ่ายได้" });
      }
  };

  // Delete Handler
  const handleConfirmDelete = async () => {
      if (!deleteConfirmation.id) return;
      try {
          const { error } = await deletePayrollPeriod(deleteConfirmation.id);
          if (error) throw error;

          toast({ title: "สำเร็จ", description: "ลบงวดการจ่ายสำเร็จ" });
          fetchPeriods();
      } catch (err) {
          console.error("[Page] Error deleting period:", err);
          toast({ variant: "destructive", title: "เกิดข้อผิดพลาด", description: "ไม่สามารถลบงวดการจ่ายได้" });
      } finally {
          setDeleteConfirmation({ isOpen: false, id: null });
      }
  };

  // Unique years for filter
  const uniqueYears = [...new Set(periods.map(p => new Date(p.start_date).getFullYear()))].sort().reverse();

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Calendar className="w-6 h-6 text-blue-600" />
            {t('common.payroll')}: {t('payroll.periods')}
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">จัดการงวดการจ่ายเงินเดือน</p>
        </div>
        <Button 
            onClick={() => setIsAddModalOpen(true)} 
            className="bg-blue-600 hover:bg-blue-700 text-white shadow-sm"
        >
          <Plus className="w-4 h-4 mr-2" />
          เพิ่มงวดใหม่
        </Button>
      </div>

      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col lg:flex-row gap-4 mb-6 justify-between items-end lg:items-center">
            <div className="flex flex-col sm:flex-row gap-2 w-full lg:w-auto">
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
                <Input
                  placeholder={t('common.search') + "..."}
                  className="pl-9"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full sm:w-[150px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">ทั้งหมด</SelectItem>
                  <SelectItem value={VALID_STATUSES.DRAFT}>ร่าง (Draft)</SelectItem>
                  <SelectItem value={VALID_STATUSES.OPEN}>เปิดใช้งาน (Open)</SelectItem>
                  <SelectItem value={VALID_STATUSES.CLOSED}>ปิด (Closed)</SelectItem>
                </SelectContent>
              </Select>
              <Select value={yearFilter} onValueChange={setYearFilter}>
                <SelectTrigger className="w-full sm:w-[120px]">
                  <SelectValue placeholder="Year" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">ทุกปี</SelectItem>
                  {uniqueYears.map(year => (
                      <SelectItem key={year} value={year.toString()}>{year}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button variant="outline" onClick={fetchPeriods} title={t('common.refresh')} disabled={loading}>
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </Button>
          </div>

          <div className="overflow-hidden rounded-lg border border-slate-200 dark:border-slate-800">
            {/* The table scrolls inside its own box so the page body never scrolls sideways on a phone. */}
            <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-sm text-left">
              <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400 uppercase text-xs font-semibold">
                <tr>
                  <th className="px-6 py-4 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors" onClick={() => handleSort('name')}>
                    <div className="flex items-center gap-2">ชื่อรหัสงวด <ArrowUpDown className="w-3 h-3" /></div>
                  </th>
                  <th className="px-6 py-4 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors" onClick={() => handleSort('start_date')}>
                    <div className="flex items-center gap-2">วันที่เริ่มต้น <ArrowUpDown className="w-3 h-3" /></div>
                  </th>
                  <th className="px-6 py-4 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors" onClick={() => handleSort('end_date')}>
                     <div className="flex items-center gap-2">วันที่สิ้นสุด <ArrowUpDown className="w-3 h-3" /></div>
                  </th>
                  <th className="px-6 py-4">สถานะ</th>
                  <th className="px-6 py-4 text-right">จัดการ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800 bg-white dark:bg-slate-900">
                {loading ? (
                    Array.from({ length: 5 }).map((_, i) => (
                        <tr key={i}>
                            <td className="px-6 py-4"><Skeleton className="h-4 w-32" /></td>
                            <td className="px-6 py-4"><Skeleton className="h-4 w-24" /></td>
                            <td className="px-6 py-4"><Skeleton className="h-4 w-24" /></td>
                            <td className="px-6 py-4"><Skeleton className="h-6 w-16 rounded-full" /></td>
                            <td className="px-6 py-4"><Skeleton className="h-8 w-8 ml-auto rounded" /></td>
                        </tr>
                    ))
                ) : error ? (
                    <tr>
                        <td colSpan="5" className="px-6 py-12 text-center text-red-500">
                            <div className="flex flex-col items-center gap-2">
                                <AlertCircle className="w-8 h-8" />
                                <p>{error}</p>
                                <Button variant="outline" size="sm" onClick={fetchPeriods} className="mt-2">ลองใหม่</Button>
                            </div>
                        </td>
                    </tr>
                ) : paginatedPeriods.length === 0 ? (
                    <tr>
                        <td colSpan="5" className="px-6 py-12 text-center text-slate-500">
                            <div className="flex flex-col items-center gap-2">
                                <Calendar className="w-8 h-8 opacity-20" />
                                <p>{t('common.noData')}</p>
                            </div>
                        </td>
                    </tr>
                ) : (
                  paginatedPeriods.map((period) => (
                    <tr key={period.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                      <td className="px-6 py-4 font-medium text-slate-900 dark:text-white">
                        {period.name}
                      </td>
                      <td className="px-6 py-4 text-slate-600 dark:text-slate-400">
                        {formatDate(period.start_date)}
                      </td>
                      <td className="px-6 py-4 text-slate-600 dark:text-slate-400">
                        {formatDate(period.end_date)}
                      </td>
                      <td className="px-6 py-4">
                        <Badge className={`${getStatusColor(period.status)} px-3 py-1 font-normal capitalize`}>
                          {getStatusLabel(period.status)}
                        </Badge>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                              <MoreVertical className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            {normalizeStatus(period.status) === VALID_STATUSES.CLOSED ? (
                                <DropdownMenuItem disabled>
                                    <Lock className="w-4 h-4 mr-2" /> {t('payroll.periodLocked')}
                                </DropdownMenuItem>
                            ) : (
                                <>
                                    <DropdownMenuItem onClick={() => openEditModal(period)}>
                                      <Edit className="w-4 h-4 mr-2" /> {t('common.edit')}
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => { setSelectedPeriod(period); setIsCloseModalOpen(true); }}>
                                        <Lock className="w-4 h-4 mr-2" /> ปิดงวด
                                    </DropdownMenuItem>
                                    <DropdownMenuItem className="text-red-600 focus:text-red-600" onClick={() => setDeleteConfirmation({ isOpen: true, id: period.id })}>
                                      <Trash2 className="w-4 h-4 mr-2" /> {t('common.delete')}
                                    </DropdownMenuItem>
                                </>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
            </div>
          </div>

          {/* Pagination Controls */}
          {!loading && !error && paginatedPeriods.length > 0 && (
              <div className="flex items-center justify-between mt-4">
                  <p className="text-sm text-slate-500">
                      แสดง {((currentPage - 1) * itemsPerPage) + 1} ถึง {Math.min(currentPage * itemsPerPage, filteredPeriods.length)} จาก {filteredPeriods.length} รายการ
                  </p>
                  <div className="flex items-center gap-2">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                        disabled={currentPage === 1}
                      >
                          <ChevronLeft className="w-4 h-4" />
                      </Button>
                      <span className="whitespace-nowrap text-sm font-medium px-2">หน้า {currentPage} จาก {totalPages}</span>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                        disabled={currentPage === totalPages}
                      >
                          <ChevronRight className="w-4 h-4" />
                      </Button>
                  </div>
              </div>
          )}
        </CardContent>
      </Card>

      {/* Add Modal */}
      <AddPayrollPeriodModal 
        isOpen={isAddModalOpen} 
        onClose={() => setIsAddModalOpen(false)} 
        onSuccess={handleSuccess} 
      />

      {/* Edit Modal */}
      <EditPayrollPeriodModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        selectedPeriod={selectedPeriod}
        onSuccess={handleSuccess}
      />

      {/* Close Confirmation Modal */}
      <ConfirmationModal 
        isOpen={isCloseModalOpen}
        onClose={() => setIsCloseModalOpen(false)}
        onConfirm={handleClosePeriod}
        title="ยืนยันการปิดงวด?"
        description="คุณแน่ใจหรือไม่ที่จะปิดงวดนี้? หลังจากปิดงวด จะไม่สามารถแก้ไขข้อมูลการคำนวณเงินเดือนในงวดนี้ได้อีก"
        confirmText="ยืนยันปิดงวด"
        cancelText="ยกเลิก"
      />

      {/* Delete Confirmation Modal */}
      <ConfirmationModal 
        isOpen={deleteConfirmation.isOpen}
        onClose={() => setDeleteConfirmation({ isOpen: false, id: null })}
        onConfirm={handleConfirmDelete}
        title="ยืนยันการลบ?"
        description="คุณแน่ใจหรือไม่ที่จะลบงวดการจ่ายนี้? การกระทำนี้ไม่สามารถย้อนกลับได้"
        confirmText="ลบ"
        variant="destructive"
        cancelText="ยกเลิก"
      />

    </div>
  );
};

export default PayrollPeriodsPage;
