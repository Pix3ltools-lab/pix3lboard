'use client';

import { useState, useEffect } from 'react';
import { Board } from '@/types';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { Button } from '@/components/ui/Button';

interface BoardFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: Partial<Board>, useTemplate: boolean) => void;
  board?: Board; // If editing
}

export function BoardForm({ isOpen, onClose, onSubmit, board }: BoardFormProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [useTemplate, setUseTemplate] = useState(false);

  // Load board data if editing
  useEffect(() => {
    if (board) {
      setName(board.name);
      setDescription(board.description || '');
      setUseTemplate(false); // Template only for create
    } else {
      // Reset for create
      setName('');
      setDescription('');
      setUseTemplate(false);
    }
  }, [board, isOpen]);

  const handleSubmit = () => {
    if (!name.trim()) return;

    onSubmit(
      {
        name: name.trim(),
        description: description.trim() || undefined,
      },
      useTemplate
    );

    handleClose();
  };

  const handleClose = () => {
    setName('');
    setDescription('');
    setUseTemplate(false);
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={board ? 'Edit Board' : 'Create New Board'}
      size="md"
    >
      <div className="space-y-4">
        <Input
          label="Board Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g., Neon Dreams Music Video"
          autoFocus
        />

        <Textarea
          label="Description (optional)"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="What is this board for?"
          rows={3}
        />

        {/* Template option (only for create) */}
        {!board && (
          <div className="p-4 bg-bg-secondary rounded-lg border border-bg-tertiary">
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={useTemplate}
                onChange={(e) => setUseTemplate(e.target.checked)}
                className="mt-1"
              />
              <div>
                <div className="font-medium text-text-primary mb-1">
                  Use &quot;AI Music Video&quot; Template
                </div>
                <div className="text-sm text-text-secondary">
                  Creates a board with 6 pre-configured lists (Ideas, Music, Visuals, Video, Edit,
                  Done) and 3 example cards to help you get started.
                </div>
              </div>
            </label>
          </div>
        )}

        <div className="flex gap-3 justify-end pt-4">
          <Button variant="ghost" onClick={handleClose}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={!name.trim()}>
            {board ? 'Save Changes' : 'Create Board'}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
