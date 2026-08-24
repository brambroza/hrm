
import React, { useState, useRef, useEffect } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import LanguageSwitcher from '@/components/LanguageSwitcher';
import UserProfileModal from '@/components/UserProfileModal';
import ChangePasswordModal from '@/components/ChangePasswordModal';
import { 
  LayoutDashboard, Users, Clock, Settings, LogOut, Menu, X,
  FileText, Award, Building, CalendarOff, Briefcase, PieChart,
  Wallet, Gift, Search, Bell, ChevronLeft, ChevronRight, Sun,
  Moon, DollarSign, ChevronDown, User, Key, Globe, Calendar, 
  Calculator, BarChart3
} from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/customSupabaseClient';
import { usePermission } from '@/hooks/usePermission';

const MainLayout = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  // `window.innerWidth` was read straight in the render body, so the sidebar
  // never noticed a resize: shrinking a desktop window left it stuck open and
  // widening a phone window left it stuck hidden.
  const [isDesktop, setIsDesktop] = useState(() =>
    typeof window !== 'undefined' ? window.matchMedia('(min-width: 1024px)').matches : true,
  );
  const { user, signOut, role } = useAuth();
  const { canView } = usePermission();
  const { theme, toggleTheme } = useTheme();
  const { t } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [userProfile, setUserProfile] = useState(null);
  const [showProfileDropdown, setShowProfileDropdown] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const dropdownRef = useRef(null);

  const [expandedMenus, setExpandedMenus] = useState(['payroll', 'settings']);

  useEffect(() => {
    const fetchUserProfile = async () => {
      if (user?.id) {
        const { data } = await supabase
          .from('users')
          .select('*')
          .eq('id', user.id)
          .single();
        if (data) setUserProfile(data);
      }
    };
    fetchUserProfile();
  }, [user]);

  useEffect(() => {
    const query = window.matchMedia('(min-width: 1024px)');
    const handleChange = (event) => {
      setIsDesktop(event.matches);
      // Leaving the mobile breakpoint should also dismiss the overlay drawer,
      // otherwise it stays mounted behind the desktop layout.
      if (event.matches) setSidebarOpen(false);
    };

    query.addEventListener('change', handleChange);
    return () => query.removeEventListener('change', handleChange);
  }, []);

  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowProfileDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const toggleSubmenu = (key) => {
    if (expandedMenus.includes(key)) {
      setExpandedMenus(expandedMenus.filter(k => k !== key));
    } else {
      setExpandedMenus([...expandedMenus, key]);
    }
  };

  const menuItems = [
    { 
      icon: LayoutDashboard, 
      label: t('common.dashboard'), 
      path: '/dashboard', 
      permission: 'dashboard' 
    },
    { 
      icon: Users, 
      label: t('common.employees'), 
      path: '/employees', 
      permission: 'employee' 
    },
    { 
      icon: Clock, 
      label: t('common.attendance'), 
      path: '/attendance',
      permission: 'time_attendance'
    },
    {
      icon: Calculator,
      label: t('attendance.calculation'),
      path: '/attendance-calculation',
      permission: 'time_attendance'
    },
    {
      icon: Clock,
      label: t('attendance.otRequest'),
      path: '/ot-requests',
      permission: 'ot_request'
    },
    {
      icon: CalendarOff,
      label: t('common.leave'),
      path: '/leave',
      permission: 'leave'
    },
    { 
      icon: DollarSign, 
      label: t('common.payroll'), 
      key: 'payroll',
      permission: 'payroll',
      children: [
        { label: t('payroll.setup'), path: '/payroll/setup', permission: 'payroll', icon: Settings },
        { label: t('payroll.periods'), path: '/payroll/periods', permission: 'payroll', icon: Calendar },
        { label: t('payroll.calculate'), path: '/payroll/calculate', permission: 'payroll', icon: Calculator },
        { label: t('payroll.slips'), path: '/payroll/slips', permission: 'payroll', icon: FileText },
        { label: t('common.reports'), path: '/payroll/reports', permission: 'payroll', icon: BarChart3 },
      ]
    },
    { 
      icon: PieChart, 
      label: t('common.reports'), 
      path: '/reports', 
      permission: 'reports' 
    },
        { 
          icon: Settings, 
          label: t('common.settings'), 
          key: 'settings',
          permission: 'settings',
          children: [
            { label: t('settings.settings'), path: '/settings', permission: 'settings' },
            { label: t('settings.companySettings'), path: '/settings/company', permission: 'company_settings' },
            { label: t('settings.departmentManagement'), path: '/settings/departments', permission: 'department' },
            { label: t('settings.attendancePolicy'), path: '/settings/attendance-policy', permission: 'attendance_policy' },
            { label: t('settings.systemConfig'), path: '/settings/system', permission: 'system_settings' },
            { label: t('settings.integrations'), path: '/settings/integrations', permission: 'integrations' },
            { label: t('settings.backupRecovery'), path: '/settings/backup', permission: 'backup_recovery' },
        { label: t('settings.auditLog'), path: '/settings/audit-log', permission: 'audit_log' },
        { label: t('settings.userManagement'), path: '/settings/users', permission: 'user_management' },
        { label: t('settings.manageTranslations'), path: '/settings/translate', permission: 'translate' },
      ]
    },
  ];

  const handleSignOut = async () => {
    const { error } = await signOut();
    if (error) {
      toast({
        variant: 'destructive',
        title: 'Sign Out Failed',
        description: error.message
      });
    } else {
      navigate('/login');
    }
  };

  const handleProfileUpdate = async () => {
    if (user?.id) {
      const { data } = await supabase.from('users').select('*').eq('id', user.id).single();
      if (data) setUserProfile(data);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col md:flex-row transition-colors duration-300 font-sans text-slate-900 dark:text-slate-100">
      {/* Mobile Sidebar Toggle */}
      <div className="lg:hidden p-4 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center sticky top-0 z-50">
        <div className="flex items-center gap-2 font-bold text-xl text-slate-900 dark:text-white">
          <div className="w-8 h-8 rounded-lg bg-emerald-500 flex items-center justify-center shadow-lg shadow-emerald-500/30">
            <Users className="w-5 h-5 text-white" />
          </div>
          <span className="bg-clip-text text-transparent bg-gradient-to-r from-emerald-600 to-emerald-400">HRM</span>
        </div>
        <button onClick={() => setSidebarOpen(!sidebarOpen)} className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800">
          {sidebarOpen ? <X /> : <Menu />}
        </button>
      </div>

      {/* Sidebar */}
      <AnimatePresence>
        {(sidebarOpen || isDesktop) && (
          <motion.aside
            initial={{ x: -300 }}
            animate={{ x: 0 }}
            exit={{ x: -300 }}
            transition={{ type: 'spring', damping: 20 }}
            className={`fixed lg:sticky top-0 left-0 h-screen ${collapsed ? 'w-20' : 'w-64'} bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 z-40 flex flex-col transition-all duration-300 shadow-xl lg:shadow-none`}
          >
            {/* Logo Area */}
            <div className={`p-6 hidden lg:flex items-center ${collapsed ? 'justify-center' : 'justify-between'}`}>
              {!collapsed && (
                <div className="flex items-center gap-2 font-bold text-2xl text-slate-900 dark:text-white">
                  <div className="w-8 h-8 rounded-lg bg-emerald-500 flex items-center justify-center shadow-lg shadow-emerald-500/30">
                    <Users className="w-5 h-5 text-white" />
                  </div>
                  <span className="bg-clip-text text-transparent bg-gradient-to-r from-emerald-600 to-emerald-400">HRM</span>
                </div>
              )}
              {collapsed && (
                 <div className="w-8 h-8 rounded-lg bg-emerald-500 flex items-center justify-center shadow-lg shadow-emerald-500/30">
                    <Users className="w-5 h-5 text-white" />
                  </div>
              )}
              
              <button 
                onClick={() => setCollapsed(!collapsed)}
                className="hidden lg:flex w-6 h-6 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 items-center justify-center text-slate-400 hover:text-slate-900 dark:hover:text-white absolute -right-3 top-8 shadow-sm transition-all hover:scale-110"
              >
                {collapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
              </button>
            </div>

            <div className="px-4 mb-2 hidden lg:block">
               {!collapsed && <p className="text-xs text-slate-500 dark:text-slate-500 uppercase tracking-wider font-semibold mb-2 ml-2">{t('common.mainMenu')}</p>}
            </div>

            {/* Navigation */}
            <nav className="flex-1 px-3 py-2 space-y-1 overflow-y-auto scrollbar-thin scrollbar-thumb-slate-200 dark:scrollbar-thumb-slate-800">
              {menuItems.map((item) => {
                if (item.permission && !canView(item.permission)) return null;

                const Icon = item.icon;
                const hasChildren = item.children && item.children.length > 0;
                
                const visibleChildren = hasChildren 
                  ? item.children.filter(child => !child.permission || canView(child.permission))
                  : [];
                
                if (hasChildren && visibleChildren.length === 0) return null;

                const isExpanded = expandedMenus.includes(item.key);
                const isActive = item.path 
                  ? location.pathname === item.path
                  : visibleChildren.some(child => location.pathname.startsWith(child.path));

                if (hasChildren && !collapsed) {
                  return (
                    <div key={item.key || item.label} className="space-y-1">
                      <button
                        onClick={() => toggleSubmenu(item.key)}
                        className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl transition-all group ${
                          isActive
                            ? 'bg-emerald-50 dark:bg-emerald-900/10 text-emerald-600 dark:text-emerald-400 font-medium'
                            : 'text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white'
                        }`}
                      >
                        <Icon className={`w-5 h-5 ${isActive ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-300'}`} />
                        <span className="flex-1 text-left text-sm">{item.label}</span>
                        <ChevronDown className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                      </button>
                      
                      <AnimatePresence>
                        {isExpanded && (
                          <motion.div 
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="overflow-hidden"
                          >
                            <div className="pl-11 space-y-1 py-1">
                              {visibleChildren.map((child) => (
                                <Link
                                  key={child.path}
                                  to={child.path}
                                  onClick={() => setSidebarOpen(false)}
                                  className={`block py-2 px-3 rounded-lg text-sm transition-colors ${
                                    location.pathname === child.path
                                      ? 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/10 font-medium'
                                      : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-800/50'
                                  }`}
                                >
                                  {child.label}
                                </Link>
                              ))}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  );
                }

                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    onClick={() => setSidebarOpen(false)}
                    className={`flex items-center gap-3 px-3 py-3 rounded-xl transition-all group ${
                      isActive
                        ? 'bg-emerald-50 dark:bg-emerald-900/10 text-emerald-600 dark:text-emerald-400 font-medium shadow-sm'
                        : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white'
                    } ${collapsed ? 'justify-center' : ''}`}
                    title={collapsed ? item.label : ''}
                  >
                    <Icon className={`w-5 h-5 ${isActive ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-500 dark:text-slate-400 group-hover:text-slate-900 dark:group-hover:text-white'}`} />
                    {!collapsed && <span className="font-medium text-sm">{item.label}</span>}
                  </Link>
                );
              })}
            </nav>

            {/* Bottom Section */}
            <div className="p-4 border-t border-slate-200 dark:border-slate-800">
               <button onClick={handleSignOut} className={`flex items-center gap-3 w-full p-2 rounded-xl text-slate-500 dark:text-slate-400 hover:bg-red-50 dark:hover:bg-red-900/10 hover:text-red-600 transition-colors ${collapsed ? 'justify-center' : ''}`}>
                  <LogOut className="w-5 h-5" />
                  {!collapsed && <span className="font-medium text-sm">{t('common.logout')}</span>}
               </button>
            </div>
          </motion.aside>
        )}
      </AnimatePresence>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-w-0 bg-slate-50 dark:bg-slate-950 transition-colors duration-300">
        {/* Desktop Header */}
        <header className="hidden lg:flex h-20 items-center justify-between px-8 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 sticky top-0 z-30 transition-colors duration-300 shadow-sm">
          <div className="w-96 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-slate-500" />
            <input 
               type="text" 
               placeholder={t('common.search') + "..."} 
               className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl py-3 pl-10 pr-4 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 placeholder-slate-400 dark:placeholder-slate-600 transition-all"
            />
          </div>
          
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <LanguageSwitcher />
              <button 
                onClick={toggleTheme}
                className="p-2 rounded-full bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400 hover:text-emerald-500 transition-colors border border-slate-200 dark:border-slate-700"
                title={theme === 'light' ? "Switch to Dark Mode" : "Switch to Light Mode"}
                aria-label={theme === 'light' ? "Switch to Dark Mode" : "Switch to Light Mode"}
              >
                {theme === 'light' ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
              </button>
              <Link 
                to="/settings" 
                className="p-2 rounded-full bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400 hover:text-emerald-500 transition-colors border border-slate-200 dark:border-slate-700"
                aria-label={t('common.settings')}
              >
                 <Settings className="w-5 h-5" />
              </Link>
            </div>
            
            <div className="h-8 w-px bg-slate-200 dark:bg-slate-800 mx-2"></div>
            
            {/* User Profile Dropdown */}
            <div className="relative" ref={dropdownRef}>
               <div 
                 className="flex items-center gap-3 cursor-pointer group"
                 onClick={() => setShowProfileDropdown(!showProfileDropdown)}
                 role="button"
                 aria-haspopup="true"
                 aria-expanded={showProfileDropdown}
                 tabIndex={0}
                 onKeyDown={(e) => {
                   if (e.key === 'Enter' || e.key === ' ') {
                     setShowProfileDropdown(!showProfileDropdown);
                   }
                 }}
               >
                 <div className="text-right hidden xl:block">
                    <p className="text-sm font-semibold text-slate-900 dark:text-white">{userProfile?.full_name || user?.email?.split('@')[0]}</p>
                    <p className="text-xs text-slate-500">{role || 'User'}</p>
                 </div>
                 <Avatar className="h-10 w-10 border-2 border-emerald-500/20 group-hover:border-emerald-500 transition-colors">
                    <AvatarImage src={userProfile?.avatar_url} />
                    <AvatarFallback className="bg-emerald-100 text-emerald-700 dark:bg-emerald-500 dark:text-white">
                      {userProfile?.full_name?.charAt(0) || user?.email?.charAt(0).toUpperCase()}
                    </AvatarFallback>
                 </Avatar>
               </div>

               <AnimatePresence>
                 {showProfileDropdown && (
                   <motion.div
                     initial={{ opacity: 0, y: 10, scale: 0.95 }}
                     animate={{ opacity: 1, y: 0, scale: 1 }}
                     exit={{ opacity: 0, y: 10, scale: 0.95 }}
                     transition={{ duration: 0.2 }}
                     className="absolute right-0 mt-3 w-56 bg-white dark:bg-slate-900 rounded-xl shadow-xl border border-slate-200 dark:border-slate-800 overflow-hidden z-50"
                   >
                     <div className="p-4 border-b border-slate-100 dark:border-slate-800">
                       <p className="font-semibold text-slate-900 dark:text-white truncate">
                         {userProfile?.full_name || 'User'}
                       </p>
                       <p className="text-xs text-slate-500 truncate">{user?.email}</p>
                     </div>
                     <div className="p-2">
                       <button 
                         onClick={() => {
                           setShowProfileDropdown(false);
                           navigate('/profile');
                         }}
                         className="flex items-center gap-2 w-full px-3 py-2 text-sm text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg transition-colors"
                       >
                         <User className="w-4 h-4" />
                         {t('userProfile.viewProfile')}
                       </button>
                       <button 
                         onClick={() => {
                           setShowProfileDropdown(false);
                           setShowProfileModal(true);
                         }}
                         className="flex items-center gap-2 w-full px-3 py-2 text-sm text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg transition-colors"
                       >
                         <Settings className="w-4 h-4" />
                         {t('userProfile.editProfile')}
                       </button>
                       <button 
                         onClick={() => {
                           setShowProfileDropdown(false);
                           setShowPasswordModal(true);
                         }}
                         className="flex items-center gap-2 w-full px-3 py-2 text-sm text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg transition-colors"
                       >
                         <Key className="w-4 h-4" />
                         {t('userProfile.changePassword')}
                       </button>
                     </div>
                     <div className="p-2 border-t border-slate-100 dark:border-slate-800">
                       <button 
                         onClick={handleSignOut}
                         className="flex items-center gap-2 w-full px-3 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/10 rounded-lg transition-colors"
                       >
                         <LogOut className="w-4 h-4" />
                         {t('common.logout')}
                       </button>
                     </div>
                   </motion.div>
                 )}
               </AnimatePresence>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <div className="flex-1 p-4 lg:p-8 overflow-y-auto mt-0 lg:mt-0">
          <Outlet />
        </div>
      </main>

      {/* Modals */}
      <UserProfileModal 
        isOpen={showProfileModal} 
        onClose={() => setShowProfileModal(false)}
        user={userProfile || { id: user?.id, email: user?.email }}
        onUpdate={handleProfileUpdate}
      />
      <ChangePasswordModal 
        isOpen={showPasswordModal} 
        onClose={() => setShowPasswordModal(false)} 
      />

      {/* Overlay for mobile */}
      {sidebarOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black bg-opacity-70 z-30 backdrop-blur-sm"
          onClick={() => setSidebarOpen(false)}
        />
      )}
    </div>
  );
};

export default MainLayout;
