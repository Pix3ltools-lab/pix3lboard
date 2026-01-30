'use client';

import { useState, useEffect, useRef } from 'react';
import { Paperclip, Upload, X, Download, FileText, Image as ImageIcon, File, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';

interface Attachment {
  id: string;
  card_id: string;
  user_id: string;
  filename: string;
  file_url: string;
  file_size: number;
  mime_type: string | null;
  created_at: string;
}

interface AttachmentsSectionProps {
  cardId: string;
  disabled?: boolean;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getFileIcon(mimeType: string | null) {
  if (!mimeType) return File;
  if (mimeType.startsWith('image/')) return ImageIcon;
  if (mimeType.includes('pdf') || mimeType.includes('document') || mimeType.includes('text')) return FileText;
  return File;
}

function isImageFile(mimeType: string | null): boolean {
  return mimeType?.startsWith('image/') || false;
}

export function AttachmentsSection({ cardId, disabled = false }: AttachmentsSectionProps) {
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchAttachments = async () => {
    try {
      const res = await fetch(`/api/cards/${cardId}/attachments`);
      if (res.ok) {
        const data = await res.json();
        setAttachments(data.attachments);
      }
    } catch (err) {
      console.error('Failed to fetch attachments:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAttachments();
  }, [cardId]);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Reset input
    e.target.value = '';

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      setError('File too large (max 10MB)');
      return;
    }

    setIsUploading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch(`/api/cards/${cardId}/attachments`, {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Upload failed');
      }

      const data = await res.json();
      setAttachments((prev) => [data.attachment, ...prev]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to upload file');
    } finally {
      setIsUploading(false);
    }
  };

  const handleDelete = async (attachmentId: string) => {
    try {
      const res = await fetch(`/api/attachments/${attachmentId}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        setAttachments((prev) => prev.filter((a) => a.id !== attachmentId));
      }
    } catch (err) {
      console.error('Failed to delete attachment:', err);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="flex items-center gap-2 text-sm font-medium text-text-primary">
          <Paperclip className="h-4 w-4" />
          Attachments
          {attachments.length > 0 && (
            <span className="text-text-secondary">({attachments.length})</span>
          )}
        </label>
        {!disabled && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
            className="flex items-center gap-1"
          >
            {isUploading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Upload className="h-4 w-4" />
            )}
            Add
          </Button>
        )}
      </div>

      <input
        ref={fileInputRef}
        type="file"
        onChange={handleFileSelect}
        className="hidden"
      />

      {error && (
        <p className="text-xs text-accent-danger">{error}</p>
      )}

      {isLoading ? (
        <div className="flex items-center justify-center py-4">
          <Loader2 className="h-5 w-5 animate-spin text-text-secondary" />
        </div>
      ) : attachments.length === 0 ? (
        <p className="text-sm text-text-secondary py-2">No attachments yet</p>
      ) : (
        <div className="space-y-2">
          {attachments.map((attachment) => {
            const FileIcon = getFileIcon(attachment.mime_type);
            const isImage = isImageFile(attachment.mime_type);

            return (
              <div
                key={attachment.id}
                className="flex items-start gap-3 p-2 rounded-lg bg-bg-secondary hover:bg-bg-tertiary transition-colors group"
              >
                {/* Preview or Icon */}
                {isImage ? (
                  <a
                    href={attachment.file_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-shrink-0"
                  >
                    <img
                      src={attachment.file_url}
                      alt={attachment.filename}
                      className="w-12 h-12 object-cover rounded border border-bg-tertiary"
                    />
                  </a>
                ) : (
                  <div className="w-12 h-12 flex items-center justify-center bg-bg-tertiary rounded">
                    <FileIcon className="h-6 w-6 text-text-secondary" />
                  </div>
                )}

                {/* File info */}
                <div className="flex-1 min-w-0">
                  <a
                    href={attachment.file_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm font-medium text-text-primary hover:text-accent-primary truncate block"
                    title={attachment.filename}
                  >
                    {attachment.filename}
                  </a>
                  <p className="text-xs text-text-secondary">
                    {formatFileSize(attachment.file_size)}
                  </p>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <a
                    href={attachment.file_url}
                    download={attachment.filename}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-1.5 rounded hover:bg-bg-primary text-text-secondary hover:text-text-primary transition-colors"
                    title="Download"
                  >
                    <Download className="h-4 w-4" />
                  </a>
                  {!disabled && (
                    <button
                      onClick={() => handleDelete(attachment.id)}
                      className="p-1.5 rounded hover:bg-bg-primary text-text-secondary hover:text-accent-danger transition-colors"
                      title="Delete"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
