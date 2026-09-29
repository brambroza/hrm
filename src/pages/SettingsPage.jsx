
import React from 'react';
import { motion } from 'framer-motion';
import { ListChecks, Building2, Users, Settings as SettingsIcon, Database, Link as LinkIcon, FileText, Globe, Clock, LayoutGrid } from 'lucide-react';
import { Helmet } from 'react-helmet';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { usePermission } from '@/hooks/usePermission';
import AccessDenied from '@/components/AccessDenied';

const SettingsPage = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { canView } = usePermission();
  
  const settingsSections = [
    {
      icon: ListChecks,
      title: t('setup.title'),
      description: t('setup.cardDescription'),
      path: '/settings/setup',
      color: 'bg-emerald-100 text-emerald-700',
      permission: 'system_settings'
    },
    {
      icon: Building2,
      title: t('settings.companySettings'),
      description: 'Manage company information, logo, and general settings',
      path: '/settings/company',
      color: 'bg-blue-100 text-blue-600',
      permission: 'company_settings'
    },
    {
      icon: SettingsIcon,
      title: t('settings.systemConfig'),
      description: 'Configure system preferences, notifications, and working hours',
      path: '/settings/system',
      color: 'bg-purple-100 text-purple-600',
      permission: 'system_settings'
    },
    {
      icon: LayoutGrid,
      title: t('settings.departmentManagement'),
      description: 'Create and manage departments for the organization',
      path: '/settings/departments',
      color: 'bg-amber-100 text-amber-600',
      permission: 'department'
    },
    {
      icon: Clock,
      title: t('settings.attendancePolicy'),
      description: 'Set late, OT, and missing scan policies',
      path: '/settings/attendance-policy',
      color: 'bg-amber-100 text-amber-600',
      permission: 'attendance_policy'
    },
    {
      icon: Users,
      title: t('settings.userManagement'),
      description: 'Manage user accounts, roles, and permissions (RBAC)',
      path: '/settings/users',
      color: 'bg-orange-100 text-orange-600',
      permission: 'user_management'
    },
    {
      icon: Globe,
      title: t('settings.manageTranslations'),
      description: 'Edit and manage language translations',
      path: '/settings/translate',
      color: 'bg-teal-100 text-teal-600',
      permission: 'translate'
    },
    {
      icon: FileText,
      title: t('settings.auditLog'),
      description: 'View system audit logs and user activities',
      path: '/settings/audit-log',
      color: 'bg-pink-100 text-pink-600',
      permission: 'audit_log'
    }
  ];

  if (!canView('settings')) {
    return <AccessDenied />;
  }

  return (
    <>
      <Helmet>
        <title>{t('common.settings')} - HRM System</title>
      </Helmet>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">{t('common.settings')}</h1>
          <p className="text-slate-500 dark:text-slate-400">Manage system settings and configurations</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {settingsSections.map((section, index) => {
            if (section.permission && !canView(section.permission)) return null;
            
            const Icon = section.icon;
            return (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                onClick={() => navigate(section.path)}
                className="bg-white dark:bg-slate-900 rounded-xl p-6 border border-slate-200 dark:border-slate-800 hover:border-blue-400 dark:hover:border-blue-500 hover:shadow-md cursor-pointer transition-all group"
              >
                <div className={`w-12 h-12 rounded-lg flex items-center justify-center mb-4 transition-transform group-hover:scale-110 ${section.color}`}>
                  <Icon className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">{section.title}</h3>
                <p className="text-slate-500 dark:text-slate-400 text-sm">{section.description}</p>
              </motion.div>
            );
          })}
        </div>
      </div>
    </>
  );
};

export default SettingsPage;
