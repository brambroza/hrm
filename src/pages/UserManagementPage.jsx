
import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Helmet } from 'react-helmet';
import { motion } from 'framer-motion';
import { 
  Plus, Search, Download, Edit, Trash2, Shield, 
  ChevronLeft, ChevronRight, User
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { useUsers } from '@/hooks/useUsers';
import { exportToExcel } from '@/utils/helpers';
import AddUserModal from '@/components/AddUserModal';
import EditUserModal from '@/components/EditUserModal';
import SetPermissionsModal from '@/components/SetPermissionsModal';
import ConfirmDeleteUserModal from '@/components/ConfirmDeleteUserModal';
import { usePermission } from '@/hooks/usePermission';
import PermissionGuard from '@/components/PermissionGuard';

const UserManagementPage = () => {
  const { t } = useTranslation();
  const { users, loading, fetchUsers } = useUsers();
  const { canView } = usePermission();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showPermsModal, setShowPermsModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);

  useEffect(() => {
    if (canView('user_management')) {
      fetchUsers();
    }
  }, [fetchUsers]);

  useEffect(() => {
    if (users) {
      const filtered = users.filter(user => 
        user.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (user.role && user.role.toLowerCase().includes(searchTerm.toLowerCase()))
      );
      setFilteredUsers(filtered);
      setCurrentPage(1);
    }
  }, [users, searchTerm]);

  // Pagination
  const totalPages = Math.ceil(filteredUsers.length / itemsPerPage);
  const paginatedUsers = filteredUsers.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const handleExport = () => {
    const data = filteredUsers.map(u => ({
      ID: u.id,
      Name: u.full_name,
      Email: u.email,
      Role: u.role || 'N/A',
      Status: u.status,
      Created: new Date(u.created_at).toLocaleDateString()
    }));
    exportToExcel(data, 'User_List');
  };

  const getRoleColor = (role) => {
    if (!role) return 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-400';
    
    switch(role.toLowerCase()) {
      case 'admin': return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400';
      case 'manager': return 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400';
      case 'hr': return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400';
      case 'accountant': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400';
      default: return 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-400';
    }
  };

  if (!canView('user_management')) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] text-center">
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Access Denied</h2>
        <p className="text-slate-500">You do not have permission to view user management.</p>
      </div>
    );
  }

  return (
    <>
      <Helmet>
        <title>{t('userManagement.title')} - HRM System</title>
      </Helmet>

      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">{t('userManagement.title')}</h1>
            <p className="text-slate-500 dark:text-slate-400">{t('userManagement.subtitle')}</p>
          </div>
          <PermissionGuard permission="user_management" action="add">
            <Button onClick={() => setShowAddModal(true)} className="bg-blue-600 hover:bg-blue-700">
              <Plus className="w-4 h-4 mr-2" />
              {t('userManagement.addUser')}
            </Button>
          </PermissionGuard>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 flex items-center gap-4">
            <div className="p-3 bg-blue-100 dark:bg-blue-900/20 rounded-lg text-blue-600">
              <User className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm text-slate-500">Total Users</p>
              <p className="text-2xl font-bold text-slate-900 dark:text-white">{users.length}</p>
            </div>
          </div>
          <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 flex items-center gap-4">
            <div className="p-3 bg-green-100 dark:bg-green-900/20 rounded-lg text-green-600">
              <Shield className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm text-slate-500">Active Users</p>
              <p className="text-2xl font-bold text-slate-900 dark:text-white">
                {users.filter(u => u.status === 'active').length}
              </p>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
            <Input
              type="text"
              placeholder={t('userManagement.searchPlaceholder')}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <Button variant="outline" onClick={handleExport}>
            <Download className="w-4 h-4 mr-2" />
            {t('common.export')}
          </Button>
        </div>

        {/* Table */}
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase">{t('userManagement.role')}</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase">{t('employees.name')}</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase">{t('employees.email')}</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase">{t('userManagement.role')}</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase">{t('userManagement.status')}</th>
                  <th className="px-6 py-4 text-right text-xs font-semibold text-slate-500 uppercase">{t('common.actions')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                {loading ? (
                  <tr>
                    <td colSpan="6" className="px-6 py-8 text-center text-slate-500">
                      {t('common.loading')}
                    </td>
                  </tr>
                ) : paginatedUsers.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="px-6 py-8 text-center text-slate-500">
                      {t('common.noData')}
                    </td>
                  </tr>
                ) : (
                  paginatedUsers.map((user) => (
                    <motion.tr 
                      key={user.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                    >
                      <td className="px-6 py-4">
                         <Avatar className="h-9 w-9">
                            <AvatarImage src={user.avatar_url} />
                            <AvatarFallback>{user.full_name?.charAt(0)}</AvatarFallback>
                         </Avatar>
                      </td>
                      <td className="px-6 py-4 text-sm font-medium text-slate-900 dark:text-white">
                        {user.full_name}
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-400">
                        {user.email}
                      </td>
                      <td className="px-6 py-4 text-sm">
                        <Badge className={getRoleColor(user.role)}>
                          {user.role ? (t(`roles.${user.role}`) || user.role) : 'N/A'}
                        </Badge>
                      </td>
                      <td className="px-6 py-4 text-sm">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          user.status === 'active' 
                            ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' 
                            : 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-400'
                        }`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${user.status === 'active' ? 'bg-green-500' : 'bg-slate-500'}`}></span>
                          {t(`userManagement.${user.status}`)}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right text-sm font-medium space-x-2">
                        <PermissionGuard permission="user_management" action="edit">
                          <Button
                            size="sm"
                            variant="ghost"
                            title={t('userManagement.setPermissions')}
                            onClick={() => {
                              setSelectedUser(user);
                              setShowPermsModal(true);
                            }}
                            className="text-indigo-600 hover:text-indigo-900 dark:text-indigo-400 dark:hover:text-indigo-300"
                          >
                            <Shield className="w-4 h-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            title={t('common.edit')}
                            onClick={() => {
                              setSelectedUser(user);
                              setShowEditModal(true);
                            }}
                            className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300"
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                        </PermissionGuard>
                        <PermissionGuard permission="user_management" action="delete">
                          <Button
                            size="sm"
                            variant="ghost"
                            title={t('common.delete')}
                            onClick={() => {
                              setSelectedUser(user);
                              setShowDeleteModal(true);
                            }}
                            className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </PermissionGuard>
                      </td>
                    </motion.tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          
          {/* Pagination */}
          <div className="bg-white dark:bg-slate-900 px-6 py-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
             <div className="text-sm text-slate-500">
                Showing {Math.min((currentPage - 1) * itemsPerPage + 1, filteredUsers.length)} to {Math.min(currentPage * itemsPerPage, filteredUsers.length)} of {filteredUsers.length} entries
             </div>
             <div className="flex gap-2">
                <Button 
                   variant="outline" 
                   size="sm" 
                   onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                   disabled={currentPage === 1}
                >
                   <ChevronLeft className="w-4 h-4" />
                </Button>
                <Button 
                   variant="outline" 
                   size="sm" 
                   onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                   disabled={currentPage === totalPages}
                >
                   <ChevronRight className="w-4 h-4" />
                </Button>
             </div>
          </div>
        </div>
      </div>

      <AddUserModal 
        isOpen={showAddModal} 
        onClose={() => setShowAddModal(false)}
        onSuccess={fetchUsers}
      />

      <EditUserModal 
        isOpen={showEditModal} 
        onClose={() => setShowEditModal(false)}
        user={selectedUser}
        onSuccess={fetchUsers}
      />

      <SetPermissionsModal
        isOpen={showPermsModal}
        onClose={() => setShowPermsModal(false)}
        user={selectedUser}
      />

      <ConfirmDeleteUserModal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        user={selectedUser}
        onSuccess={fetchUsers}
      />
    </>
  );
};

export default UserManagementPage;
