'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/context/AuthContext';
import { useUI } from '@/lib/context/UIContext';
import { Header } from '@/components/layout/Header';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { Shield, Users, Key, ArrowLeft, Trash2, UserPlus, UserCheck, Clock, HardDrive, RefreshCw, Download, Upload, Database, Archive } from 'lucide-react';
import { format } from 'date-fns';

interface UserWithStats {
  id: string;
  email: string;
  name: string | null;
  is_admin: boolean;
  is_approved: boolean;
  created_at: string;
  workspace_count: number;
  board_count: number;
}

interface StorageInfo {
  db: { pageCount: number; pageSize: number; sizeMB: string };
  blobs: { count: number; totalSize: number; totalSizeMB: string };
}

interface BlobCleanupResult {
  message: string;
  orphanedCount: number;
  orphanedSize: number;
  orphanedSizeMB: string;
  totalBlobsChecked: number;
  referencedCount: number;
  orphanedBlobs?: Array<{
    url: string;
    pathname: string;
    size: number;
    uploadedAt: string;
  }>;
  deletedCount?: number;
  failedCount?: number;
  freedSpaceMB?: string;
}

export default function AdminPage() {
  const router = useRouter();
  const { user, isAuthenticated, isLoading } = useAuth();
  const { showToast, showConfirmDialog } = useUI();
  const [users, setUsers] = useState<UserWithStats[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [selectedUser, setSelectedUser] = useState<UserWithStats | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [resetting, setResetting] = useState(false);
  const [error, setError] = useState('');
  const [userToDelete, setUserToDelete] = useState<UserWithStats | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [approving, setApproving] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserPassword, setNewUserPassword] = useState('');
  const [newUserName, setNewUserName] = useState('');
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState('');
  const [blobAnalyzing, setBlobAnalyzing] = useState(false);
  const [blobCleaning, setBlobCleaning] = useState(false);
  const [blobResult, setBlobResult] = useState<BlobCleanupResult | null>(null);
  const [backingUp, setBackingUp] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const restoreInputRef = useRef<HTMLInputElement>(null);
  const [exportingArchived, setExportingArchived] = useState(false);
  const [storageInfo, setStorageInfo] = useState<StorageInfo | null>(null);
  const [storageLoading, setStorageLoading] = useState(false);

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
      fetchStorageInfo();
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

  const handleDeleteUser = async () => {
    if (!userToDelete) return;

    setDeleting(true);

    try {
      const res = await fetch(`/api/admin/users/${userToDelete.id}`, {
        method: 'DELETE',
      });

      if (!res.ok) {
        const data = await res.json();
        showToast(data.error || 'Failed to delete user', 'error');
        return;
      }

      showToast(`User ${userToDelete.email} deleted`, 'success');
      setUsers(users.filter(u => u.id !== userToDelete.id));
      setUserToDelete(null);
    } catch {
      showToast('Failed to delete user', 'error');
    } finally {
      setDeleting(false);
    }
  };

  const handleApproveUser = async (userId: string) => {
    setApproving(userId);

    try {
      const res = await fetch('/api/admin/approve-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      });

      if (!res.ok) {
        const data = await res.json();
        showToast(data.error || 'Failed to approve user', 'error');
        return;
      }

      showToast('User approved', 'success');
      setUsers(users.map(u => u.id === userId ? { ...u, is_approved: true } : u));
    } catch {
      showToast('Failed to approve user', 'error');
    } finally {
      setApproving(null);
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateError('');

    if (newUserPassword.length < 8) {
      setCreateError('Password must be at least 8 characters');
      return;
    }

    setCreating(true);

    try {
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: newUserEmail,
          password: newUserPassword,
          name: newUserName || undefined,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setCreateError(data.error || 'Failed to create user');
        return;
      }

      showToast(`User ${data.user.email} created`, 'success');
      // Refresh user list to get the new user with stats
      fetchUsers();
      closeCreateModal();
    } catch {
      setCreateError('Failed to create user');
    } finally {
      setCreating(false);
    }
  };

  const closeCreateModal = () => {
    setShowCreateModal(false);
    setNewUserEmail('');
    setNewUserPassword('');
    setNewUserName('');
    setCreateError('');
  };

  const handleAnalyzeBlobs = async () => {
    setBlobAnalyzing(true);
    setBlobResult(null);

    try {
      const res = await fetch('/api/admin/cleanup-blobs');
      if (!res.ok) {
        throw new Error('Failed to analyze blobs');
      }
      const data = await res.json();
      setBlobResult(data);
    } catch (err) {
      console.error('Error analyzing blobs:', err);
      showToast('Failed to analyze storage', 'error');
    } finally {
      setBlobAnalyzing(false);
    }
  };

  const handleCleanupBlobs = async () => {
    setBlobCleaning(true);

    try {
      const res = await fetch('/api/admin/cleanup-blobs', {
        method: 'POST',
      });
      if (!res.ok) {
        throw new Error('Failed to cleanup blobs');
      }
      const data = await res.json();
      setBlobResult(data);
      showToast(`Cleaned up ${data.deletedCount || 0} orphaned files`, 'success');
    } catch (err) {
      console.error('Error cleaning up blobs:', err);
      showToast('Failed to cleanup storage', 'error');
    } finally {
      setBlobCleaning(false);
    }
  };

  const handleBackup = async () => {
    setBackingUp(true);

    try {
      const res = await fetch('/api/admin/backup');
      if (!res.ok) {
        throw new Error('Failed to create backup');
      }

      // Get the filename from Content-Disposition header
      const contentDisposition = res.headers.get('Content-Disposition');
      const filenameMatch = contentDisposition?.match(/filename="(.+)"/);
      const filename = filenameMatch ? filenameMatch[1] : 'pix3lboard-backup.json';

      // Download the file
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      showToast('Backup downloaded successfully', 'success');
    } catch (err) {
      console.error('Error creating backup:', err);
      showToast('Failed to create backup', 'error');
    } finally {
      setBackingUp(false);
    }
  };

  const handleRestoreFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';

    let data: unknown;
    try {
      const text = await file.text();
      data = JSON.parse(text);
    } catch {
      showToast('Invalid JSON file', 'error');
      return;
    }

    showConfirmDialog({
      title: 'Restore from Backup',
      message: 'This will replace ALL data (users, workspaces, boards, lists, cards, comments, attachments metadata). This action cannot be undone.',
      variant: 'danger',
      confirmText: 'Restore',
      onConfirm: () => doRestore(data),
    });
  };

  const doRestore = async (data: unknown) => {
    setRestoring(true);
    try {
      const res = await fetch('/api/admin/restore', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      const result = await res.json();

      if (!res.ok) {
        showToast(result.error || 'Restore failed', 'error');
        return;
      }

      const entries = Object.entries(result.counts as Record<string, number>)
        .map(([table, count]) => `${count} ${table}`)
        .join(', ');
      showToast(`Restored: ${entries}`, 'success');
      fetchUsers();
    } catch {
      showToast('Restore failed', 'error');
    } finally {
      setRestoring(false);
    }
  };

  const handleExportArchived = async () => {
    setExportingArchived(true);

    try {
      const res = await fetch('/api/admin/archived-cards/export');
      if (!res.ok) {
        throw new Error('Failed to export archived cards');
      }

      // Get the filename from Content-Disposition header
      const contentDisposition = res.headers.get('Content-Disposition');
      const filenameMatch = contentDisposition?.match(/filename="(.+)"/);
      const filename = filenameMatch ? filenameMatch[1] : 'pix3lboard-archived-cards.json';

      // Download the file
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      showToast('Archived cards exported successfully', 'success');
    } catch (err) {
      console.error('Error exporting archived cards:', err);
      showToast('Failed to export archived cards', 'error');
    } finally {
      setExportingArchived(false);
    }
  };

  const fetchStorageInfo = async () => {
    setStorageLoading(true);
    try {
      const res = await fetch('/api/admin/storage-info');
      if (!res.ok) throw new Error();
      setStorageInfo(await res.json());
    } catch {
      showToast('Failed to load storage info', 'error');
    } finally {
      setStorageLoading(false);
    }
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
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <Shield className="h-8 w-8 text-accent-primary" />
            <h1 className="text-2xl font-bold text-text-primary">Admin Panel</h1>
          </div>
          <Button onClick={() => setShowCreateModal(true)}>
            <UserPlus className="h-4 w-4 mr-2" />
            Create User
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
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
              <Clock className="h-5 w-5 text-yellow-500" />
              <div>
                <p className="text-sm text-text-secondary">Pending Approval</p>
                <p className="text-2xl font-bold text-text-primary">
                  {users.filter(u => !u.is_approved).length}
                </p>
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

        {/* Database Backup Section */}
        <div className="bg-bg-secondary rounded-lg border border-bg-tertiary overflow-hidden mb-8">
          <div className="p-4 border-b border-bg-tertiary flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Database className="h-5 w-5 text-accent-primary" />
              <h2 className="text-lg font-semibold text-text-primary">Database Backup</h2>
            </div>
            <div className="flex gap-2">
              <Button
                onClick={handleBackup}
                disabled={backingUp}
              >
                <Download className={`h-4 w-4 mr-2 ${backingUp ? 'animate-pulse' : ''}`} />
                {backingUp ? 'Creating backup...' : 'Download Backup'}
              </Button>
              <input
                ref={restoreInputRef}
                type="file"
                accept=".json"
                onChange={handleRestoreFileSelected}
                className="hidden"
              />
              <Button
                variant="danger"
                onClick={() => restoreInputRef.current?.click()}
                disabled={restoring}
              >
                <Upload className={`h-4 w-4 mr-2 ${restoring ? 'animate-pulse' : ''}`} />
                {restoring ? 'Restoring...' : 'Restore'}
              </Button>
            </div>
          </div>
          <div className="p-4">
            <p className="text-sm text-text-secondary">
              Download a complete backup of the database as a JSON file, or restore from a previously exported backup. This includes all users, workspaces, boards, lists, cards, comments, and attachments metadata.
            </p>
          </div>
        </div>

        {/* Archived Cards Export Section */}
        <div className="bg-bg-secondary rounded-lg border border-bg-tertiary overflow-hidden mb-8">
          <div className="p-4 border-b border-bg-tertiary flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Archive className="h-5 w-5 text-accent-primary" />
              <h2 className="text-lg font-semibold text-text-primary">Archived Cards Export</h2>
            </div>
            <Button
              onClick={handleExportArchived}
              disabled={exportingArchived}
            >
              <Download className={`h-4 w-4 mr-2 ${exportingArchived ? 'animate-pulse' : ''}`} />
              {exportingArchived ? 'Exporting...' : 'Export Archived Cards'}
            </Button>
          </div>
          <div className="p-4">
            <p className="text-sm text-text-secondary">
              Export all archived cards as a JSON file. Includes card details, workspace/board/list names, tags, checklists, and all comments with author information.
            </p>
          </div>
        </div>

        {/* Storage Usage Section */}
        <div className="bg-bg-secondary rounded-lg border border-bg-tertiary overflow-hidden mb-8">
          <div className="p-4 border-b border-bg-tertiary flex items-center justify-between">
            <div className="flex items-center gap-3">
              <HardDrive className="h-5 w-5 text-accent-primary" />
              <h2 className="text-lg font-semibold text-text-primary">Storage Usage</h2>
            </div>
            <Button
              variant="secondary"
              onClick={fetchStorageInfo}
              disabled={storageLoading}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${storageLoading ? 'animate-spin' : ''}`} />
              {storageLoading ? 'Loading...' : 'Refresh'}
            </Button>
          </div>
          <div className="p-4">
            {storageLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-bg-tertiary/50 rounded-lg p-4 animate-pulse h-20" />
                <div className="bg-bg-tertiary/50 rounded-lg p-4 animate-pulse h-20" />
              </div>
            ) : storageInfo ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-bg-tertiary/50 rounded-lg p-4 flex items-center gap-3">
                  <Database className="h-6 w-6 text-accent-primary flex-shrink-0" />
                  <div>
                    <p className="text-xs text-text-secondary">Database</p>
                    <p className="text-2xl font-bold text-text-primary">{storageInfo.db.sizeMB} MB</p>
                    <p className="text-xs text-text-secondary">
                      {storageInfo.db.pageCount} pages × {storageInfo.db.pageSize} bytes
                    </p>
                  </div>
                </div>
                <div className="bg-bg-tertiary/50 rounded-lg p-4 flex items-center gap-3">
                  <HardDrive className="h-6 w-6 text-accent-primary flex-shrink-0" />
                  <div>
                    <p className="text-xs text-text-secondary">Blob Storage</p>
                    <p className="text-2xl font-bold text-text-primary">{storageInfo.blobs.totalSizeMB} MB</p>
                    <p className="text-xs text-text-secondary">{storageInfo.blobs.count} files</p>
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-sm text-text-secondary">Storage info unavailable</p>
            )}
          </div>
        </div>

        {/* Storage Cleanup Section */}
        <div className="bg-bg-secondary rounded-lg border border-bg-tertiary overflow-hidden mb-8">
          <div className="p-4 border-b border-bg-tertiary flex items-center justify-between">
            <div className="flex items-center gap-3">
              <HardDrive className="h-5 w-5 text-accent-primary" />
              <h2 className="text-lg font-semibold text-text-primary">Storage Cleanup</h2>
            </div>
            <div className="flex gap-2">
              <Button
                variant="secondary"
                onClick={handleAnalyzeBlobs}
                disabled={blobAnalyzing || blobCleaning}
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${blobAnalyzing ? 'animate-spin' : ''}`} />
                {blobAnalyzing ? 'Analyzing...' : 'Analyze'}
              </Button>
              {blobResult && blobResult.orphanedCount > 0 && !blobResult.deletedCount && (
                <Button
                  variant="danger"
                  onClick={handleCleanupBlobs}
                  disabled={blobCleaning}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  {blobCleaning ? 'Cleaning...' : `Delete ${blobResult.orphanedCount} orphaned files`}
                </Button>
              )}
            </div>
          </div>
          <div className="p-4">
            {!blobResult ? (
              <p className="text-sm text-text-secondary">
                Click &quot;Analyze&quot; to scan for orphaned files in blob storage that are no longer referenced by any cards or attachments.
              </p>
            ) : (
              <div className="space-y-4">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="bg-bg-tertiary/50 rounded-lg p-3">
                    <p className="text-xs text-text-secondary">Total Blobs</p>
                    <p className="text-lg font-semibold text-text-primary">{blobResult.totalBlobsChecked}</p>
                  </div>
                  <div className="bg-bg-tertiary/50 rounded-lg p-3">
                    <p className="text-xs text-text-secondary">Referenced</p>
                    <p className="text-lg font-semibold text-green-600 dark:text-green-400">{blobResult.referencedCount}</p>
                  </div>
                  <div className="bg-bg-tertiary/50 rounded-lg p-3">
                    <p className="text-xs text-text-secondary">Orphaned</p>
                    <p className="text-lg font-semibold text-yellow-600 dark:text-yellow-400">{blobResult.orphanedCount}</p>
                  </div>
                  <div className="bg-bg-tertiary/50 rounded-lg p-3">
                    <p className="text-xs text-text-secondary">{blobResult.freedSpaceMB ? 'Freed Space' : 'Orphaned Size'}</p>
                    <p className="text-lg font-semibold text-accent-primary">{blobResult.freedSpaceMB || blobResult.orphanedSizeMB} MB</p>
                  </div>
                </div>
                <p className="text-sm text-text-secondary">{blobResult.message}</p>
                {blobResult.failedCount && blobResult.failedCount > 0 && (
                  <p className="text-sm text-accent-danger">Failed to delete {blobResult.failedCount} files</p>
                )}
              </div>
            )}
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
                    <th className="px-4 py-3 text-center text-sm font-medium text-text-secondary">Status</th>
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
                        <div className="flex items-center justify-center gap-1">
                          {u.is_admin && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-accent-primary/20 text-accent-primary">
                              Admin
                            </span>
                          )}
                          {!u.is_approved ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-yellow-500/20 text-yellow-600 dark:text-yellow-400">
                              Pending
                            </span>
                          ) : !u.is_admin && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-500/20 text-green-600 dark:text-green-400">
                              Approved
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-center text-sm text-text-primary">{u.workspace_count}</td>
                      <td className="px-4 py-3 text-center text-sm text-text-primary">{u.board_count}</td>
                      <td className="px-4 py-3 text-sm text-text-secondary">
                        {format(new Date(u.created_at), 'MMM d, yyyy')}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {u.id !== user.id && (
                          <div className="flex items-center justify-end gap-2">
                            {!u.is_approved && (
                              <button
                                onClick={() => handleApproveUser(u.id)}
                                disabled={approving === u.id}
                                className="inline-flex items-center gap-1 px-2 py-1 text-sm text-green-600 hover:text-green-700 dark:text-green-400 dark:hover:text-green-300 transition-colors disabled:opacity-50"
                              >
                                <UserCheck className="h-3.5 w-3.5" />
                                {approving === u.id ? 'Approving...' : 'Approve'}
                              </button>
                            )}
                            <button
                              onClick={() => setSelectedUser(u)}
                              className="inline-flex items-center gap-1 px-2 py-1 text-sm text-text-secondary hover:text-text-primary transition-colors"
                            >
                              <Key className="h-3.5 w-3.5" />
                              Reset
                            </button>
                            <button
                              onClick={() => setUserToDelete(u)}
                              className="inline-flex items-center gap-1 px-2 py-1 text-sm text-text-secondary hover:text-accent-danger transition-colors"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                              Delete
                            </button>
                          </div>
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

      {/* Delete User Modal */}
      <Modal isOpen={!!userToDelete} onClose={() => setUserToDelete(null)} title="Delete User" size="sm">
        <div className="space-y-4">
          <p className="text-sm text-text-secondary">
            Are you sure you want to delete <span className="font-medium text-text-primary">{userToDelete?.email}</span>?
          </p>
          <p className="text-sm text-accent-danger">
            This will permanently delete all their workspaces, boards, and cards.
          </p>

          <div className="flex gap-3 justify-end pt-2">
            <Button variant="ghost" onClick={() => setUserToDelete(null)}>
              Cancel
            </Button>
            <Button variant="danger" onClick={handleDeleteUser} disabled={deleting}>
              {deleting ? 'Deleting...' : 'Delete User'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Create User Modal */}
      <Modal isOpen={showCreateModal} onClose={closeCreateModal} title="Create User" size="sm">
        <form onSubmit={handleCreateUser} className="space-y-4">
          <p className="text-sm text-text-secondary">
            Create a new user account. The user will be automatically approved.
          </p>

          <Input
            type="email"
            label="Email"
            value={newUserEmail}
            onChange={(e) => setNewUserEmail(e.target.value)}
            required
            autoComplete="email"
            placeholder="user@example.com"
          />

          <Input
            type="text"
            label="Name (optional)"
            value={newUserName}
            onChange={(e) => setNewUserName(e.target.value)}
            autoComplete="name"
            placeholder="John Doe"
          />

          <Input
            type="password"
            label="Password"
            value={newUserPassword}
            onChange={(e) => setNewUserPassword(e.target.value)}
            required
            minLength={8}
            autoComplete="new-password"
            placeholder="Min 8 chars, upper, lower, number"
          />

          {createError && <p className="text-sm text-accent-danger">{createError}</p>}

          <div className="flex gap-3 justify-end pt-2">
            <Button type="button" variant="ghost" onClick={closeCreateModal}>
              Cancel
            </Button>
            <Button type="submit" disabled={creating}>
              {creating ? 'Creating...' : 'Create User'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
