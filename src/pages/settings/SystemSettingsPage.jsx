
import React, { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Helmet } from 'react-helmet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Bell, Clock, Wallet, Save, RotateCcw } from 'lucide-react';
import { usePermission } from '@/hooks/usePermission';
import PermissionGuard from '@/components/PermissionGuard';
import { systemSettingsService } from '@/services/systemSettings';
import { useApi } from '@/hooks/useApi';
import { useForm } from '@/hooks/useForm';
import AccessDenied from '@/components/AccessDenied';

const SystemSettingsPage = () => {
  const { t } = useTranslation();
  const { canView } = usePermission();
  const { loading: apiLoading, request } = useApi();

  const daysOfWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

  const initialValues = {
    notification_email: true,
    notification_sms: false,
    notification_in_app: true,
    working_days: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
    work_start_time: '09:00',
    work_end_time: '18:00',
    lunch_break_start: '12:00',
    lunch_break_end: '13:00',
    payroll_date: 25,
    payment_method: 'bank_transfer',
    default_bank: ''
  };

  const validate = (values) => {
    const errors = {};
    if (!values.work_start_time) errors.work_start_time = 'Required';
    if (!values.work_end_time) errors.work_end_time = 'Required';
    return errors;
  };

  const {
    values,
    errors,
    handleChange,
    setFieldValue,
    handleSubmit,
    setValues,
    resetForm
  } = useForm(initialValues, validate);

  useEffect(() => {
    if (canView('system_settings')) {
      loadSettings();
    }
  }, []);

  const loadSettings = async () => {
    try {
      const { data } = await request(systemSettingsService.getSystemSettings);
      if (data) {
        setValues({
          ...initialValues,
          ...data,
          // Ensure working_days is always an array to prevent .includes() errors
          working_days: Array.isArray(data.working_days) ? data.working_days : initialValues.working_days,
        });
      }
    } catch (error) {
      console.error("Failed to load system settings:", error);
      // Form remains in initial state if loading fails
    }
  };

  const onSubmit = async (formData) => {
    await request(
      () => systemSettingsService.updateSystemSettings(formData),
      null,
      t('messages.savedSuccess')
    );
    // Reload to ensure we have the latest state (including ID if it was just created)
    loadSettings();
  };

  const handleDayToggle = (day) => {
    const currentDays = Array.isArray(values.working_days) ? values.working_days : [];
    const newDays = currentDays.includes(day)
      ? currentDays.filter(d => d !== day)
      : [...currentDays, day];
    setFieldValue('working_days', newDays);
  };

  if (!canView('system_settings')) return <AccessDenied />;

  return (
    <>
      <Helmet>
        <title>{t('settings.systemConfig')} - HRM System</title>
      </Helmet>
      
      <div className="space-y-6 max-w-4xl mx-auto">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">{t('settings.systemConfig')}</h1>
            <p className="text-slate-500 dark:text-slate-400">Configure global system preferences</p>
          </div>
          <Button variant="outline" onClick={() => resetForm()} disabled={apiLoading}>
            <RotateCcw className="w-4 h-4 mr-2" />
            {t('common.reset')}
          </Button>
        </div>

        <form onSubmit={(e) => { e.preventDefault(); handleSubmit(onSubmit); }} className="space-y-6">
          {/* Notifications */}
          <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-sm">
            <CardHeader className="flex flex-row items-center gap-4">
              <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600">
                <Bell className="w-5 h-5" />
              </div>
              <div>
                <CardTitle>{t('settings.notificationSettings')}</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-3 border rounded-lg bg-slate-50 dark:bg-slate-800/50">
                <Label htmlFor="notification_email">{t('settings.emailNotif')}</Label>
                <Checkbox 
                  id="notification_email"
                  checked={!!values.notification_email} 
                  onCheckedChange={(c) => setFieldValue('notification_email', c)} 
                />
              </div>
              <div className="flex items-center justify-between p-3 border rounded-lg bg-slate-50 dark:bg-slate-800/50">
                <Label htmlFor="notification_sms">{t('settings.smsNotif')}</Label>
                <Checkbox 
                  id="notification_sms"
                  checked={!!values.notification_sms} 
                  onCheckedChange={(c) => setFieldValue('notification_sms', c)} 
                />
              </div>
              <div className="flex items-center justify-between p-3 border rounded-lg bg-slate-50 dark:bg-slate-800/50">
                <Label htmlFor="notification_in_app">{t('settings.inAppNotif')}</Label>
                <Checkbox 
                  id="notification_in_app"
                  checked={!!values.notification_in_app} 
                  onCheckedChange={(c) => setFieldValue('notification_in_app', c)} 
                />
              </div>
            </CardContent>
          </Card>

          {/* Working Hours */}
          <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-sm">
             <CardHeader className="flex flex-row items-center gap-4">
              <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center text-green-600">
                <Clock className="w-5 h-5" />
              </div>
              <div>
                <CardTitle>{t('settings.workingHours')}</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <Label className="mb-3 block text-sm font-medium">{t('settings.workingDays')}</Label>
                <div className="flex flex-wrap gap-2">
                  {daysOfWeek.map(day => (
                    <button
                      key={day}
                      type="button"
                      onClick={() => handleDayToggle(day)}
                      className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
                        (values.working_days || []).includes(day)
                          ? 'bg-blue-600 text-white shadow-md'
                          : 'bg-slate-100 text-slate-500 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-400'
                      }`}
                    >
                      {day}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label>{t('settings.workStartTime')}</Label>
                  <Input type="time" name="work_start_time" value={values.work_start_time || ''} onChange={handleChange} />
                  {errors.work_start_time && <p className="text-xs text-red-500">{errors.work_start_time}</p>}
                </div>
                <div className="space-y-2">
                  <Label>{t('settings.workEndTime')}</Label>
                  <Input type="time" name="work_end_time" value={values.work_end_time || ''} onChange={handleChange} />
                  {errors.work_end_time && <p className="text-xs text-red-500">{errors.work_end_time}</p>}
                </div>
                <div className="space-y-2">
                  <Label>{t('settings.lunchBreakStart')}</Label>
                  <Input type="time" name="lunch_break_start" value={values.lunch_break_start || ''} onChange={handleChange} />
                </div>
                <div className="space-y-2">
                  <Label>{t('settings.lunchBreakEnd')}</Label>
                  <Input type="time" name="lunch_break_end" value={values.lunch_break_end || ''} onChange={handleChange} />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Payroll */}
          <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-sm">
             <CardHeader className="flex flex-row items-center gap-4">
              <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center text-purple-600">
                <Wallet className="w-5 h-5" />
              </div>
              <div>
                <CardTitle>{t('settings.payrollSettings')}</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label>{t('settings.payrollDate')}</Label>
                  <Select 
                    value={values.payroll_date ? String(values.payroll_date) : "25"} 
                    onValueChange={(val) => setFieldValue('payroll_date', parseInt(val))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select date" />
                    </SelectTrigger>
                    <SelectContent>
                      {[...Array(28)].map((_, i) => (
                        <SelectItem key={i + 1} value={String(i + 1)}>
                          Day {i + 1}
                        </SelectItem>
                      ))}
                      <SelectItem value="30">Last day of month</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>{t('settings.paymentMethod')}</Label>
                  <Select 
                    value={values.payment_method || 'bank_transfer'} 
                    onValueChange={(val) => setFieldValue('payment_method', val)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                      <SelectItem value="cash">Cash</SelectItem>
                      <SelectItem value="cheque">Cheque</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label>{t('settings.defaultBank')}</Label>
                <Input name="default_bank" value={values.default_bank || ''} onChange={handleChange} placeholder="Bank Name" />
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-end pt-4 sticky bottom-0 bg-slate-50 dark:bg-slate-950 p-4 border-t border-slate-200 dark:border-slate-800 -mx-4 -mb-4 lg:mx-0 lg:mb-0 lg:p-0 lg:bg-transparent lg:border-t-0 z-10">
            <PermissionGuard permission="system_settings" action="edit">
              <Button type="submit" disabled={apiLoading} className="bg-blue-600 hover:bg-blue-700 w-full sm:w-auto shadow-lg shadow-blue-500/20">
                {apiLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                {t('common.save')}
              </Button>
            </PermissionGuard>
          </div>
        </form>
      </div>
    </>
  );
};

export default SystemSettingsPage;
