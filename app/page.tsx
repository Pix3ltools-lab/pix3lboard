'use client';

import { useState } from 'react';
import { useData } from '@/lib/context/DataContext';
import { useUI } from '@/lib/context/UIContext';
import { useAuth } from '@/lib/context/AuthContext';
import { Header } from '@/components/layout/Header';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { IconPicker } from '@/components/ui/IconPicker';
import { ColorPicker } from '@/components/ui/ColorPicker';
import { Spinner } from '@/components/ui/Spinner';
import { WorkspaceList } from '@/components/workspace/WorkspaceList';
import { Workspace } from '@/types';

export default function Home() {
  const { workspaces, createWorkspace, updateWorkspace, deleteWorkspace, isInitialized } = useData();
  const { isAuthenticated } = useAuth();
  const { showToast, showConfirmDialog } = useUI();
  const [showModal, setShowModal] = useState(false);
  const [editingWorkspace, setEditingWorkspace] = useState<Workspace | null>(null);
  const [newWorkspaceName, setNewWorkspaceName] = useState('');
  const [selectedIcon, setSelectedIcon] = useState('💼');
  const [selectedColor, setSelectedColor] = useState('#8b5cf6');

  const handleSubmitWorkspace = () => {
    if (!newWorkspaceName.trim()) {
      showToast('Please enter a workspace name', 'error');
      return;
    }

    if (editingWorkspace) {
      // Update existing workspace
      updateWorkspace(editingWorkspace.id, {
        name: newWorkspaceName,
        icon: selectedIcon,
        color: selectedColor,
      });
      showToast('Workspace updated', 'success');
    } else {
      // Create new workspace
      const workspace = createWorkspace({
        name: newWorkspaceName,
        icon: selectedIcon,
        color: selectedColor,
      });
      showToast(`Created workspace: ${workspace.name}`, 'success');
    }

    setShowModal(false);
    setEditingWorkspace(null);
    setNewWorkspaceName('');
    setSelectedIcon('💼');
    setSelectedColor('#8b5cf6');
  };

  const handleDeleteWorkspace = (id: string, name: string) => {
    showConfirmDialog({
      title: 'Delete Workspace',
      message: `Are you sure you want to delete "${name}"? This action cannot be undone.`,
      confirmText: 'Delete',
      variant: 'danger',
      onConfirm: () => {
        deleteWorkspace(id);
        showToast('Workspace deleted', 'success');
      },
    });
  };

  if (!isInitialized) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <>
      <Header />
      <main className="min-h-screen p-4 sm:p-6 md:p-8">
        <div className="max-w-4xl mx-auto">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6 sm:mb-8">
            <div>
              <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-2">
                Welcome to <span>Pix<span style={{ color: '#ef4444' }}>3</span><span style={{ color: '#3b82f6' }}>l</span>Board</span>
              </h1>
              <p className="text-sm sm:text-base md:text-lg text-text-secondary">
                Your privacy-first project management tool
              </p>
            </div>
            {isAuthenticated && (
              <Button onClick={() => setShowModal(true)} className="w-full sm:w-auto">
                Create Workspace
              </Button>
            )}
          </div>

          <div className="space-y-6">
            {/* Experimental Warning */}
            <div className="p-4 bg-yellow-500/10 border border-yellow-500/50 rounded-lg">
              <h3 className="font-semibold text-yellow-600 dark:text-yellow-400 mb-2 flex items-center gap-2">
                ⚠️ Experimental Demo
              </h3>
              <p className="text-sm text-text-secondary">
                This is an <strong>experimental version</strong> of Pix3lBoard. Data persistence is not guaranteed
                and may be reset at any time. Use this only as a demo. The project source code is available on{' '}
                <a
                  href="https://github.com/Pix3ltools-lab/pix3lboard"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-accent-primary hover:underline"
                >
                  GitHub
                </a>.
              </p>
            </div>

            {/* Cloud Storage Info */}
            <div className="p-4 bg-accent-primary/10 border border-accent-primary/20 rounded-lg">
              <h3 className="font-semibold text-text-primary mb-2 flex items-center gap-2">
                ☁️ Cloud Storage
              </h3>
              <p className="text-sm text-text-secondary mb-2">
                Your data is stored <strong>securely in the cloud</strong> and associated with your account.
                This means:
              </p>
              <ul className="text-sm text-text-secondary space-y-1 ml-4">
                <li>• Your data is automatically synced across all your devices</li>
                <li>• You can access your workspaces from any browser by logging in</li>
                <li>• Your data is safe even if you clear your browser cache</li>
              </ul>
              <p className="text-sm text-accent-primary mt-2">
                💡 Tip: You can still export your data as JSON backup from each board
              </p>
            </div>
            {/* Workspaces */}
            {workspaces.length > 0 ? (
              <div>
                <h3 className="text-xl font-semibold mb-4">
                  Your Workspaces ({workspaces.length})
                </h3>
                <WorkspaceList
                  workspaces={workspaces}
                  onEdit={(ws) => {
                    setSelectedIcon(ws.icon || '💼');
                    setSelectedColor(ws.color || '#8b5cf6');
                    setNewWorkspaceName(ws.name);
                    setEditingWorkspace(ws);
                    setShowModal(true);
                  }}
                  onDelete={(ws) => handleDeleteWorkspace(ws.id, ws.name)}
                />
              </div>
            ) : (
              <div className="p-12 bg-bg-secondary rounded-lg text-center">
                {isAuthenticated ? (
                  <>
                    <p className="text-text-secondary mb-4">
                      No workspaces yet. Create your first one to get started!
                    </p>
                    <Button onClick={() => setShowModal(true)}>
                      Create Your First Workspace
                    </Button>
                  </>
                ) : (
                  <p className="text-text-secondary">
                    Log in to create workspaces and start managing your projects.
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Create/Edit Workspace Modal */}
      <Modal
        isOpen={showModal}
        onClose={() => {
          setShowModal(false);
          setEditingWorkspace(null);
        }}
        title={editingWorkspace ? 'Edit Workspace' : 'Create New Workspace'}
        size="md"
      >
        <div className="space-y-4">
          <Input
            label="Workspace Name"
            value={newWorkspaceName}
            onChange={(e) => setNewWorkspaceName(e.target.value)}
            placeholder="My Project"
          />

          <IconPicker
            label="Icon"
            value={selectedIcon}
            onChange={setSelectedIcon}
          />

          <ColorPicker
            label="Color"
            value={selectedColor}
            onChange={setSelectedColor}
          />

          <div className="flex gap-3 justify-end pt-4">
            <Button
              variant="ghost"
              onClick={() => {
                setShowModal(false);
                setEditingWorkspace(null);
              }}
            >
              Cancel
            </Button>
            <Button onClick={handleSubmitWorkspace}>
              {editingWorkspace ? 'Save Changes' : 'Create Workspace'}
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}
