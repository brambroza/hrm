
import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { fetchAllRows } from '@/services/queries';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { motion } from 'framer-motion';
import { Plus, Search, Download, Edit, Trash2, Eye } from 'lucide-react';
import AddEmployeeModal from '@/components/AddEmployeeModal';
import EditEmployeeModal from '@/components/EditEmployeeModal';
import ConfirmationModal from '@/components/ConfirmationModal';
import PermissionGuard from '@/components/PermissionGuard';
import { exportToExcel, getThaiISODate, logAuditTrail } from '@/utils/helpers';
import { Helmet } from 'react-helmet';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { usePermission } from '@/hooks/usePermission';
import { useAuth } from '@/contexts/AuthContext';
import { departmentService } from '@/services/departments';
import AccessDenied from '@/components/AccessDenied';

const EmployeeListPage = () => {
  const { t } = useTranslation();
  const { canView } = usePermission();
  const { user } = useAuth();

  const [employees, setEmployees] = useState([]);
  const [filteredEmployees, setFilteredEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterDepartment, setFilterDepartment] = useState('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  
  // Confirmation Modal State
  const [deleteId, setDeleteId] = useState(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [departments, setDepartments] = useState([]);

  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    if (canView('employee')) {
      fetchEmployees();
      fetchDepartments();
    } else {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    filterData();
  }, [searchTerm, filterStatus, filterDepartment, employees]);

  const fetchEmployees = async () => {
    setLoading(true);
    // Only the columns the list shows. Salary and national ID stay on the
    // server until someone opens a record. Read page by page so the list is
    // complete past 1,000 employees.
    const { data, error } = await fetchAllRows(() =>
      supabase
        .from('employees')
        .select('id, employee_id, name, name_th, name_en, position, department, status, start_date, photo_url, created_at')
        .order('created_at', { ascending: false })
        .order('id')
    );

    if (error) {
      toast({
        variant: 'destructive',
        title: t('common.error'),
        description: error.message
      });
    } else {
      setEmployees(data || []);
    }
    setLoading(false);
  };

  const fetchDepartments = async () => {
    try {
      const data = await departmentService.getDepartments();
      setDepartments(data || []);
    } catch (error) {
      console.error('Failed to load departments:', error);
    }
  };

  const filterData = () => {
    let filtered = employees;

    if (filterStatus !== 'all') {
      filtered = filtered.filter(e => e.status === filterStatus);
    }

    if (filterDepartment !== 'all') {
      filtered = filtered.filter(e => e.department === filterDepartment);
    }

    if (searchTerm) {
      filtered = filtered.filter(e =>
        e.name_th?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        e.name_en?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        e.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        e.employee_id?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        e.department?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    setFilteredEmployees(filtered);
  };

  /**
   * Open the edit form with the full, current record. The list holds only the
   * columns it displays, and editing from a partial or stale row would write
   * blanks over salary and ID fields.
   * @param {string} id - Employee row id.
   */
  const openEdit = async (id) => {
    const { data, error } = await supabase
      .from('employees')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error || !data) {
      toast({
        variant: 'destructive',
        title: t('common.error'),
        description: error?.message || t('employees.notFound')
      });
      return;
    }

    setSelectedEmployee(data);
    setShowEditModal(true);
  };

  const confirmDelete = (id) => {
    setDeleteId(id);
    setShowDeleteConfirm(true);
  };

  const handleDelete = async () => {
    if (!deleteId) return;

    const oldEmployee = employees.find(emp => emp.id === deleteId) || null;

    const { error } = await supabase
      .from('employees')
      .update({ status: 'resigned', end_date: getThaiISODate() })
      .eq('id', deleteId);

    if (error) {
      toast({
        variant: 'destructive',
        title: t('common.error'),
        description: 'Failed to delete employee'
      });
    } else {
      if (oldEmployee) {
        await logAuditTrail(
          user?.id || null,
          'UPDATE',
          'employees',
          deleteId,
          oldEmployee,
          { ...oldEmployee, status: 'resigned' }
        );
      }
      toast({
        title: t('common.success'),
        description: 'Employee marked as resigned'
      });
      fetchEmployees();
    }
    setDeleteId(null);
  };

  const handleExport = () => {
    const exportData = filteredEmployees.map(e => ({
      [t('employees.employeeId')]: e.employee_id,
      [t('employees.name')]: e.name_th || e.name_en || e.name,
      [t('employees.position')]: e.position,
      [t('employees.department')]: e.department,
      [t('common.status')]: e.status,
      [t('employees.startDate')]: e.start_date
    }));
    exportToExcel(exportData, 'employees');
  };

  if (!canView('employee')) {
    return <AccessDenied />;
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <>
      <Helmet>
        <title>{t('common.employees')} - GoAlong HR</title>
        <meta name="description" content="Employee Management" />
      </Helmet>
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">{t('common.employees')}</h1>
            <p className="text-slate-500 dark:text-slate-400">{filteredEmployees.length} employees found</p>
          </div>
          <PermissionGuard permission="employee" action="add">
            <Button onClick={() => setShowAddModal(true)} className="bg-blue-600 hover:bg-blue-700">
              <Plus className="w-4 h-4 mr-2" />
              {t('employees.addEmployee')}
            </Button>
          </PermissionGuard>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              type="text"
              placeholder={t('common.search') + "..."}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="resigned">Resigned</option>
            <option value="terminated">Terminated</option>
          </select>
          <select
            value={filterDepartment}
            onChange={(e) => setFilterDepartment(e.target.value)}
            className="px-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Departments</option>
            {departments.map((dept) => (
              <option key={dept.id} value={dept.name}>
                {dept.name}
              </option>
            ))}
          </select>
          <PermissionGuard permission="employee" action="export">
            <Button onClick={handleExport} variant="outline" className="border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300">
              <Download className="w-4 h-4 mr-2" />
              {t('common.export')}
            </Button>
          </PermissionGuard>
        </div>

        {/* Table */}
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px]">
              <thead className="bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase">{t('employees.employeeId')}</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase">{t('employees.name')}</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase">{t('employees.position')}</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase">{t('employees.department')}</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase">{t('common.status')}</th>
                  <th className="px-6 py-4 text-center text-xs font-semibold text-slate-500 uppercase">{t('common.actions')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredEmployees.map((employee) => (
                  <motion.tr
                    key={employee.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                  >
                    <td className="px-6 py-4 text-sm text-slate-900 dark:text-white font-medium">{employee.employee_id}</td>
                    <td className="px-6 py-4 text-sm text-slate-900 dark:text-white">{employee.name_th || employee.name_en || employee.name}</td>
                    <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-300">{employee.position}</td>
                    <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-300">{employee.department}</td>
                    <td className="px-6 py-4 text-sm">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        employee.status === 'active' 
                          ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' 
                          : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                      }`}>
                        {employee.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <div className="flex items-center justify-center gap-2">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => navigate(`/employees/${employee.id}`)}
                          className="text-blue-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20"
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                        <PermissionGuard permission="employee" action="edit">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              openEdit(employee.id);
                            }}
                            className="text-amber-500 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-900/20"
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                        </PermissionGuard>
                        <PermissionGuard permission="employee" action="delete">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => confirmDelete(employee.id)}
                            className="text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </PermissionGuard>
                      </div>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {filteredEmployees.length === 0 && (
          <div className="text-center py-12 text-slate-400">
            No employees found
          </div>
        )}
      </div>

      <AddEmployeeModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onSuccess={fetchEmployees}
      />

      {selectedEmployee && (
        <EditEmployeeModal
          isOpen={showEditModal}
          onClose={() => {
            setShowEditModal(false);
            setSelectedEmployee(null);
          }}
          employee={selectedEmployee}
          onSuccess={fetchEmployees}
        />
      )}

      <ConfirmationModal
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={handleDelete}
        title={t('common.delete')}
        description={t('employees.confirmResign')}
        confirmText={t('common.confirm')}
        variant="destructive"
      />
    </>
  );
};

export default EmployeeListPage;
