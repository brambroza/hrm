import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { motion } from 'framer-motion';
import { LogIn, Mail, Lock, Eye, EyeOff } from 'lucide-react';
import { Helmet } from 'react-helmet';
import { useTranslation } from 'react-i18next';
import LanguageSwitcher from '@/components/LanguageSwitcher';
import { describeAuthError } from '@/utils/authErrors';

const LoginPage = () => {
  const { t } = useTranslation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [sendingReset, setSendingReset] = useState(false);
  const { signIn, resetPassword } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    const { error } = await signIn(email, password);

    if (error) {
      toast({
        variant: 'destructive',
        title: t('auth.loginFailed'),
        description: describeAuthError(error, t),
      });
      setLoading(false);
      return;
    }

    toast({
      title: t('auth.loginSuccess'),
      description: t('auth.welcomeBack'),
    });
    navigate('/dashboard');
  };

  /**
   * Send a reset link. The email field doubles as the input, so the user is
   * told to fill it in rather than being shown an empty-email server error.
   */
  const handleForgotPassword = async () => {
    if (!email) {
      toast({ variant: 'destructive', title: t('auth.enterEmailFirst') });
      return;
    }

    setSendingReset(true);
    const { error } = await resetPassword(email);
    setSendingReset(false);

    if (error) {
      toast({
        variant: 'destructive',
        title: t('auth.resetFailed'),
        description: describeAuthError(error, t),
      });
      return;
    }

    toast({ title: t('auth.resetSent'), description: email });
  };

  return (
    <>
      <Helmet>
        <title>{t('auth.loginTitle')}</title>
        <meta name="description" content="Login to HRM System" />
      </Helmet>
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-md"
        >
          {/* Language choice sits above the card: a Thai user who lands on the
              English detection default must be able to switch before reading
              anything else. */}
          <div className="flex justify-end mb-3">
            <LanguageSwitcher />
          </div>

          <div className="bg-slate-900 rounded-2xl shadow-2xl p-8 border border-slate-800">
            <div className="text-center mb-8">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.2, type: 'spring' }}
                className="inline-flex items-center justify-center w-16 h-16 bg-emerald-500 rounded-full mb-4"
              >
                <LogIn className="w-8 h-8 text-white" />
              </motion.div>
              <h1 className="text-3xl font-bold text-white mb-2">{t('auth.loginTitle')}</h1>
              <p className="text-slate-400">{t('auth.signInSubtitle')}</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label htmlFor="login-email" className="block text-sm font-medium text-slate-300 mb-2">
                  {t('auth.emailLabel')}
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <input
                    id="login-email"
                    type="email"
                    autoComplete="username"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="w-full pl-10 pr-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
                    placeholder="you@example.com"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="login-password" className="block text-sm font-medium text-slate-300 mb-2">
                  {t('auth.passwordLabel')}
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <input
                    id="login-password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="w-full pl-10 pr-12 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    aria-label={showPassword ? t('common.hidePassword') : t('common.showPassword')}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-white transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              <div className="flex justify-end -mt-2">
                <button
                  type="button"
                  onClick={handleForgotPassword}
                  disabled={sendingReset}
                  className="text-sm text-emerald-400 hover:text-emerald-300 disabled:opacity-50 transition-colors"
                >
                  {sendingReset ? t('common.pleaseWait') : t('auth.forgotPassword')}
                </button>
              </div>

              <Button
                type="submit"
                disabled={loading}
                className="w-full bg-emerald-500 hover:bg-emerald-600 text-white py-3 rounded-lg font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <div className="flex items-center justify-center">
                    <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-white mr-2" />
                    {t('auth.signingIn')}
                  </div>
                ) : (
                  t('auth.signInButton')
                )}
              </Button>
            </form>
          </div>
        </motion.div>
      </div>
    </>
  );
};

export default LoginPage;
