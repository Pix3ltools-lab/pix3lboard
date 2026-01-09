'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useData } from '@/lib/context/DataContext';
import { useUI } from '@/lib/context/UIContext';
import { Header } from '@/components/layout/Header';
import { Breadcrumb } from '@/components/layout/Breadcrumb';
import { Button } from '@/components/ui/Button';
import { Spinner } from '@/components/ui/Spinner';
import { BoardList } from '@/components/board/BoardList';
import { BoardForm, TemplateType } from '@/components/board/BoardForm';
import { Board } from '@/types';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function WorkspacePage() {
  const params = useParams();
  const router = useRouter();
  const workspaceId = params.id as string;

  const {
    getWorkspace,
    createBoard,
    updateBoard,
    deleteBoard,
    duplicateBoard,
    isInitialized,
  } = useData();
  const { showToast, showConfirmDialog } = useUI();

  const [showBoardForm, setShowBoardForm] = useState(false);
  const [editingBoard, setEditingBoard] = useState<Board | null>(null);

  const workspace = getWorkspace(workspaceId);

  useEffect(() => {
    // Redirect if workspace not found
    if (isInitialized && !workspace) {
      showToast('Workspace not found', 'error');
      router.push('/');
    }
  }, [isInitialized, workspace, router, showToast]);

  const handleCreateBoard = (data: Partial<Board>, templateType: TemplateType) => {
    if (!workspace) return;

    if (editingBoard) {
      // Update existing board
      updateBoard(editingBoard.id, data);
      showToast('Board updated', 'success');
    } else {
      // Create new board
      const board = createBoard(workspaceId, data, templateType);
      showToast(`Created board: ${board.name}`, 'success');
    }

    setShowBoardForm(false);
    setEditingBoard(null);
  };

  const handleDeleteBoard = (board: Board) => {
    showConfirmDialog({
      title: 'Delete Board',
      message: `Are you sure you want to delete "${board.name}"? This will delete all lists and cards inside it. This action cannot be undone.`,
      confirmText: 'Delete',
      variant: 'danger',
      onConfirm: () => {
        deleteBoard(board.id);
        showToast('Board deleted', 'success');
      },
    });
  };

  const handleDuplicateBoard = (board: Board) => {
    const duplicated = duplicateBoard(board.id);
    if (duplicated) {
      showToast(`Duplicated board: ${duplicated.name}`, 'success');
    }
  };

  if (!isInitialized || !workspace) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <>
      <Header />
      <main className="min-h-screen p-8">
        <div className="max-w-7xl mx-auto">
          {/* Back button + Breadcrumb */}
          <div className="mb-6">
            <Link
              href="/"
              className="inline-flex items-center gap-2 text-text-secondary hover:text-text-primary transition-colors mb-4"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to workspaces
            </Link>

            <Breadcrumb
              items={[
                { label: 'Workspaces', href: '/' },
                { label: workspace.name, icon: workspace.icon },
              ]}
            />
          </div>

          {/* Header */}
          <div className="flex items-start justify-between mb-8">
            <div className="flex items-center gap-4">
              <div
                className="w-16 h-16 rounded-lg flex items-center justify-center text-3xl"
                style={{ backgroundColor: workspace.color }}
              >
                {workspace.icon}
              </div>
              <div>
                <h1 className="text-4xl font-bold mb-2">{workspace.name}</h1>
                {workspace.description && (
                  <p className="text-lg text-text-secondary">{workspace.description}</p>
                )}
              </div>
            </div>

            <Button onClick={() => setShowBoardForm(true)}>Create Board</Button>
          </div>

          {/* Boards grid */}
          {workspace.boards.length > 0 ? (
            <div>
              <h2 className="text-xl font-semibold mb-4">
                Boards ({workspace.boards.length})
              </h2>
              <BoardList
                boards={workspace.boards}
                workspaceId={workspaceId}
                onEdit={(board) => {
                  setEditingBoard(board);
                  setShowBoardForm(true);
                }}
                onDelete={handleDeleteBoard}
                onDuplicate={handleDuplicateBoard}
              />
            </div>
          ) : (
            <div className="p-12 bg-bg-secondary rounded-lg text-center">
              <p className="text-text-secondary mb-4">
                No boards yet. Create your first board to start organizing!
              </p>
              <Button onClick={() => setShowBoardForm(true)}>Create Your First Board</Button>
            </div>
          )}
        </div>
      </main>

      {/* Board Form Modal */}
      <BoardForm
        isOpen={showBoardForm}
        onClose={() => {
          setShowBoardForm(false);
          setEditingBoard(null);
        }}
        onSubmit={handleCreateBoard}
        board={editingBoard || undefined}
      />
    </>
  );
}
