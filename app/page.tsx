'use client';

import { useState } from 'react';
import { useData } from '@/lib/context/DataContext';
import { useUI } from '@/lib/context/UIContext';
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
            <Button onClick={() => setShowModal(true)} className="w-full sm:w-auto">
              Create Workspace
            </Button>
          </div>

          <div className="space-y-6">
            {/* Privacy & Backup Info */}
            <div className="p-4 bg-accent-primary/10 border border-accent-primary/20 rounded-lg">
              <h3 className="font-semibold text-text-primary mb-2 flex items-center gap-2">
                🔒 Your Privacy is Protected
              </h3>
              <p className="text-sm text-text-secondary mb-2">
                All your data is stored <strong>locally in your browser</strong> - nothing is sent to any server.
                This guarantees complete privacy, but also means:
              </p>
              <ul className="text-sm text-text-secondary space-y-1 ml-4">
                <li>• Your data may be lost if you clear browser cache or reinstall the browser</li>
                <li>• Data is not synced between different devices or browsers</li>
                <li>• <strong>We recommend exporting your data regularly as backup</strong></li>
              </ul>
              <p className="text-sm text-accent-primary mt-2">
                💡 Tip: Use the export feature in each board to download a JSON backup of your work
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
                <p className="text-text-secondary mb-4">
                  No workspaces yet. Create your first one to get started!
                </p>
                <Button onClick={() => setShowModal(true)}>
                  Create Your First Workspace
                </Button>
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
