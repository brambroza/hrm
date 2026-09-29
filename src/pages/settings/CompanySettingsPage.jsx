
import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Helmet } from 'react-helmet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useToast } from '@/components/ui/use-toast';
import { Loader2, Upload, Building, Save, RotateCcw } from 'lucide-react';
import { usePermission } from '@/hooks/usePermission';
import PermissionGuard from '@/components/PermissionGuard';
import { companyService } from '@/services/companies';
import { useApi } from '@/hooks/useApi';
import { useForm } from '@/hooks/useForm';
import { supabase } from '@/lib/customSupabaseClient';
import { useAuth } from '@/contexts/AuthContext';
import AccessDenied from '@/components/AccessDenied';

const CompanySettingsPage = () => {
  const { t } = useTranslation();
  const { canView } = usePermission();
  const { organizationId } = useAuth();
  const { loading: apiLoading, request } = useApi();
  const [uploading, setUploading] = useState(false);
  const [companyId, setCompanyId] = useState(null);

  const initialValues = {
    name: '',
    logo_url: '',
    address: '',
    phone: '',
    email: '',
    website: '',
    country: '',
    province: '',
    postal_code: '',
    tax_id: '',
    sso_id: '',
    ceo_name: '',
    manager_name: ''
  };

  const validate = (values) => {
    const errors = {};
    if (!values.name) errors.name = t('validation.required');
    if (!values.email) errors.email = t('validation.required');
    if (values.email && !/\S+@\S+\.\S+/.test(values.email)) errors.email = 'Invalid email';
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
    if (canView('company_settings') && organizationId) {
      loadCompanyData();
    }
  }, [organizationId]);

  const loadCompanyData = async () => {
    const { data } = await request(() => companyService.getCompany(organizationId));

   
    if (data) {
      setCompanyId(data.id);
      setValues({
        name: data.name || '',
        logo_url: data.logo_url || '',
        address: data.address || '',
        phone: data.phone || '',
        email: data.email || '',
        website: data.website || '',
        country: data.country || '',
        province: data.province || '',
        postal_code: data.postal_code || '',
        tax_id: data.tax_id || '',
        sso_id: data.sso_id || '',
        ceo_name: data.ceo_name || '',
        manager_name: data.manager_name || ''
      });
    }
  };

  const onSubmit = async (formData) => {
    await request(
      () => companyService.updateCompany({ id: companyId, organizationId, ...formData }),
      null,
      t('messages.savedSuccess')
    );
  };

  const handleLogoUpload = async (e) => {
    try {
      setUploading(true);
      const file = e.target.files[0];
      if (!file) return;

      const fileExt = file.name.split('.').pop();
      const fileName = `company-logo-${Math.random()}.${fileExt}`;
      const filePath = `public/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('site-uploads')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data } = supabase.storage.from('site-uploads').getPublicUrl(filePath);
      setFieldValue('logo_url', data.publicUrl);
      
    } catch (error) {
      console.error(error);
    } finally {
      setUploading(false);
    }
  };

  if (!canView('company_settings')) {
    return <AccessDenied />;
  }

  return (
    <>
      <Helmet>
        <title>{t('settings.companySettings')} - GoAlong HR</title>
      </Helmet>
      
      <div className="space-y-6 max-w-5xl mx-auto">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">{t('settings.companySettings')}</h1>
            <p className="text-slate-500 dark:text-slate-400">Manage your organization's profile and details</p>
          </div>
          <Button variant="outline" onClick={() => resetForm()} disabled={apiLoading}>
            <RotateCcw className="w-4 h-4 mr-2" />
            {t('common.reset')}
          </Button>
        </div>

        <form onSubmit={(e) => { e.preventDefault(); handleSubmit(onSubmit); }}>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Left Column - Logo */}
            <Card className="md:col-span-1 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 h-fit">
              <CardHeader>
                <CardTitle className="text-lg">{t('settings.companyLogo')}</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col items-center">
                <div className="w-48 h-48 rounded-lg border-2 border-dashed border-slate-300 dark:border-slate-700 flex items-center justify-center bg-slate-50 dark:bg-slate-800 mb-4 relative overflow-hidden group">
                  {values.logo_url ? (
                    <img src={values.logo_url} alt="Company Logo" className="w-full h-full object-contain p-2" />
                  ) : (
                    <Building className="w-16 h-16 text-slate-400" />
                  )}
                  <PermissionGuard permission="company_settings" action="edit">
                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity rounded-lg">
                      <label htmlFor="logo-upload" className="cursor-pointer text-white flex flex-col items-center p-4 w-full h-full justify-center">
                        <Upload className="w-8 h-8 mb-2" />
                        <span className="text-sm font-medium">{t('common.upload')}</span>
                      </label>
                    </div>
                  </PermissionGuard>
                </div>
                <PermissionGuard permission="company_settings" action="edit">
                  <input 
                    type="file" 
                    id="logo-upload" 
                    accept="image/*" 
                    className="hidden" 
                    onChange={handleLogoUpload}
                    disabled={uploading}
                  />
                </PermissionGuard>
                {uploading && <p className="text-sm text-blue-500 animate-pulse">Uploading...</p>}
                <p className="text-xs text-slate-500 text-center mt-2">
                  Recommended size: 500x500px<br/>Format: PNG, JPG
                </p>
              </CardContent>
            </Card>

            {/* Right Column - Form */}
            <Card className="md:col-span-2 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
              <CardHeader>
                <CardTitle className="text-lg">General Information</CardTitle>
                <CardDescription>Enter your company's official details</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-2">
                  <Label htmlFor="name">{t('settings.companyName')} <span className="text-red-500">*</span></Label>
                  <Input 
                    id="name" 
                    name="name" 
                    value={values.name} 
                    onChange={handleChange} 
                    className={errors.name ? 'border-red-500' : ''}
                  />
                  {errors.name && <p className="text-xs text-red-500">{errors.name}</p>}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                   <div className="grid gap-2">
                    <Label htmlFor="tax_id">{t('settings.taxId')}</Label>
                    <Input id="tax_id" name="tax_id" value={values.tax_id} onChange={handleChange} />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="sso_id">{t('settings.ssoId')}</Label>
                    <Input id="sso_id" name="sso_id" value={values.sso_id} onChange={handleChange} />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                   <div className="grid gap-2">
                    <Label htmlFor="phone">{t('settings.phone')}</Label>
                    <Input id="phone" name="phone" value={values.phone} onChange={handleChange} />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="email">{t('settings.email')} <span className="text-red-500">*</span></Label>
                    <Input 
                      id="email" 
                      name="email" 
                      value={values.email} 
                      onChange={handleChange} 
                      className={errors.email ? 'border-red-500' : ''}
                    />
                    {errors.email && <p className="text-xs text-red-500">{errors.email}</p>}
                  </div>
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="website">{t('settings.website')}</Label>
                  <Input id="website" name="website" value={values.website} onChange={handleChange} placeholder="https://example.com" />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="address">{t('settings.companyAddress')}</Label>
                  <Input id="address" name="address" value={values.address} onChange={handleChange} />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                   <div className="grid gap-2">
                    <Label htmlFor="country">{t('settings.country')}</Label>
                    <Input id="country" name="country" value={values.country} onChange={handleChange} />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="province">{t('settings.province')}</Label>
                    <Input id="province" name="province" value={values.province} onChange={handleChange} />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="postal_code">{t('settings.postalCode')}</Label>
                    <Input id="postal_code" name="postal_code" value={values.postal_code} onChange={handleChange} />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-slate-100 dark:border-slate-800">
                   <div className="grid gap-2">
                    <Label htmlFor="ceo_name">{t('settings.ceoName')}</Label>
                    <Input id="ceo_name" name="ceo_name" value={values.ceo_name} onChange={handleChange} />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="manager_name">{t('settings.managerName')}</Label>
                    <Input id="manager_name" name="manager_name" value={values.manager_name} onChange={handleChange} />
                  </div>
                </div>

                <div className="flex justify-end pt-4">
                  <PermissionGuard permission="company_settings" action="edit">
                    <Button type="submit" disabled={apiLoading || uploading} className="bg-blue-600 hover:bg-blue-700 w-full sm:w-auto">
                      {apiLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                      {t('common.save')}
                    </Button>
                  </PermissionGuard>
                </div>
              </CardContent>
            </Card>
          </div>
        </form>
      </div>
    </>
  );
};

export default CompanySettingsPage;
