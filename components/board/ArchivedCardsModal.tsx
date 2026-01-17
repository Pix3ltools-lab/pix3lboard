'use client';

import { useState, useEffect } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { SearchBar } from '@/components/ui/SearchBar';
import { ArchiveRestore, Trash2 } from 'lucide-react';
import { useUI } from '@/lib/context/UIContext';

interface ArchivedCard {
  id: string;
  listId: string;
  listName: string;
  title: string;
  description?: string;
  type?: string;
  tags?: string[];
  createdAt: string;
  updatedAt: string;
}

interface ArchivedCardsModalProps {
  isOpen: boolean;
  onClose: () => void;
  boardId: string;
  onRestore: (cardId: string) => void;
}

export function ArchivedCardsModal({
  isOpen,
  onClose,
  boardId,
  onRestore,
}: ArchivedCardsModalProps) {
  const { showToast, showConfirmDialog } = useUI();
  const [cards, setCards] = useState<ArchivedCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (isOpen) {
      fetchArchivedCards();
    }
  }, [isOpen, boardId]);

  const fetchArchivedCards = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/boards/${boardId}/archived-cards`);
      if (!res.ok) throw new Error('Failed to fetch archived cards');
      const data = await res.json();
      setCards(data.cards);
    } catch (error) {
      showToast('Failed to load archived cards', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleRestore = async (card: ArchivedCard) => {
    try {
      const res = await fetch(`/api/cards/${card.id}/archive`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ archive: false }),
      });

      if (!res.ok) throw new Error('Failed to restore card');

      setCards(cards.filter(c => c.id !== card.id));
      onRestore(card.id);
      showToast('Card restored', 'success');
    } catch (error) {
      showToast('Failed to restore card', 'error');
    }
  };

  const handleDelete = (card: ArchivedCard) => {
    showConfirmDialog({
      title: 'Delete Card Permanently',
      message: `Are you sure you want to permanently delete "${card.title}"? This action cannot be undone.`,
      confirmText: 'Delete',
      variant: 'danger',
      onConfirm: async () => {
        try {
          const res = await fetch(`/api/cards/${card.id}`, {
            method: 'DELETE',
          });

          if (!res.ok) throw new Error('Failed to delete card');

          setCards(cards.filter(c => c.id !== card.id));
          showToast('Card deleted permanently', 'success');
        } catch (error) {
          showToast('Failed to delete card', 'error');
        }
      },
    });
  };

  const filteredCards = cards.filter(card =>
    card.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    card.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    card.tags?.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Archived Cards" size="lg">
      <div className="space-y-4">
        {/* Search */}
        <SearchBar
          value={searchQuery}
          onChange={setSearchQuery}
          placeholder="Search archived cards..."
        />

        {/* Cards List */}
        <div className="max-h-[400px] overflow-y-auto">
          {loading ? (
            <div className="text-center py-8 text-text-secondary">Loading...</div>
          ) : filteredCards.length === 0 ? (
            <div className="text-center py-8 text-text-secondary">
              {cards.length === 0
                ? 'No archived cards'
                : 'No cards match your search'}
            </div>
          ) : (
            <div className="space-y-2">
              {filteredCards.map(card => (
                <div
                  key={card.id}
                  className="bg-bg-secondary rounded-lg p-3 border border-bg-tertiary"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium text-text-primary truncate">
                        {card.title}
                      </h4>
                      <p className="text-xs text-text-secondary mt-1">
                        From: {card.listName}
                      </p>
                      {card.description && (
                        <p className="text-sm text-text-secondary mt-1 line-clamp-2">
                          {card.description}
                        </p>
                      )}
                      {card.tags && card.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {card.tags.map(tag => (
                            <span
                              key={tag}
                              className="px-2 py-0.5 text-xs bg-bg-tertiary rounded"
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRestore(card)}
                        title="Restore card"
                      >
                        <ArchiveRestore className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(card)}
                        className="text-accent-danger hover:text-accent-danger"
                        title="Delete permanently"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end pt-2 border-t border-bg-tertiary">
          <Button variant="ghost" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </Modal>
  );
}
