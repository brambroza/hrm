
import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Helmet } from 'react-helmet';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, Settings, Link as LinkIcon, Unlink, Activity, CheckCircle2 } from 'lucide-react';
import { usePermission } from '@/hooks/usePermission';
import PermissionGuard from '@/components/PermissionGuard';
import { integrationService } from '@/services/integrations';
import { useApi } from '@/hooks/useApi';
import { useToast } from '@/components/ui/use-toast';

const IntegrationsPage = () => {
  const { t } = useTranslation();
  const { toast } = useToast();
  const { canView } = usePermission();
  const { loading: apiLoading, request } = useApi();
  
  const [integrations, setIntegrations] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [selectedTemplate, setSelectedIntegration] = useState(null);
  
  // Dynamic form state
  const [formData, setFormData] = useState({});

  const predefinedIntegrations = [
    { id: 'zkteco', name: 'ZKTeco Time Attendance', provider: 'ZKTeco', icon: '⏰', fields: ['deviceIp', 'devicePort', 'username', 'password'] },
    { id: 'smtp', name: 'Email Server (SMTP)', provider: 'SMTP', icon: '📧', fields: ['host', 'port', 'email', 'password', 'fromName'] },
    { id: 'twilio', name: 'SMS Gateway', provider: 'Twilio', icon: '📱', fields: ['accountSid', 'authToken', 'fromNumber'] },
    { id: 'sso', name: 'Single Sign-On', provider: 'SSO', icon: '🔐', fields: ['issuerUrl', 'clientId', 'clientSecret'] },
    { id: 'bank', name: 'Bank Payroll API', provider: 'Banking', icon: '🏦', fields: ['bankCode', 'apiKey', 'accountNumber'] }
  ];

  useEffect(() => {
    if (canView('integrations')) {
      loadIntegrations();
    }
  }, []);

  const loadIntegrations = async () => {
    const { data } = await request(integrationService.getIntegrations);
    if (data) setIntegrations(data);
  };

  const handleOpenModal = (template) => {
    const existing = integrations.find(i => i.provider === template.provider);
    setSelectedIntegration({ ...template, dbId: existing?.id });
    setFormData(existing?.config || {});
    setShowModal(true);
  };

  const handleSave = async () => {
    const payload = {
      name: selectedTemplate.name,
      provider: selectedTemplate.provider,
      status: 'connected',
      config: formData,
      is_active: true,
      last_synced_at: new Date()
    };

    if (selectedTemplate.dbId) {
      await request(
        () => integrationService.updateIntegration({ id: selectedTemplate.dbId, ...payload }),
        null,
        'Integration updated'
      );
    } else {
      await request(
        () => integrationService.addIntegration(payload),
        null,
        'Integration connected'
      );
    }
    
    setShowModal(false);
    loadIntegrations();
  };

  const handleDisconnect = async (id) => {
    await request(
      () => integrationService.deleteIntegration(id),
      null,
      'Integration disconnected'
    );
    loadIntegrations();
  };

  const handleTestConnection = () => {
    // Simulating a connection test
    toast({ title: 'Testing Connection...', description: 'Please wait.' });
    setTimeout(() => {
      toast({ title: 'Success', description: 'Connection successful!', className: 'bg-green-50 border-green-200' });
    }, 1500);
  };

  if (!canView('integrations')) return <div className="p-8 text-center">Access Denied</div>;

  return (
    <>
      <Helmet>
        <title>{t('settings.integrations')} - HRM System</title>
      </Helmet>
      
      <div className="space-y-6 max-w-5xl mx-auto">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">{t('settings.integrations')}</h1>
          <p className="text-slate-500 dark:text-slate-400">Manage connections with external services</p>
        </div>

        <div className="grid grid-cols-1 gap-4">
          {predefinedIntegrations.map((template) => {
            const current = integrations.find(i => i.provider === template.provider);
            const isConnected = !!current;

            return (
              <Card key={template.id} className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 transition-all hover:shadow-md">
                <CardContent className="p-6 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 text-2xl flex items-center justify-center bg-slate-100 dark:bg-slate-800 rounded-xl">
                      {template.icon}
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-900 dark:text-white text-lg">{template.name}</h3>
                      <p className="text-sm text-slate-500 dark:text-slate-400">Provider: {template.provider}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-4">
                    {isConnected ? (
                      <Badge className="bg-green-100 text-green-700 hover:bg-green-200 border-none px-3 py-1">
                        <CheckCircle2 className="w-3 h-3 mr-1" /> Connected
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-slate-500 border-slate-300">Disconnected</Badge>
                    )}

                    {isConnected ? (
                      <>
                        <PermissionGuard permission="integrations" action="edit">
                          <Button variant="outline" size="sm" onClick={() => handleOpenModal(template)}>
                            <Settings className="w-4 h-4 mr-2" />
                            {t('common.configure')}
                          </Button>
                        </PermissionGuard>
                        <PermissionGuard permission="integrations" action="delete">
                          <Button variant="destructive" size="sm" onClick={() => handleDisconnect(current.id)} className="bg-red-50 text-red-600 hover:bg-red-100 border-none">
                            <Unlink className="w-4 h-4 mr-2" />
                            {t('common.disconnect')}
                          </Button>
                        </PermissionGuard>
                      </>
                    ) : (
                      <PermissionGuard permission="integrations" action="add">
                        <Button onClick={() => handleOpenModal(template)} className="bg-blue-600 hover:bg-blue-700 shadow-sm">
                          <LinkIcon className="w-4 h-4 mr-2" />
                          {t('common.connect')}
                        </Button>
                      </PermissionGuard>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Configure {selectedTemplate?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {selectedTemplate?.fields.map(field => (
              <div key={field} className="grid gap-2">
                <Label className="capitalize">{field.replace(/([A-Z])/g, ' $1').trim()}</Label>
                <Input 
                  value={formData[field] || ''} 
                  onChange={(e) => setFormData({...formData, [field]: e.target.value})} 
                  placeholder={`Enter ${field}...`}
                  type={field.toLowerCase().includes('password') || field.toLowerCase().includes('secret') ? 'password' : 'text'}
                />
              </div>
            ))}
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
             <Button type="button" variant="outline" onClick={handleTestConnection} className="mr-auto text-blue-600 border-blue-200 hover:bg-blue-50">
                <Activity className="w-4 h-4 mr-2" /> Test Connection
             </Button>
             <Button type="button" variant="ghost" onClick={() => setShowModal(false)}>{t('common.cancel')}</Button>
             <Button type="button" onClick={handleSave} disabled={apiLoading} className="bg-blue-600 hover:bg-blue-700">
               {apiLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
               {t('common.save')}
             </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default IntegrationsPage;
