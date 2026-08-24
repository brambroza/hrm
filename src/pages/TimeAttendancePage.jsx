
import React from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Helmet } from 'react-helmet';
import ShiftSetupTab from '@/components/ShiftSetupTab';
import AttendanceLogTab from '@/components/AttendanceLogTab';
import ShiftAssignmentTab from '@/components/ShiftAssignmentTab';
import { useTranslation } from 'react-i18next';
import { usePermission } from '@/hooks/usePermission';
import PermissionGuard from '@/components/PermissionGuard';
import { Button } from '@/components/ui/button';
import { Plus, Download } from 'lucide-react';
import AccessDenied from '@/components/AccessDenied';

const TimeAttendancePage = () => {
  const { t } = useTranslation();
  const { canView } = usePermission();

  if (!canView('time_attendance')) {
    return <AccessDenied />;
  }

  return (
    <>
      <Helmet>
        <title>{t('common.attendance')} - HRM System</title>
        <meta name="description" content="Time and Attendance Management" />
      </Helmet>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">{t('common.attendance')}</h1>
            <p className="text-slate-500 dark:text-slate-400">Manage shifts, attendance logs, and assignments</p>
          </div>
          <div className="flex gap-2">
            <PermissionGuard permission="time_attendance" action="add">
              <Button className="bg-blue-600 hover:bg-blue-700">
                <Plus className="w-4 h-4 mr-2" />
                {t('common.add')}
              </Button>
            </PermissionGuard>
            <PermissionGuard permission="time_attendance" action="export">
              <Button variant="outline">
                <Download className="w-4 h-4 mr-2" />
                {t('common.export')}
              </Button>
            </PermissionGuard>
          </div>
        </div>

        <Tabs defaultValue="attendance" className="w-full">
          <TabsList className="bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-1">
            <TabsTrigger value="attendance" className="data-[state=active]:bg-black dark:data-[state=active]:bg-slate-900 data-[state=active]:shadow-sm">{t('attendance.attendanceLog')}</TabsTrigger>
            <TabsTrigger value="shifts" className="data-[state=active]:bg-black dark:data-[state=active]:bg-slate-900 data-[state=active]:shadow-sm">{t('attendance.shiftSetup')}</TabsTrigger>
            <TabsTrigger value="assignments" className="data-[state=active]:bg-black dark:data-[state=active]:bg-slate-900 data-[state=active]:shadow-sm">{t('attendance.shiftAssignment')}</TabsTrigger>
          </TabsList>

          <TabsContent value="attendance">
            <AttendanceLogTab />
          </TabsContent>

          <TabsContent value="shifts">
            <ShiftSetupTab />
          </TabsContent>

          <TabsContent value="assignments">
            <ShiftAssignmentTab />
          </TabsContent>
        </Tabs>
      </div>
    </>
  );
};

export default TimeAttendancePage;
