'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/context/AuthContext';
import { useUI } from '@/lib/context/UIContext';
import { Header } from '@/components/layout/Header';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { Shield, Users, Key, ArrowLeft } from 'lucide-react';
import { format } from 'date-fns';

interface UserWithStats {
  id: string;
  email: string;
  name: string | null;
  is_admin: boolean;
  created_at: string;
  workspace_count: number;
  board_count: number;
}

export default function AdminPage() {
  const router = useRouter();
  const { user, isAuthenticated, isLoading } = useAuth();
  const { showToast } = useUI();
  const [users, setUsers] = useState<UserWithStats[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [selectedUser, setSelectedUser] = useState<UserWithStats | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [resetting, setResetting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/');
      return;
    }

    if (!isLoading && user && !user.is_admin) {
      router.push('/');
      return;
    }

    if (user?.is_admin) {
      fetchUsers();
    }
  }, [isLoading, isAuthenticated, user, router]);

  const fetchUsers = async () => {
    try {
      const res = await fetch('/api/admin/users');
      if (!res.ok) {
        throw new Error('Failed to fetch users');
      }
      const data = await res.json();
      setUsers(data.users);
    } catch (err) {
      console.error('Error fetching users:', err);
      showToast('Failed to load users', 'error');
    } finally {
      setLoadingUsers(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (newPassword.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }

    setResetting(true);

    try {
      const res = await fetch('/api/admin/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: selectedUser?.id,
          newPassword,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Failed to reset password');
        return;
      }

      showToast(`Password reset for ${selectedUser?.email}`, 'success');
      closeModal();
    } catch {
      setError('Failed to reset password');
    } finally {
      setResetting(false);
    }
  };

  const closeModal = () => {
    setSelectedUser(null);
    setNewPassword('');
    setConfirmPassword('');
    setError('');
  };

  if (isLoading || !user?.is_admin) {
    return (
      <div className="min-h-screen bg-bg-primary flex items-center justify-center">
        <div className="animate-pulse text-text-secondary">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bg-primary">
      <Header />

      <main className="container mx-auto px-4 py-8 max-w-6xl">
        {/* Back button */}
        <button
          onClick={() => router.push('/')}
          className="flex items-center gap-2 text-text-secondary hover:text-text-primary mb-6 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Home
        </button>

        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <Shield className="h-8 w-8 text-accent-primary" />
          <h1 className="text-2xl font-bold text-text-primary">Admin Panel</h1>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="bg-bg-secondary rounded-lg p-4 border border-bg-tertiary">
            <div className="flex items-center gap-3">
              <Users className="h-5 w-5 text-accent-primary" />
              <div>
                <p className="text-sm text-text-secondary">Total Users</p>
                <p className="text-2xl font-bold text-text-primary">{users.length}</p>
              </div>
            </div>
          </div>
          <div className="bg-bg-secondary rounded-lg p-4 border border-bg-tertiary">
            <div className="flex items-center gap-3">
              <div className="h-5 w-5 text-accent-primary flex items-center justify-center font-bold">W</div>
              <div>
                <p className="text-sm text-text-secondary">Total Workspaces</p>
                <p className="text-2xl font-bold text-text-primary">
                  {users.reduce((acc, u) => acc + u.workspace_count, 0)}
                </p>
              </div>
            </div>
          </div>
          <div className="bg-bg-secondary rounded-lg p-4 border border-bg-tertiary">
            <div className="flex items-center gap-3">
              <div className="h-5 w-5 text-accent-primary flex items-center justify-center font-bold">B</div>
              <div>
                <p className="text-sm text-text-secondary">Total Boards</p>
                <p className="text-2xl font-bold text-text-primary">
                  {users.reduce((acc, u) => acc + u.board_count, 0)}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Users table */}
        <div className="bg-bg-secondary rounded-lg border border-bg-tertiary overflow-hidden">
          <div className="p-4 border-b border-bg-tertiary">
            <h2 className="text-lg font-semibold text-text-primary">Users</h2>
          </div>

          {loadingUsers ? (
            <div className="p-8 text-center text-text-secondary">Loading users...</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-bg-tertiary">
                    <th className="px-4 py-3 text-left text-sm font-medium text-text-secondary">Email</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-text-secondary">Name</th>
                    <th className="px-4 py-3 text-center text-sm font-medium text-text-secondary">Admin</th>
                    <th className="px-4 py-3 text-center text-sm font-medium text-text-secondary">Workspaces</th>
                    <th className="px-4 py-3 text-center text-sm font-medium text-text-secondary">Boards</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-text-secondary">Created</th>
                    <th className="px-4 py-3 text-right text-sm font-medium text-text-secondary">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((u) => (
                    <tr key={u.id} className="border-b border-bg-tertiary last:border-0 hover:bg-bg-tertiary/50">
                      <td className="px-4 py-3 text-sm text-text-primary">{u.email}</td>
                      <td className="px-4 py-3 text-sm text-text-primary">{u.name || '-'}</td>
                      <td className="px-4 py-3 text-center">
                        {u.is_admin && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-accent-primary/20 text-accent-primary">
                            Admin
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center text-sm text-text-primary">{u.workspace_count}</td>
                      <td className="px-4 py-3 text-center text-sm text-text-primary">{u.board_count}</td>
                      <td className="px-4 py-3 text-sm text-text-secondary">
                        {format(new Date(u.created_at), 'MMM d, yyyy')}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {u.id !== user.id && (
                          <button
                            onClick={() => setSelectedUser(u)}
                            className="inline-flex items-center gap-1 px-2 py-1 text-sm text-text-secondary hover:text-text-primary transition-colors"
                          >
                            <Key className="h-3.5 w-3.5" />
                            Reset Password
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>

      {/* Reset Password Modal */}
      <Modal isOpen={!!selectedUser} onClose={closeModal} title="Reset Password" size="sm">
        <form onSubmit={handleResetPassword} className="space-y-4">
          <p className="text-sm text-text-secondary">
            Reset password for <span className="font-medium text-text-primary">{selectedUser?.email}</span>
          </p>

          <Input
            type="password"
            label="New Password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            required
            minLength={8}
            autoComplete="new-password"
            placeholder="Min 8 chars, upper, lower, number"
          />

          <Input
            type="password"
            label="Confirm Password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
            minLength={8}
            autoComplete="new-password"
          />

          {error && <p className="text-sm text-accent-danger">{error}</p>}

          <div className="flex gap-3 justify-end pt-2">
            <Button type="button" variant="ghost" onClick={closeModal}>
              Cancel
            </Button>
            <Button type="submit" disabled={resetting}>
              {resetting ? 'Resetting...' : 'Reset Password'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
