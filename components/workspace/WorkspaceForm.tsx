'use client';

import { useState, useEffect } from 'react';
import { Workspace } from '@/types';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { IconPicker } from '@/components/ui/IconPicker';
import { ColorPicker } from '@/components/ui/ColorPicker';
import { Button } from '@/components/ui/Button';

interface WorkspaceFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: Partial<Workspace>) => void;
  workspace?: Workspace; // If editing
}

export function WorkspaceForm({ isOpen, onClose, onSubmit, workspace }: WorkspaceFormProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [icon, setIcon] = useState('💼');
  const [color, setColor] = useState('#8b5cf6');

  // Load workspace data if editing
  useEffect(() => {
    if (workspace) {
      setName(workspace.name);
      setDescription(workspace.description || '');
      setIcon(workspace.icon || '💼');
      setColor(workspace.color || '#8b5cf6');
    } else {
      // Reset for create
      setName('');
      setDescription('');
      setIcon('💼');
      setColor('#8b5cf6');
    }
  }, [workspace, isOpen]);

  const handleSubmit = () => {
    if (!name.trim()) return;

    onSubmit({
      name: name.trim(),
      description: description.trim() || undefined,
      icon,
      color,
    });

    handleClose();
  };

  const handleClose = () => {
    setName('');
    setDescription('');
    setIcon('💼');
    setColor('#8b5cf6');
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={workspace ? 'Edit Workspace' : 'Create New Workspace'}
      size="md"
    >
      <div className="space-y-4">
        <Input
          label="Workspace Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g., AI Music Projects"
          autoFocus
        />

        <Textarea
          label="Description (optional)"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="What will you work on in this workspace?"
          rows={3}
        />

        <IconPicker label="Icon" value={icon} onChange={setIcon} />

        <ColorPicker label="Color" value={color} onChange={setColor} />

        <div className="flex gap-3 justify-end pt-4">
          <Button variant="ghost" onClick={handleClose}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={!name.trim()}>
            {workspace ? 'Save Changes' : 'Create Workspace'}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
