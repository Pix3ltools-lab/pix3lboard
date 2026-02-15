'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import { Card, CardType, BugSeverity, Priority, Effort, ChecklistItem } from '@/types';
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
import { CommentsSection } from '@/components/card/CommentsSection';
import { ChecklistSection } from '@/components/card/ChecklistSection';
import { AttachmentsSection } from '@/components/card/AttachmentsSection';
import { ThumbnailUpload } from '@/components/card/ThumbnailUpload';
import { ActivityTimeline } from '@/components/card/ActivityTimeline';
import { Lightbox } from '@/components/ui/Lightbox';
import { Copy, Trash2, Archive, Loader2, X, UserCheck, Eye, BookOpen } from 'lucide-react';
import { debounce } from '@/lib/utils/debounce';
import { useAuth } from '@/lib/context/AuthContext';
import { useParams } from 'next/navigation';
import { BoardPermissions } from '@/lib/utils/boardPermissions';

interface UserSuggestion {
  id: string;
  email: string;
  name: string | null;
}

interface CardModalProps {
  isOpen: boolean;
  onClose: () => void;
  card: Card;
  allowedCardTypes?: CardType[]; // Filter available card types
  permissions?: BoardPermissions; // User's permissions for this board
  onUpdate: (cardId: string, data: Partial<Card>) => void;
  onDelete: (cardId: string) => void;
  onDuplicate: (cardId: string) => void;
  onArchive: (cardId: string) => void;
}

export function CardModal({
  isOpen,
  onClose,
  card,
  allowedCardTypes,
  permissions,
  onUpdate,
  onDelete,
  onDuplicate,
  onArchive,
}: CardModalProps) {
  const { user: currentUser } = useAuth();
  const params = useParams();
  const boardId = params?.boardId as string | undefined;

  // Default to full permissions if not provided (for backwards compatibility)
  const canEdit = permissions?.canEditCards ?? true;
  const canComment = permissions?.canComment ?? true;
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
  const [responsibleUserId, setResponsibleUserId] = useState(card.responsibleUserId);
  const [responsibleUserName, setResponsibleUserName] = useState(card.responsibleUserName);
  const [responsibleUserEmail, setResponsibleUserEmail] = useState(card.responsibleUserEmail);
  const [responsibleDisplay, setResponsibleDisplay] = useState(
    card.responsibleUserName || card.responsibleUserEmail || card.responsible || ''
  );
  const [jobNumber, setJobNumber] = useState(card.jobNumber || '');
  const [jobNumberError, setJobNumberError] = useState('');

  // Autocomplete state for responsible field
  const [suggestions, setSuggestions] = useState<UserSuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const responsibleInputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);

  // Type-specific fields
  const [severity, setSeverity] = useState<BugSeverity | undefined>(card.severity);
  const [priority, setPriority] = useState<Priority | undefined>(card.priority);
  const [effort, setEffort] = useState<Effort | undefined>(card.effort);
  const [attendees, setAttendees] = useState<string[]>(card.attendees || []);
  const [meetingDate, setMeetingDate] = useState(card.meetingDate);
  const [checklist, setChecklist] = useState<ChecklistItem[]>(card.checklist || []);
  const [thumbnail, setThumbnail] = useState(card.thumbnail);
  const [lightboxOpen, setLightboxOpen] = useState(false);

  // Handle thumbnail change - update both local state and parent
  const handleThumbnailChange = (url: string | undefined) => {
    setThumbnail(url);
    // Immediately update parent so the change persists when modal is closed
    onUpdate(card.id, { thumbnail: url });
  };

  // Debounced search for responsible user
  const debouncedSearch = useMemo(
    () =>
      debounce(async (query: string) => {
        if (query.length < 2) {
          setSuggestions([]);
          setShowSuggestions(false);
          return;
        }
        setIsSearching(true);
        try {
          const res = await fetch(`/api/users/search?q=${encodeURIComponent(query)}&limit=10`);
          if (res.ok) {
            const data = await res.json();
            setSuggestions(data.users || []);
            setShowSuggestions(true);
          }
        } catch (err) {
          console.error('Search error:', err);
        } finally {
          setIsSearching(false);
        }
      }, 300),
    []
  );

  // Handle responsible input change
  const handleResponsibleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setResponsibleDisplay(value);
    // Clear the user ID when typing (user is entering free text)
    setResponsibleUserId(undefined);
    setResponsibleUserName(undefined);
    setResponsibleUserEmail(undefined);
    setResponsible(value);
    debouncedSearch(value);
  };

  // Handle selecting a user from suggestions
  const handleSelectUser = (user: UserSuggestion) => {
    setResponsibleUserId(user.id);
    setResponsibleUserName(user.name || undefined);
    setResponsibleUserEmail(user.email);
    setResponsibleDisplay(user.name || user.email);
    setResponsible(''); // Clear legacy field when selecting a real user
    setSuggestions([]);
    setShowSuggestions(false);
  };

  // Clear responsible
  const handleClearResponsible = () => {
    setResponsibleUserId(undefined);
    setResponsibleUserName(undefined);
    setResponsibleUserEmail(undefined);
    setResponsibleDisplay('');
    setResponsible('');
    setSuggestions([]);
    setShowSuggestions(false);
  };

  // Assign to current user
  const handleAssignToMe = () => {
    if (!currentUser) return;
    setResponsibleUserId(currentUser.id);
    setResponsibleUserName(currentUser.name || undefined);
    setResponsibleUserEmail(currentUser.email);
    setResponsibleDisplay(currentUser.name || currentUser.email);
    setResponsible('');
    setSuggestions([]);
    setShowSuggestions(false);
  };

  // Close suggestions on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        suggestionsRef.current &&
        !suggestionsRef.current.contains(event.target as Node) &&
        responsibleInputRef.current &&
        !responsibleInputRef.current.contains(event.target as Node)
      ) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

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
    setResponsibleUserId(card.responsibleUserId);
    setResponsibleUserName(card.responsibleUserName);
    setResponsibleUserEmail(card.responsibleUserEmail);
    setResponsibleDisplay(
      card.responsibleUserName || card.responsibleUserEmail || card.responsible || ''
    );
    setSuggestions([]);
    setShowSuggestions(false);
    setJobNumber(card.jobNumber || '');
    setJobNumberError('');
    setSeverity(card.severity);
    setPriority(card.priority);
    setEffort(card.effort);
    setAttendees(card.attendees || []);
    setMeetingDate(card.meetingDate);
    setChecklist(card.checklist || []);
    setThumbnail(card.thumbnail);
    setLightboxOpen(false);
  }, [card]);

  // Validate job number format: Letter-2digits-4digits (e.g., A-26-0001)
  const validateJobNumber = (value: string): boolean => {
    if (!value.trim()) return true; // Optional field
    const regex = /^[A-Z]-\d{2}-\d{4}$/;
    return regex.test(value);
  };

  const handleJobNumberChange = (value: string) => {
    setJobNumber(value);
    if (value.trim() && !validateJobNumber(value)) {
      setJobNumberError('Format: Letter-2digits-4digits (e.g., A-26-0001)');
    } else {
      setJobNumberError('');
    }
  };

  const handleSave = () => {
    if (!title.trim()) return;

    // Validate job number before saving
    if (jobNumber.trim() && !validateJobNumber(jobNumber)) {
      setJobNumberError('Invalid format. Use: Letter-2digits-4digits (e.g., A-26-0001)');
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
      responsible: responsibleUserId ? '' : (responsible.trim() || undefined),
      responsibleUserId: responsibleUserId || undefined,
      responsibleUserName: responsibleUserName || undefined,
      responsibleUserEmail: responsibleUserEmail || undefined,
      jobNumber: jobNumber.trim() || undefined,
      severity,
      priority,
      effort,
      attendees: attendees.length > 0 ? attendees : undefined,
      meetingDate: type === 'meeting' ? meetingDate : undefined,
      checklist: checklist.length > 0 ? checklist : undefined,
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

  const handleArchive = () => {
    onArchive(card.id);
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
          disabled={!canEdit}
        />

        {/* Job Number */}
        <div>
          <Input
            label="Job Number (optional)"
            value={jobNumber}
            onChange={(e) => handleJobNumberChange(e.target.value)}
            placeholder="e.g., A-26-0001"
            disabled={!canEdit}
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
          disabled={!canEdit}
        />

        {/* Thumbnail */}
        <ThumbnailUpload
          cardId={card.id}
          value={thumbnail}
          onChange={handleThumbnailChange}
          onViewFullSize={() => setLightboxOpen(true)}
          disabled={!canEdit}
        />

        {/* Type Selector */}
        <TypeSelector
          value={type}
          onChange={(newType) => setType(newType)}
          allowedCardTypes={allowedCardTypes}
          disabled={!canEdit}
        />

        {/* Type-specific fields */}
        {type === 'bug' && (
          <SeveritySelector
            value={severity}
            onChange={setSeverity}
            disabled={!canEdit}
          />
        )}

        {type === 'feature' && (
          <PrioritySelector
            priority={priority}
            effort={effort}
            onPriorityChange={setPriority}
            onEffortChange={setEffort}
            disabled={!canEdit}
          />
        )}

        {type === 'meeting' && (
          <>
            <AttendeesList
              value={attendees}
              onChange={setAttendees}
              disabled={!canEdit}
            />
            <DatePicker
              value={meetingDate}
              onChange={setMeetingDate}
              label="Meeting Date"
              disabled={!canEdit}
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
          disabled={!canEdit}
        />

        {/* Rating */}
        <RatingStars
          value={rating}
          onChange={setRating}
          disabled={!canEdit}
        />

        {/* AI Tool */}
        <Input
          label="AI Tool"
          value={aiTool}
          onChange={(e) => setAiTool(e.target.value)}
          placeholder="e.g., Suno, Runway, Midjourney, Claude..."
          disabled={!canEdit}
        />

        {/* Responsible - with user autocomplete */}
        <div className="w-full">
          <div className="flex items-center justify-between mb-1">
            <label className="text-sm font-medium text-text-primary">
              Responsible
            </label>
            {currentUser && canEdit && (
              <button
                type="button"
                onClick={handleAssignToMe}
                className="flex items-center gap-1 text-xs text-accent-primary hover:text-accent-primary/80 transition-colors"
              >
                <UserCheck className="h-3 w-3" />
                Assign to me
              </button>
            )}
          </div>
          <div className="relative">
            <Input
              ref={responsibleInputRef}
              value={responsibleDisplay}
              onChange={handleResponsibleChange}
              onFocus={() => responsibleDisplay.length >= 2 && suggestions.length > 0 && setShowSuggestions(true)}
              placeholder="Search for a user..."
              autoComplete="off"
              disabled={!canEdit}
            />
            {responsibleDisplay && (
              <button
                type="button"
                onClick={handleClearResponsible}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-text-secondary hover:text-text-primary rounded"
              >
                <X className="h-4 w-4" />
              </button>
            )}
            {/* Autocomplete dropdown */}
            {showSuggestions && (
              <div
                ref={suggestionsRef}
                className="absolute z-50 w-full mt-1 bg-bg-secondary border border-bg-tertiary rounded-lg shadow-lg max-h-48 overflow-y-auto"
              >
                {isSearching ? (
                  <div className="flex items-center justify-center py-3">
                    <Loader2 className="h-4 w-4 animate-spin text-text-secondary" />
                  </div>
                ) : suggestions.length === 0 ? (
                  <div className="px-3 py-2 text-sm text-text-secondary">
                    No users found
                  </div>
                ) : (
                  suggestions.map((user) => (
                    <button
                      key={user.id}
                      type="button"
                      onClick={() => handleSelectUser(user)}
                      className="w-full px-3 py-2 text-left hover:bg-bg-tertiary transition-colors flex items-center gap-2"
                    >
                      <div className="w-6 h-6 rounded-full bg-accent-primary/20 flex items-center justify-center flex-shrink-0">
                        <span className="text-xs font-medium text-accent-primary">
                          {(user.name || user.email)[0].toUpperCase()}
                        </span>
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm text-text-primary truncate">
                          {user.name || user.email}
                        </p>
                        {user.name && (
                          <p className="text-xs text-text-secondary truncate">{user.email}</p>
                        )}
                      </div>
                    </button>
                  ))
                )}
              </div>
            )}
          </div>
          {responsibleUserId && (
            <p className="mt-1 text-xs text-accent-success">Linked to registered user</p>
          )}
        </div>

        {/* Tags */}
        <TagInput value={tags} onChange={setTags} disabled={!canEdit} />

        {/* Due Date */}
        <DatePicker value={dueDate} onChange={setDueDate} disabled={!canEdit} />

        {/* Links */}
        <LinkInput value={links} onChange={setLinks} disabled={!canEdit} />

        {/* Checklist */}
        <div className="pt-4 border-t border-bg-tertiary">
          <ChecklistSection value={checklist} onChange={setChecklist} disabled={!canEdit} />
        </div>

        {/* Attachments */}
        <div className="pt-4 border-t border-bg-tertiary">
          <AttachmentsSection cardId={card.id} disabled={!canEdit} />
        </div>

        {/* Comments */}
        <div className="pt-4 border-t border-bg-tertiary">
          <CommentsSection cardId={card.id} canComment={canComment} />
        </div>

        {/* Activity Timeline */}
        <div className="pt-4 border-t border-bg-tertiary">
          <ActivityTimeline cardId={card.id} />
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between pt-4 border-t border-bg-tertiary">
          <div className="flex gap-2">
            {canEdit ? (
              <>
                <a
                  href={`${process.env.NEXT_PUBLIC_PIX3LWIKI_URL || 'https://wiki.pix3ltools.com'}/wiki/new${boardId ? `?board=${boardId}&card=${card.id}` : `?card=${card.id}`}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-lg text-text-secondary hover:text-text-primary hover:bg-bg-secondary transition-colors"
                >
                  <BookOpen className="h-4 w-4" />
                  Wiki
                </a>
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
                  variant="ghost"
                  size="sm"
                  onClick={handleArchive}
                  className="flex items-center gap-2"
                >
                  <Archive className="h-4 w-4" />
                  Archive
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
              </>
            ) : (
              <span className="flex items-center gap-2 text-sm text-text-secondary">
                <Eye className="h-4 w-4" />
                {canComment ? 'View only (can comment)' : 'View only'}
              </span>
            )}
          </div>

          <div className="flex gap-2">
            <Button variant="ghost" onClick={onClose}>
              {canEdit ? 'Cancel' : 'Close'}
            </Button>
            {canEdit && (
              <Button onClick={handleSave} disabled={!title.trim()}>
                Save Changes
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Lightbox for viewing full-size thumbnail */}
      {thumbnail && (
        <Lightbox
          isOpen={lightboxOpen}
          onClose={() => setLightboxOpen(false)}
          imageUrl={thumbnail}
          alt={`Thumbnail for ${title}`}
        />
      )}
    </Modal>
  );
}
