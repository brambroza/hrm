
import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from '@/contexts/AuthContext';
import ThemeProvider from '@/components/ThemeProvider';
import { Toaster } from '@/components/ui/toaster';
import ProtectedRoute from '@/components/ProtectedRoute';
import LandingPage from '@/pages/LandingPage';
import LoginPage from '@/pages/LoginPage';
import RegisterInterestPage from '@/pages/RegisterInterestPage';
import MainLayout from '@/components/MainLayout';
import DashboardPage from '@/pages/DashboardPage';
import EmployeeListPage from '@/pages/EmployeeListPage';
import EmployeeDetailPage from '@/pages/EmployeeDetailPage';
import TimeAttendancePage from '@/pages/TimeAttendancePage';
import AuditLogPage from '@/pages/AuditLogPage';
import SettingsPage from '@/pages/SettingsPage';
import LeaveManagementPage from '@/pages/LeaveManagementPage';
import AllowancesDeductionsPage from '@/pages/payroll/AllowancesDeductionsPage';
import PayrollPeriodsPage from '@/pages/payroll/PayrollPeriodsPage';
import PayrollCalculationPage from '@/pages/payroll/PayrollCalculationPage';
import PayrollSlipsPage from '@/pages/payroll/PayrollSlipsPage';
import PayrollReportsPage from '@/pages/payroll/PayrollReportsPage';
import UserProfilePage from '@/pages/UserProfilePage';
import TranslatePage from '@/pages/TranslatePage';
import UserManagementPage from '@/pages/UserManagementPage';
import CompanySettingsPage from '@/pages/settings/CompanySettingsPage';
import SystemSettingsPage from '@/pages/settings/SystemSettingsPage';
import FeatureUnavailable from '@/components/FeatureUnavailable';
import SetupWizardPage from '@/pages/settings/SetupWizardPage';
import AttendancePolicyPage from '@/pages/settings/AttendancePolicyPage';
import ReportsPage from '@/pages/ReportsPage';
import AttendanceCalculationPage from '@/pages/AttendanceCalculationPage';
import DepartmentManagementPage from '@/pages/settings/DepartmentManagementPage';
import OtRequestPage from '@/pages/OtRequestPage';
import LegalDocumentsPage from '@/pages/LegalDocumentsPage';
import './i18n/config';

function App() {
  return (
    <AuthProvider>
      <ThemeProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/" element={<LandingPage />} />
            <Route path="/register" element={<RegisterInterestPage />} />
            
            <Route
              path="/*"
              element={
                <ProtectedRoute>
                  <MainLayout />
                </ProtectedRoute>
              }
            >
              <Route path="dashboard" element={<DashboardPage />} />
              <Route path="employees" element={<EmployeeListPage />} />
              <Route path="employees/:id" element={<EmployeeDetailPage />} />
              <Route path="attendance" element={<TimeAttendancePage />} />
              <Route path="attendance-calculation" element={<AttendanceCalculationPage />} />
              <Route path="ot-requests" element={<OtRequestPage />} />
              <Route path="leave" element={<LeaveManagementPage />} />
              <Route path="reports" element={<ReportsPage />} />
              <Route path="documents" element={<LegalDocumentsPage />} />
              
              {/* Payroll Routes */}
              <Route path="payroll/setup" element={<AllowancesDeductionsPage />} />
              <Route path="payroll/periods" element={<PayrollPeriodsPage />} />
              <Route path="payroll/calculate" element={<PayrollCalculationPage />} />
              <Route path="payroll/slips" element={<PayrollSlipsPage />} />
              <Route path="payroll/reports" element={<PayrollReportsPage />} />
              
              {/* Settings Routes */}
              <Route path="settings" element={<SettingsPage />} />
              <Route path="settings/company" element={<CompanySettingsPage />} />
              <Route path="settings/departments" element={<DepartmentManagementPage />} />
              <Route path="settings/attendance-policy" element={<AttendancePolicyPage />} />
              <Route path="settings/system" element={<SystemSettingsPage />} />
              <Route path="settings/setup" element={<SetupWizardPage />} />
              {/* IntegrationsPage and BackupRecoveryPage simulated success without doing
                  anything; they stay out of the app until the real features exist. */}
              <Route path="settings/integrations" element={<FeatureUnavailable titleKey="settings.integrations" messageKey="featureUnavailable.integrations" />} />
              <Route path="settings/backup" element={<FeatureUnavailable titleKey="settings.backupRecovery" messageKey="featureUnavailable.backup" />} />
              <Route path="settings/audit-log" element={<AuditLogPage />} />
              <Route path="settings/users" element={<UserManagementPage />} />
              <Route path="settings/translate" element={<TranslatePage />} />
              
              <Route path="profile" element={<UserProfilePage />} />
            </Route>
          </Routes>
          <Toaster />
        </BrowserRouter>
      </ThemeProvider>
    </AuthProvider>
  );
}

export default App;
