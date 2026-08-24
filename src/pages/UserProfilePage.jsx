import React, { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/customSupabaseClient';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useTranslation } from 'react-i18next';
import { Helmet } from 'react-helmet';
import { User, Mail, Phone, MapPin, Briefcase, Shield, Settings, Building } from 'lucide-react';
import UserProfileModal from '@/components/UserProfileModal';
import ChangePasswordModal from '@/components/ChangePasswordModal';
import { companyService } from '@/services/companies';

const UserProfilePage = () => {
  const { t } = useTranslation();
  const { user, organizationId } = useAuth();
  const [profile, setProfile] = useState(null);
  const [company, setCompany] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);

  const fetchProfile = async () => {
    if (!user) return;
    const { data } = await supabase
      .from('users')
      .select('*')
      .eq('id', user.id)
      .single();
    setProfile(data);
  };

  useEffect(() => {
    fetchProfile();
  }, [user]);

  useEffect(() => {
    const fetchCompany = async () => {
      if (!organizationId) return;
      try {
        const data = await companyService.getCompany(organizationId);
        setCompany(data);
      } catch (error) {
        console.error('Failed to load company profile:', error);
      }
    };
    fetchCompany();
  }, [organizationId]);

  return (
    <>
      <Helmet>
        <title>{t('userProfile.profile')} - HRM System</title>
      </Helmet>
      
      <div className="space-y-6 max-w-4xl mx-auto">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">{t('userProfile.profile')}</h1>
          <p className="text-slate-500 dark:text-slate-400">{t('userProfile.subtitle')}</p>
        </div>

        <Card className="border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xl font-bold">{t('userProfile.basicInfo')}</CardTitle>
            <div className="flex gap-2">
              <Button onClick={() => setShowEditModal(true)} variant="outline" size="sm">
                <Settings className="w-4 h-4 mr-2" />
                {t('common.edit')}
              </Button>
            </div>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="flex flex-col md:flex-row gap-8 items-start">
              <div className="flex flex-col items-center gap-4">
                <Avatar className="h-32 w-32 border-4 border-slate-100 dark:border-slate-800">
                  <AvatarImage src={profile?.avatar_url} />
                <AvatarFallback className="text-2xl bg-slate-200 dark:bg-slate-800">
                  {profile?.full_name?.charAt(0) || user?.email?.charAt(0)}
                </AvatarFallback>
              </Avatar>
              <div className="text-center">
                <p className="text-sm font-medium text-slate-500 dark:text-slate-400">{t('userProfile.role')}</p>
                <p className="font-semibold text-emerald-600 dark:text-emerald-400">{profile?.role || 'User'}</p>
              </div>
            </div>

            <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-6 w-full">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 text-sm">
                    <User className="w-4 h-4" />
                    {t('userProfile.fullName')}
                  </div>
                  <p className="font-medium text-slate-900 dark:text-white">{profile?.full_name || '-'}</p>
                </div>

                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 text-sm">
                    <Mail className="w-4 h-4" />
                    {t('employees.email')}
                  </div>
                  <p className="font-medium text-slate-900 dark:text-white">{user?.email}</p>
                </div>

                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 text-sm">
                    <Phone className="w-4 h-4" />
                    {t('userProfile.phone')}
                  </div>
                  <p className="font-medium text-slate-900 dark:text-white">{profile?.phone || '-'}</p>
                </div>

                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 text-sm">
                    <MapPin className="w-4 h-4" />
                    {t('userProfile.address')}
                  </div>
                  <p className="font-medium text-slate-900 dark:text-white">{profile?.address || '-'}</p>
                </div>

                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 text-sm">
                    <Building className="w-4 h-4" />
                    {t('settings.companyName')}
                  </div>
                  <p className="font-medium text-slate-900 dark:text-white">{company?.name || '-'}</p>
                </div>

                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 text-sm">
                    <Briefcase className="w-4 h-4" />
                    {t('userProfile.position')}
                  </div>
                  <p className="font-medium text-slate-900 dark:text-white">{profile?.position || '-'}</p>
                </div>

                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 text-sm">
                    <Shield className="w-4 h-4" />
                    {t('common.status')}
                  </div>
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    profile?.status === 'active' 
                      ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                      : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
                  }`}>
                    {profile?.status || 'Active'}
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
           <CardHeader>
             <CardTitle className="text-lg font-bold">{t('userProfile.security')}</CardTitle>
           </CardHeader>
           <CardContent>
             <div className="flex items-center justify-between">
                <div>
                   <p className="font-medium text-slate-900 dark:text-white">{t('userProfile.password')}</p>
                   <p className="text-sm text-slate-500 dark:text-slate-400">{t('userProfile.lastChanged')}</p>
                </div>
                <Button variant="outline" onClick={() => setShowPasswordModal(true)}>
                   {t('userProfile.changePassword')}
                </Button>
             </div>
           </CardContent>
        </Card>
      </div>

      <UserProfileModal 
        isOpen={showEditModal} 
        onClose={() => setShowEditModal(false)}
        user={profile || { id: user?.id, email: user?.email }}
        onUpdate={fetchProfile}
      />

      <ChangePasswordModal 
        isOpen={showPasswordModal} 
        onClose={() => setShowPasswordModal(false)} 
      />
    </>
  );
};

export default UserProfilePage;
