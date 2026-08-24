import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/customSupabaseClient';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { motion } from 'framer-motion';
import { ArrowLeft, Edit } from 'lucide-react';
import EditEmployeeModal from '@/components/EditEmployeeModal';
import { Helmet } from 'react-helmet';
import { formatThaiDate, formatThaiTime } from '@/utils/helpers';

const EmployeeDetailPage = () => {
  const { t } = useTranslation();
  const { id } = useParams();
  const navigate = useNavigate();
  const [employee, setEmployee] = useState(null);
  const [attendanceHistory, setAttendanceHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showEditModal, setShowEditModal] = useState(false);

  useEffect(() => {
    fetchEmployeeData();
  }, [id]);

  const fetchEmployeeData = async () => {
    setLoading(true);
    
    const { data: empData, error: empError } = await supabase
      .from('employees')
      .select('*')
      .eq('id', id)
      .single();

    if (!empError && empData) {
      setEmployee(empData);
      
      const { data: attData } = await supabase
        .from('attendance_logs')
        .select('*')
        .eq('employee_id', id)
        .order('log_date', { ascending: false })
        .limit(30);
      
      setAttendanceHistory(attData || []);
    }
    
    setLoading(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (!employee) {
    return (
      <div className="text-center py-12">
        <p className="text-slate-400">{t('employees.notFound')}</p>
        <Button onClick={() => navigate('/employees')} className="mt-4">
          Go Back
        </Button>
      </div>
    );
  }

  return (
    <>
      <Helmet>
        <title>{employee.name_th || employee.name} - Employee Detail</title>
        <meta name="description" content="Employee details" />
      </Helmet>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button onClick={() => navigate('/employees')} variant="ghost" className="text-white hover:bg-slate-800">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-white">{employee.name_th || employee.name}</h1>
              <p className="text-slate-400">{employee.employee_id}</p>
            </div>
          </div>
          <Button onClick={() => setShowEditModal(true)} className="bg-blue-500 hover:bg-blue-600">
            <Edit className="w-4 h-4 mr-2" />
            Edit
          </Button>
        </div>

        <Tabs defaultValue="basic" className="w-full">
          <TabsList className="bg-slate-900 border border-slate-800">
            <TabsTrigger value="basic" className="data-[state=active]:bg-blue-500">{t('employees.basicInfo')}</TabsTrigger>
            <TabsTrigger value="employment" className="data-[state=active]:bg-blue-500">{t('employees.employment')}</TabsTrigger>
            <TabsTrigger value="migrant" className="data-[state=active]:bg-blue-500">{t('employees.migrantDocuments')}</TabsTrigger>
            <TabsTrigger value="attendance" className="data-[state=active]:bg-blue-500">{t('employees.attendanceHistory')}</TabsTrigger>
          </TabsList>

          <TabsContent value="basic">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-slate-900 rounded-xl p-6 border border-slate-800"
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <InfoItem label="Name (Thai)" value={employee.name_th} />
                <InfoItem label="Name (English)" value={employee.name_en} />
                <InfoItem label="Gender" value={employee.gender} />
                <InfoItem label="Birthdate" value={employee.birthdate ? formatThaiDate(employee.birthdate) : 'N/A'} />
                <InfoItem label="Phone" value={employee.phone} />
                <InfoItem label="Email" value={employee.email} />
                <InfoItem label="National ID" value={employee.national_id} />
                <InfoItem label="Nationality" value={employee.nationality} />
              </div>
            </motion.div>
          </TabsContent>

          <TabsContent value="employment">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-slate-900 rounded-xl p-6 border border-slate-800"
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <InfoItem label="Employee ID" value={employee.employee_id} />
                <InfoItem label="Employment Type" value={employee.employment_type} />
                <InfoItem label="Status" value={employee.status} />
                <InfoItem label="Branch" value={employee.branch} />
                <InfoItem label="Department" value={employee.department} />
                <InfoItem label="Position" value={employee.position} />
                <InfoItem label="Start Date" value={employee.start_date ? formatThaiDate(employee.start_date) : 'N/A'} />
                <InfoItem label="Salary" value={employee.salary ? `฿${employee.salary.toLocaleString()}` : 'N/A'} />
              </div>
            </motion.div>
          </TabsContent>

          <TabsContent value="migrant">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-slate-900 rounded-xl p-6 border border-slate-800"
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <InfoItem label="Passport Number" value={employee.passport_number} />
                <InfoItem label="Work Permit Number" value={employee.work_permit_number} />
                <InfoItem label="Work Permit Expiry" value={employee.work_permit_expiry ? formatThaiDate(employee.work_permit_expiry) : 'N/A'} />
                <InfoItem label="90-Day Report Date" value={employee.ninety_day_report_date ? formatThaiDate(employee.ninety_day_report_date) : 'N/A'} />
                <InfoItem label="Migrant Group" value={employee.migrant_group} />
                <InfoItem label="CI/BT Number" value={employee.ci_bt_number} />
                <InfoItem label="Origin Country" value={employee.origin_country} />
              </div>
            </motion.div>
          </TabsContent>

          <TabsContent value="attendance">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-slate-900 rounded-xl border border-slate-800 overflow-hidden"
            >
              <div className="overflow-x-auto">
                <table className="w-full min-w-[720px]">
                  <thead className="bg-slate-800">
                    <tr>
                      <th className="px-6 py-4 text-left text-sm font-medium text-slate-300">{t('common.date')}</th>
                      <th className="px-6 py-4 text-left text-sm font-medium text-slate-300">{t('attendanceCalc.checkIn')}</th>
                      <th className="px-6 py-4 text-left text-sm font-medium text-slate-300">{t('attendanceCalc.checkOut')}</th>
                      <th className="px-6 py-4 text-left text-sm font-medium text-slate-300">{t('employees.hours')}</th>
                      <th className="px-6 py-4 text-left text-sm font-medium text-slate-300">{t('common.status')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {attendanceHistory.map((att) => (
                      <tr key={att.id}>
                        <td className="px-6 py-4 text-sm text-white">{formatThaiDate(att.log_date)}</td>
                        <td className="px-6 py-4 text-sm text-slate-300">
                          {att.check_in ? formatThaiTime(att.check_in) : '-'}
                        </td>
                        <td className="px-6 py-4 text-sm text-slate-300">
                          {att.check_out ? formatThaiTime(att.check_out) : '-'}
                        </td>
                        <td className="px-6 py-4 text-sm text-slate-300">{att.hours_worked || '-'}</td>
                        <td className="px-6 py-4 text-sm">
                          <span className={`px-2 py-1 rounded-full text-xs ${
                            att.status === 'normal' ? 'bg-green-500/20 text-green-400' :
                            att.status === 'late' ? 'bg-yellow-500/20 text-yellow-400' :
                            'bg-red-500/20 text-red-400'
                          }`}>
                            {att.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {attendanceHistory.length === 0 && (
                <div className="text-center py-8 text-slate-400">
                  No attendance records found
                </div>
              )}
            </motion.div>
          </TabsContent>
        </Tabs>
      </div>

      {showEditModal && (
        <EditEmployeeModal
          isOpen={showEditModal}
          onClose={() => setShowEditModal(false)}
          employee={employee}
          onSuccess={fetchEmployeeData}
        />
      )}
    </>
  );
};

const InfoItem = ({ label, value }) => (
  <div>
    <p className="text-sm text-slate-400 mb-1">{label}</p>
    <p className="text-white font-medium">{value || 'N/A'}</p>
  </div>
);

export default EmployeeDetailPage;
