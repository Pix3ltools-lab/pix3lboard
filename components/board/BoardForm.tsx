'use client';

import { useState, useEffect } from 'react';
import { Board } from '@/types';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { Button } from '@/components/ui/Button';

export type TemplateType = 'none' | 'ai-music' | 'project-management';

interface BoardFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: Partial<Board>, templateType: TemplateType) => void;
  board?: Board; // If editing
}

export function BoardForm({ isOpen, onClose, onSubmit, board }: BoardFormProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [templateType, setTemplateType] = useState<TemplateType>('none');

  // Load board data if editing
  useEffect(() => {
    if (board) {
      setName(board.name);
      setDescription(board.description || '');
      setTemplateType('none'); // Template only for create
    } else {
      // Reset for create
      setName('');
      setDescription('');
      setTemplateType('none');
    }
  }, [board, isOpen]);

  const handleSubmit = () => {
    if (!name.trim()) return;

    onSubmit(
      {
        name: name.trim(),
        description: description.trim() || undefined,
      },
      templateType
    );

    handleClose();
  };

  const handleClose = () => {
    setName('');
    setDescription('');
    setTemplateType('none');
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
          placeholder="My Board"
          autoFocus
        />

        <Textarea
          label="Description (optional)"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="What is this board for?"
          rows={3}
        />

        {/* Template options (only for create) */}
        {!board && (
          <div className="space-y-3">
            <label className="block text-sm font-medium text-text-primary">
              Board Template
            </label>

            <div className="space-y-2">
              {/* Empty board */}
              <label className="flex items-start gap-3 p-3 bg-bg-secondary rounded-lg border border-bg-tertiary cursor-pointer hover:border-accent-primary/50 transition-colors">
                <input
                  type="radio"
                  name="template"
                  value="none"
                  checked={templateType === 'none'}
                  onChange={(e) => setTemplateType(e.target.value as TemplateType)}
                  className="mt-1"
                />
                <div>
                  <div className="font-medium text-text-primary mb-1">
                    Empty Board
                  </div>
                  <div className="text-sm text-text-secondary">
                    Start with a blank board and create your own lists
                  </div>
                </div>
              </label>

              {/* Project Management template */}
              <label className="flex items-start gap-3 p-3 bg-bg-secondary rounded-lg border border-bg-tertiary cursor-pointer hover:border-accent-primary/50 transition-colors">
                <input
                  type="radio"
                  name="template"
                  value="project-management"
                  checked={templateType === 'project-management'}
                  onChange={(e) => setTemplateType(e.target.value as TemplateType)}
                  className="mt-1"
                />
                <div>
                  <div className="font-medium text-text-primary mb-1">
                    📋 Project Management Template
                  </div>
                  <div className="text-sm text-text-secondary">
                    5 lists: To Do, In Progress, In Review, Approve, Delivered + 5 example cards
                  </div>
                </div>
              </label>

              {/* AI Music Video template */}
              <label className="flex items-start gap-3 p-3 bg-bg-secondary rounded-lg border border-bg-tertiary cursor-pointer hover:border-accent-primary/50 transition-colors">
                <input
                  type="radio"
                  name="template"
                  value="ai-music"
                  checked={templateType === 'ai-music'}
                  onChange={(e) => setTemplateType(e.target.value as TemplateType)}
                  className="mt-1"
                />
                <div>
                  <div className="font-medium text-text-primary mb-1">
                    🎵 AI Music Video Template
                  </div>
                  <div className="text-sm text-text-secondary">
                    6 lists: Ideas, Music, Visuals, Video, Edit, Done + 5 example cards
                  </div>
                </div>
              </label>
            </div>
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
