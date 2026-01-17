'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useData } from '@/lib/context/DataContext';
import { useUI } from '@/lib/context/UIContext';
import { Header } from '@/components/layout/Header';
import { Breadcrumb } from '@/components/layout/Breadcrumb';
import { KanbanBoard } from '@/components/kanban/KanbanBoard';
import { CardModal } from '@/components/kanban/CardModal';
import { BoardToolbar } from '@/components/board/BoardToolbar';
import { ArchivedCardsModal } from '@/components/board/ArchivedCardsModal';
import { Spinner } from '@/components/ui/Spinner';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { Card } from '@/types';

export default function BoardPage() {
  const params = useParams();
  const router = useRouter();
  const workspaceId = params.id as string;
  const boardId = params.boardId as string;

  const {
    getWorkspace,
    getBoard,
    updateBoard,
    createList,
    updateList,
    deleteList,
    reorderLists,
    createCard,
    updateCard,
    deleteCard,
    duplicateCard,
    moveCard,
    getCard,
    exportData,
    importData,
    isInitialized,
  } = useData();
  const { showToast, showConfirmDialog } = useUI();

  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);
  const [showArchivedModal, setShowArchivedModal] = useState(false);

  const workspace = getWorkspace(workspaceId);
  const board = getBoard(boardId);
  const selectedCard = selectedCardId ? getCard(selectedCardId) : null;

  useEffect(() => {
    // Redirect if workspace or board not found
    if (isInitialized && (!workspace || !board)) {
      showToast('Board not found', 'error');
      router.push('/');
    }
  }, [isInitialized, workspace, board, router, showToast]);

  const handleAddList = (name: string) => {
    if (!board) return;
    createList(boardId, { name });
    showToast('List created', 'success');
  };

  const handleRenameList = (listId: string, newName: string) => {
    updateList(listId, { name: newName });
    showToast('List renamed', 'success');
  };

  const handleUpdateListColor = (listId: string, color: string) => {
    updateList(listId, { color: color || undefined });
    showToast('List color updated', 'success');
  };

  const handleDeleteList = (listId: string) => {
    const list = board?.lists.find(l => l.id === listId);
    if (!list) return;

    const cardCount = list.cards.length;
    const message = cardCount > 0
      ? `Are you sure you want to delete "${list.name}"? This will delete ${cardCount} ${cardCount === 1 ? 'card' : 'cards'}. This action cannot be undone.`
      : `Are you sure you want to delete "${list.name}"?`;

    showConfirmDialog({
      title: 'Delete List',
      message,
      confirmText: 'Delete',
      variant: 'danger',
      onConfirm: () => {
        deleteList(listId);
        showToast('List deleted', 'success');
      },
    });
  };

  const handleAddCard = (listId: string, title: string) => {
    createCard(listId, { title });
    showToast('Card created', 'success');
  };

  const handleCardClick = (cardId: string) => {
    setSelectedCardId(cardId);
  };

  const handleUpdateCard = (cardId: string, data: Partial<Card>) => {
    updateCard(cardId, data);
    showToast('Card updated', 'success');
  };

  const handleDeleteCard = (cardId: string) => {
    showConfirmDialog({
      title: 'Delete Card',
      message: 'Are you sure you want to delete this card? This action cannot be undone.',
      confirmText: 'Delete',
      variant: 'danger',
      onConfirm: () => {
        deleteCard(cardId);
        showToast('Card deleted', 'success');
      },
    });
  };

  const handleDuplicateCard = (cardId: string) => {
    const duplicated = duplicateCard(cardId);
    if (duplicated) {
      showToast('Card duplicated', 'success');
    }
  };

  const handleArchiveCard = async (cardId: string) => {
    try {
      const res = await fetch(`/api/cards/${cardId}/archive`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ archive: true }),
      });

      if (!res.ok) {
        throw new Error('Failed to archive card');
      }

      // Remove card from local state by deleting it (it's still in DB but archived)
      deleteCard(cardId);
      showToast('Card archived', 'success');
    } catch (error) {
      showToast('Failed to archive card', 'error');
    }
  };

  const handleReorderLists = (boardId: string, listIds: string[]) => {
    reorderLists(boardId, listIds);
  };

  const handleMoveCard = (cardId: string, targetListId: string, targetIndex: number) => {
    moveCard(cardId, targetListId, targetIndex);
  };

  const handleExport = () => {
    exportData();
    showToast('Data exported successfully', 'success');
  };

  const handleImport = async (file: File) => {
    try {
      await importData(file);
      showToast('Data imported successfully', 'success');
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Import failed', 'error');
    }
  };

  const handleRestoreCard = () => {
    // Reload the page to get updated data from server
    window.location.reload();
  };

  const handleDeleteArchivedCard = (cardId: string) => {
    // Card is already archived, just delete it
    deleteCard(cardId);
  };

  const handleTogglePublic = async (makePublic: boolean) => {
    try {
      const res = await fetch(`/api/boards/${boardId}/public`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isPublic: makePublic }),
      });

      if (!res.ok) {
        throw new Error('Failed to update board visibility');
      }

      // Update local state (this will also sync to server)
      updateBoard(boardId, { isPublic: makePublic });
      showToast(makePublic ? 'Board is now public' : 'Board is now private', 'success');
    } catch (error) {
      showToast('Failed to update board visibility', 'error');
    }
  };

  const handleBackgroundChange = (background: string) => {
    updateBoard(boardId, { background: background || undefined });
    showToast('Background updated', 'success');
  };

  // Collect all unique tags from all cards in the board
  const availableTags = board
    ? Array.from(
        new Set(
          board.lists.flatMap((list) =>
            list.cards.flatMap((card) => card.tags || [])
          )
        )
      ).sort()
    : [];

  if (!isInitialized || !workspace || !board) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col">
      <Header />

      {/* Board Header */}
      <div className="border-b bg-bg-primary p-3 sm:p-4">
        <div className="max-w-full">
          {/* Back button + Breadcrumb */}
          <div className="mb-2 sm:mb-3">
            <Link
              href={`/workspace/${workspaceId}`}
              className="inline-flex items-center gap-2 text-text-secondary hover:text-text-primary transition-colors mb-2 text-sm"
            >
              <ArrowLeft className="h-4 w-4" />
              <span className="hidden sm:inline">Back to workspace</span>
              <span className="sm:hidden">Back</span>
            </Link>

            <div className="hidden sm:block">
              <Breadcrumb
                items={[
                  { label: 'Workspaces', href: '/' },
                  { label: workspace.name, href: `/workspace/${workspaceId}`, icon: workspace.icon },
                  { label: board.name },
                ]}
              />
            </div>
          </div>

          {/* Board title and description */}
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-text-primary mb-1">{board.name}</h1>
            {board.description && (
              <p className="text-xs sm:text-sm text-text-secondary line-clamp-2">{board.description}</p>
            )}
          </div>
        </div>
      </div>

      {/* Board Toolbar */}
      <BoardToolbar
        availableTags={availableTags}
        onExport={handleExport}
        onImport={handleImport}
        onShowArchive={() => setShowArchivedModal(true)}
        boardId={boardId}
        isPublic={board.isPublic}
        onTogglePublic={handleTogglePublic}
        background={board.background}
        onBackgroundChange={handleBackgroundChange}
      />

      {/* Kanban Board */}
      <main
        className="flex-1 overflow-hidden transition-colors duration-300"
        style={{ backgroundColor: board.background || undefined }}
      >
        <KanbanBoard
          board={board}
          onCardClick={handleCardClick}
          onAddCard={handleAddCard}
          onAddList={handleAddList}
          onRenameList={handleRenameList}
          onDeleteList={handleDeleteList}
          onUpdateListColor={handleUpdateListColor}
          onReorderLists={handleReorderLists}
          onMoveCard={handleMoveCard}
        />
      </main>

      {/* Card Detail Modal */}
      {selectedCard && (
        <CardModal
          isOpen={!!selectedCard}
          onClose={() => setSelectedCardId(null)}
          card={selectedCard}
          allowedCardTypes={board.allowedCardTypes}
          onUpdate={handleUpdateCard}
          onDelete={handleDeleteCard}
          onDuplicate={handleDuplicateCard}
          onArchive={handleArchiveCard}
        />
      )}

      {/* Archived Cards Modal */}
      <ArchivedCardsModal
        isOpen={showArchivedModal}
        onClose={() => setShowArchivedModal(false)}
        boardId={boardId}
        onRestore={handleRestoreCard}
        onDelete={handleDeleteArchivedCard}
      />
    </div>
  );
}
