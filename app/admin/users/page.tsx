/**
 * Admin Dashboard - User Management
 * Admin-only page for managing users
 */

'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/context/AuthContext';
import { useAdmin } from '@/lib/hooks/useAdmin';
import { Header } from '@/components/layout/Header';
import { Button } from '@/components/ui/Button';
import { Shield, User, Eye, Plus, Search, Edit, Trash2, Power, PowerOff } from 'lucide-react';

interface UserProfile {
  id: string;
  email: string;
  fullName: string | null;
  role: 'admin' | 'user' | 'viewer';
  isActive: boolean;
  createdAt: string;
  lastLogin: string | null;
}

export default function AdminUsersPage() {
  const router = useRouter();
  const { profile, isLoading: authLoading } = useAuth();
  const { fetchUsers, updateUser, deleteUser, isLoading } = useAdmin();

  const [users, setUsers] = useState<UserProfile[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<'all' | 'admin' | 'user' | 'viewer'>('all');
  const [showCreateModal, setShowCreateModal] = useState(false);

  // Check if user is admin
  useEffect(() => {
    if (!authLoading && profile?.role !== 'admin') {
      router.push('/');
    }
  }, [profile, authLoading, router]);

  // Load users
  useEffect(() => {
    if (profile?.role === 'admin') {
      loadUsers();
    }
  }, [profile]);

  const loadUsers = async () => {
    const userList = await fetchUsers();
    setUsers(userList);
  };

  // Filter users
  const filteredUsers = users.filter((user) => {
    const matchesSearch =
      user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.fullName?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesRole = roleFilter === 'all' || user.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  // Toggle user active status
  const handleToggleActive = async (userId: string, currentStatus: boolean) => {
    const result = await updateUser(userId, { isActive: !currentStatus });
    if (result.success) {
      await loadUsers();
    } else {
      alert(`Failed to update user: ${result.error}`);
    }
  };

  // Delete user
  const handleDeleteUser = async (userId: string, email: string) => {
    if (!confirm(`Are you sure you want to delete ${email}?`)) return;

    const result = await deleteUser(userId);
    if (result.success) {
      await loadUsers();
    } else {
      alert(`Failed to delete user: ${result.error}`);
    }
  };

  // Get role icon
  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'admin':
        return <Shield className="h-4 w-4 text-red-400" />;
      case 'viewer':
        return <Eye className="h-4 w-4 text-blue-400" />;
      default:
        return <User className="h-4 w-4 text-green-400" />;
    }
  };

  // Stats
  const stats = {
    total: users.length,
    active: users.filter((u) => u.isActive).length,
    admins: users.filter((u) => u.role === 'admin').length,
    users: users.filter((u) => u.role === 'user').length,
    viewers: users.filter((u) => u.role === 'viewer').length,
  };

  if (authLoading || profile?.role !== 'admin') {
    return (
      <div className="min-h-screen bg-primary-bg flex items-center justify-center">
        <div className="text-secondary-text">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-primary-bg">
      <Header showStorage={false} />

      <div className="container mx-auto px-4 py-8 max-w-7xl">
        {/* Page Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold text-primary-text mb-2 flex items-center gap-2">
                <Shield className="h-8 w-8 text-red-400" />
                User Management
              </h1>
              <p className="text-secondary-text">Manage users, roles, and permissions</p>
            </div>
            <Button onClick={() => alert('Create user functionality coming soon')}>
              <Plus className="h-4 w-4 mr-2" />
              Create User
            </Button>
          </div>

          {/* Statistics */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div className="bg-secondary-bg border border-primary-border rounded-lg p-4">
              <div className="text-2xl font-bold text-primary-text">{stats.total}</div>
              <div className="text-sm text-secondary-text">Total Users</div>
            </div>
            <div className="bg-secondary-bg border border-primary-border rounded-lg p-4">
              <div className="text-2xl font-bold text-green-400">{stats.active}</div>
              <div className="text-sm text-secondary-text">Active</div>
            </div>
            <div className="bg-secondary-bg border border-primary-border rounded-lg p-4">
              <div className="text-2xl font-bold text-red-400">{stats.admins}</div>
              <div className="text-sm text-secondary-text">Admins</div>
            </div>
            <div className="bg-secondary-bg border border-primary-border rounded-lg p-4">
              <div className="text-2xl font-bold text-green-400">{stats.users}</div>
              <div className="text-sm text-secondary-text">Users</div>
            </div>
            <div className="bg-secondary-bg border border-primary-border rounded-lg p-4">
              <div className="text-2xl font-bold text-blue-400">{stats.viewers}</div>
              <div className="text-sm text-secondary-text">Viewers</div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-secondary-bg border border-primary-border rounded-lg p-4 mb-6">
          <div className="flex flex-col md:flex-row gap-4">
            {/* Search */}
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-secondary-text" />
              <input
                type="text"
                placeholder="Search by email or name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-primary-bg border border-primary-border rounded-md text-primary-text placeholder-secondary-text focus:outline-none focus:ring-2 focus:ring-accent-primary"
              />
            </div>

            {/* Role Filter */}
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value as any)}
              className="px-4 py-2 bg-primary-bg border border-primary-border rounded-md text-primary-text focus:outline-none focus:ring-2 focus:ring-accent-primary"
            >
              <option value="all">All Roles</option>
              <option value="admin">Admin</option>
              <option value="user">User</option>
              <option value="viewer">Viewer</option>
            </select>
          </div>
        </div>

        {/* Users Table */}
        <div className="bg-secondary-bg border border-primary-border rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-primary-bg border-b border-primary-border">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-medium text-secondary-text">User</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-secondary-text">Role</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-secondary-text">Status</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-secondary-text">Created</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-secondary-text">Last Login</th>
                  <th className="px-4 py-3 text-right text-sm font-medium text-secondary-text">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-primary-border">
                {filteredUsers.map((user) => (
                  <tr key={user.id} className="hover:bg-primary-bg transition-colors">
                    <td className="px-4 py-3">
                      <div>
                        <div className="font-medium text-primary-text">
                          {user.fullName || user.email.split('@')[0]}
                        </div>
                        <div className="text-sm text-secondary-text">{user.email}</div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        {getRoleIcon(user.role)}
                        <span className="capitalize text-primary-text">{user.role}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {user.isActive ? (
                        <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-500/10 text-green-400 rounded text-xs">
                          <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                          Active
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-1 bg-red-500/10 text-red-400 rounded text-xs">
                          <div className="w-2 h-2 bg-red-400 rounded-full"></div>
                          Inactive
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-secondary-text">
                      {new Date(user.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3 text-sm text-secondary-text">
                      {user.lastLogin
                        ? new Date(user.lastLogin).toLocaleDateString()
                        : 'Never'}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleToggleActive(user.id, user.isActive)}
                          className="p-1 hover:bg-primary-bg rounded transition-colors"
                          title={user.isActive ? 'Deactivate' : 'Activate'}
                        >
                          {user.isActive ? (
                            <PowerOff className="h-4 w-4 text-yellow-400" />
                          ) : (
                            <Power className="h-4 w-4 text-green-400" />
                          )}
                        </button>
                        <button
                          onClick={() => alert('Edit user coming soon')}
                          className="p-1 hover:bg-primary-bg rounded transition-colors"
                          title="Edit"
                        >
                          <Edit className="h-4 w-4 text-blue-400" />
                        </button>
                        <button
                          onClick={() => handleDeleteUser(user.id, user.email)}
                          className="p-1 hover:bg-primary-bg rounded transition-colors"
                          title="Delete"
                          disabled={user.id === profile?.id}
                        >
                          <Trash2
                            className={`h-4 w-4 ${
                              user.id === profile?.id
                                ? 'text-secondary-text cursor-not-allowed'
                                : 'text-red-400'
                            }`}
                          />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}

                {filteredUsers.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-secondary-text">
                      No users found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Back Button */}
        <div className="mt-6 flex justify-center">
          <Button variant="ghost" onClick={() => router.push('/')}>
            Back to Home
          </Button>
        </div>
      </div>
    </div>
  );
}
