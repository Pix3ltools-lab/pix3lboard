'use client';

import { useState, useEffect } from 'react';
import { Card, BugSeverity, Priority, Effort } from '@/types';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { Button } from '@/components/ui/Button';
import { TypeSelector } from '@/components/card/TypeSelector';
import { RatingStars } from '@/components/card/RatingStars';
import { TagInput } from '@/components/card/TagInput';
import { LinkInput } from '@/components/card/LinkInput';
import { DatePicker } from '@/components/card/DatePicker';
import { SeveritySelector } from '@/components/card/SeveritySelector';
import { PrioritySelector } from '@/components/card/PrioritySelector';
import { AttendeesList } from '@/components/card/AttendeesList';
import { Copy, Trash2 } from 'lucide-react';

interface CardModalProps {
  isOpen: boolean;
  onClose: () => void;
  card: Card;
  onUpdate: (cardId: string, data: Partial<Card>) => void;
  onDelete: (cardId: string) => void;
  onDuplicate: (cardId: string) => void;
}

export function CardModal({
  isOpen,
  onClose,
  card,
  onUpdate,
  onDelete,
  onDuplicate,
}: CardModalProps) {
  const [title, setTitle] = useState(card.title);
  const [description, setDescription] = useState(card.description || '');
  const [type, setType] = useState(card.type);
  const [prompt, setPrompt] = useState(card.prompt || '');
  const [rating, setRating] = useState(card.rating);
  const [aiTool, setAiTool] = useState(card.aiTool || '');
  const [tags, setTags] = useState(card.tags || []);
  const [dueDate, setDueDate] = useState(card.dueDate);
  const [links, setLinks] = useState(card.links || []);
  const [responsible, setResponsible] = useState(card.responsible || '');
  const [jobNumber, setJobNumber] = useState(card.jobNumber || '');
  const [jobNumberError, setJobNumberError] = useState('');

  // Type-specific fields
  const [severity, setSeverity] = useState<BugSeverity | undefined>(card.severity);
  const [priority, setPriority] = useState<Priority | undefined>(card.priority);
  const [effort, setEffort] = useState<Effort | undefined>(card.effort);
  const [attendees, setAttendees] = useState<string[]>(card.attendees || []);
  const [meetingDate, setMeetingDate] = useState(card.meetingDate);

  // Reset state when card changes
  useEffect(() => {
    setTitle(card.title);
    setDescription(card.description || '');
    setType(card.type);
    setPrompt(card.prompt || '');
    setRating(card.rating);
    setAiTool(card.aiTool || '');
    setTags(card.tags || []);
    setDueDate(card.dueDate);
    setLinks(card.links || []);
    setResponsible(card.responsible || '');
    setJobNumber(card.jobNumber || '');
    setJobNumberError('');
    setSeverity(card.severity);
    setPriority(card.priority);
    setEffort(card.effort);
    setAttendees(card.attendees || []);
    setMeetingDate(card.meetingDate);
  }, [card]);

  // Validate job number format: Letter-2digits-4digits (e.g., C-26-0001)
  const validateJobNumber = (value: string): boolean => {
    if (!value.trim()) return true; // Optional field
    const regex = /^[A-Z]-\d{2}-\d{4}$/;
    return regex.test(value);
  };

  const handleJobNumberChange = (value: string) => {
    setJobNumber(value);
    if (value.trim() && !validateJobNumber(value)) {
      setJobNumberError('Format: Letter-2digits-4digits (e.g., C-26-0001)');
    } else {
      setJobNumberError('');
    }
  };

  const handleSave = () => {
    if (!title.trim()) return;

    // Validate job number before saving
    if (jobNumber.trim() && !validateJobNumber(jobNumber)) {
      setJobNumberError('Invalid format. Use: Letter-2digits-4digits (e.g., C-26-0001)');
      return;
    }

    onUpdate(card.id, {
      title: title.trim(),
      description: description.trim() || undefined,
      type,
      prompt: prompt.trim() || undefined,
      rating,
      aiTool: aiTool.trim() || undefined,
      tags: tags.length > 0 ? tags : undefined,
      dueDate,
      links: links.length > 0 ? links : undefined,
      responsible: responsible.trim() || undefined,
      jobNumber: jobNumber.trim() || undefined,
      severity,
      priority,
      effort,
      attendees: attendees.length > 0 ? attendees : undefined,
      meetingDate: type === 'meeting' ? meetingDate : undefined,
    });

    onClose();
  };

  const handleDelete = () => {
    onDelete(card.id);
    onClose();
  };

  const handleDuplicate = () => {
    onDuplicate(card.id);
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Edit Card" size="lg">
      <div className="space-y-4">
        {/* Title */}
        <Input
          label="Title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Card title..."
          autoFocus
        />

        {/* Job Number */}
        <div>
          <Input
            label="Job Number (optional)"
            value={jobNumber}
            onChange={(e) => handleJobNumberChange(e.target.value)}
            placeholder="e.g., C-26-0001"
          />
          {jobNumberError && (
            <p className="mt-1 text-xs text-accent-danger">{jobNumberError}</p>
          )}
        </div>

        {/* Description */}
        <Textarea
          label="Description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Add a more detailed description..."
          rows={5}
        />

        {/* Type Selector */}
        <TypeSelector
          value={type}
          onChange={(newType) => setType(newType)}
        />

        {/* Type-specific fields */}
        {type === 'bug' && (
          <SeveritySelector
            value={severity}
            onChange={setSeverity}
          />
        )}

        {type === 'feature' && (
          <PrioritySelector
            priority={priority}
            effort={effort}
            onPriorityChange={setPriority}
            onEffortChange={setEffort}
          />
        )}

        {type === 'meeting' && (
          <>
            <AttendeesList
              value={attendees}
              onChange={setAttendees}
            />
            <DatePicker
              value={meetingDate}
              onChange={setMeetingDate}
              label="Meeting Date"
            />
          </>
        )}

        {/* AI Prompt */}
        <Textarea
          label="AI Prompt"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="Enter the prompt used to generate this content..."
          rows={4}
        />

        {/* Rating */}
        <RatingStars
          value={rating}
          onChange={setRating}
        />

        {/* AI Tool */}
        <Input
          label="AI Tool"
          value={aiTool}
          onChange={(e) => setAiTool(e.target.value)}
          placeholder="e.g., Suno, Runway, Midjourney, Claude..."
        />

        {/* Responsible */}
        <Input
          label="Responsible"
          value={responsible}
          onChange={(e) => setResponsible(e.target.value)}
          placeholder="Person responsible for this card..."
        />

        {/* Tags */}
        <TagInput value={tags} onChange={setTags} />

        {/* Due Date */}
        <DatePicker value={dueDate} onChange={setDueDate} />

        {/* Links */}
        <LinkInput value={links} onChange={setLinks} />

        {/* Actions */}
        <div className="flex items-center justify-between pt-4 border-t border-bg-tertiary">
          <div className="flex gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleDuplicate}
              className="flex items-center gap-2"
            >
              <Copy className="h-4 w-4" />
              Duplicate
            </Button>
            <Button
              variant="danger"
              size="sm"
              onClick={handleDelete}
              className="flex items-center gap-2"
            >
              <Trash2 className="h-4 w-4" />
              Delete
            </Button>
          </div>

          <div className="flex gap-2">
            <Button variant="ghost" onClick={onClose}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={!title.trim()}>
              Save Changes
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
}
