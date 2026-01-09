'use client';

import { useState } from 'react';
import { Plus, X } from 'lucide-react';
import { Button } from '@/components/ui/Button';

interface AddCardProps {
  onAdd: (title: string) => void;
}

export function AddCard({ onAdd }: AddCardProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [title, setTitle] = useState('');

  const handleSubmit = () => {
    if (!title.trim()) return;
    onAdd(title.trim());
    setTitle('');
    setIsAdding(false);
  };

  const handleCancel = () => {
    setTitle('');
    setIsAdding(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    } else if (e.key === 'Escape') {
      handleCancel();
    }
  };

  if (!isAdding) {
    return (
      <button
        onClick={() => setIsAdding(true)}
        className="w-full p-3 text-left text-sm text-text-secondary hover:bg-bg-secondary rounded-lg transition-colors flex items-center gap-2"
      >
        <Plus className="h-4 w-4" />
        Add a card
      </button>
    );
  }

  return (
    <div className="bg-bg-primary rounded-lg border-2 border-accent-primary p-3">
      <textarea
        autoFocus
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Enter card title..."
        className="w-full bg-transparent border-none outline-none text-sm text-text-primary placeholder-text-secondary resize-none"
        rows={3}
      />
      <div className="flex items-center gap-2 mt-2">
        <Button size="sm" onClick={handleSubmit} disabled={!title.trim()}>
          Add Card
        </Button>
        <button
          onClick={handleCancel}
          className="p-1 hover:bg-bg-tertiary rounded transition-colors"
        >
          <X className="h-4 w-4 text-text-secondary" />
        </button>
      </div>
    </div>
  );
}
