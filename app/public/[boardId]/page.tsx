'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { Header } from '@/components/layout/Header';
import { Spinner } from '@/components/ui/Spinner';
import { Globe, Eye } from 'lucide-react';
import type { Board, Card } from '@/types';
import { clsx } from 'clsx';

// Read-only card component
function PublicCard({ card }: { card: Card }) {
  const [expanded, setExpanded] = useState(false);

  const hasChecklist = card.checklist && card.checklist.length > 0;
  const checklistDone = card.checklist?.filter(i => i.checked).length || 0;
  const checklistTotal = card.checklist?.length || 0;
  const checklistComplete = hasChecklist && checklistDone === checklistTotal;

  return (
    <div
      className="bg-bg-secondary rounded-lg p-3 shadow-sm border border-bg-tertiary cursor-pointer hover:border-accent-primary/50 transition-colors"
      onClick={() => setExpanded(!expanded)}
    >
      <h4 className="font-medium text-text-primary text-sm">{card.title}</h4>

      {/* Tags */}
      {card.tags && card.tags.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-2">
          {card.tags.map((tag, i) => (
            <span
              key={i}
              className="px-2 py-0.5 text-xs rounded-full bg-accent-primary/20 text-accent-primary"
            >
              {tag}
            </span>
          ))}
        </div>
      )}

      {/* Indicators */}
      <div className="flex items-center gap-2 mt-2 text-xs text-text-secondary">
        {card.dueDate && (
          <span className="flex items-center gap-1">
            {new Date(card.dueDate).toLocaleDateString()}
          </span>
        )}
        {hasChecklist && (
          <span className={clsx(
            'flex items-center gap-1',
            checklistComplete && 'text-green-500'
          )}>
            {checklistDone}/{checklistTotal}
          </span>
        )}
        {(card.commentCount ?? 0) > 0 && (
          <span>{card.commentCount} comments</span>
        )}
      </div>

      {/* Expanded details */}
      {expanded && card.description && (
        <p className="mt-3 text-sm text-text-secondary border-t border-bg-tertiary pt-3">
          {card.description}
        </p>
      )}
    </div>
  );
}

// Read-only list component
function PublicList({ name, cards }: { name: string; cards: Card[] }) {
  return (
    <div className="bg-bg-tertiary rounded-xl p-3 min-w-[280px] max-w-[280px] flex flex-col max-h-full">
      <h3 className="font-semibold text-text-primary mb-3 px-1">{name}</h3>
      <div className="flex flex-col gap-2 overflow-y-auto flex-1">
        {cards.map(card => (
          <PublicCard key={card.id} card={card} />
        ))}
        {cards.length === 0 && (
          <p className="text-text-secondary text-sm text-center py-4">No cards</p>
        )}
      </div>
    </div>
  );
}

export default function PublicBoardPage() {
  const params = useParams();
  const boardId = params.boardId as string;

  const [board, setBoard] = useState<Board | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadBoard() {
      try {
        const res = await fetch(`/api/public/boards/${boardId}`);
        if (!res.ok) {
          if (res.status === 404) {
            setError('Board not found or not public');
          } else {
            setError('Failed to load board');
          }
          return;
        }
        const data = await res.json();
        setBoard(data.board);
      } catch {
        setError('Failed to load board');
      } finally {
        setLoading(false);
      }
    }
    loadBoard();
  }, [boardId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-bg-primary flex items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  if (error || !board) {
    return (
      <div className="min-h-screen bg-bg-primary">
        <Header />
        <div className="flex items-center justify-center h-[calc(100vh-4rem)]">
          <div className="text-center">
            <Globe className="w-16 h-16 text-text-secondary mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-text-primary mb-2">Board Not Available</h1>
            <p className="text-text-secondary">{error || 'This board is not public or does not exist.'}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bg-primary flex flex-col">
      <Header />

      {/* Board Header */}
      <div className="border-b border-bg-tertiary bg-bg-secondary/50 px-4 py-3">
        <div className="container mx-auto flex items-center gap-3">
          <div className="flex items-center gap-2 text-accent-primary">
            <Globe className="w-5 h-5" />
            <span className="text-sm font-medium">Public Board</span>
          </div>
          <div className="h-4 w-px bg-bg-tertiary" />
          <h1 className="text-xl font-bold text-text-primary">{board.name}</h1>
          {board.description && (
            <>
              <div className="h-4 w-px bg-bg-tertiary" />
              <p className="text-sm text-text-secondary">{board.description}</p>
            </>
          )}
          <div className="ml-auto flex items-center gap-2 text-text-secondary text-sm">
            <Eye className="w-4 h-4" />
            <span>Read-only view</span>
          </div>
        </div>
      </div>

      {/* Kanban Board */}
      <div className="flex-1 overflow-x-auto p-4">
        <div className="flex gap-4 h-full">
          {board.lists
            .sort((a, b) => a.position - b.position)
            .map(list => (
              <PublicList
                key={list.id}
                name={list.name}
                cards={list.cards.sort((a, b) => a.position - b.position)}
              />
            ))}
          {board.lists.length === 0 && (
            <div className="flex items-center justify-center w-full text-text-secondary">
              <p>This board has no lists yet.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
