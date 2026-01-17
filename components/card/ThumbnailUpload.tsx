'use client';

import { useState, useRef } from 'react';
import { ImagePlus, X, Loader2, ZoomIn } from 'lucide-react';
import { Button } from '@/components/ui/Button';

interface ThumbnailUploadProps {
  cardId: string;
  value?: string;
  onChange: (url: string | undefined) => void;
  onViewFullSize?: () => void;
}

// Compress image client-side before upload
async function compressImage(file: File, maxWidth = 800, maxHeight = 600, quality = 0.8): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    img.onload = () => {
      let { width, height } = img;

      // Calculate new dimensions maintaining aspect ratio
      if (width > maxWidth || height > maxHeight) {
        const ratio = Math.min(maxWidth / width, maxHeight / height);
        width = Math.round(width * ratio);
        height = Math.round(height * ratio);
      }

      canvas.width = width;
      canvas.height = height;

      if (!ctx) {
        reject(new Error('Failed to get canvas context'));
        return;
      }

      ctx.drawImage(img, 0, 0, width, height);

      canvas.toBlob(
        (blob) => {
          if (blob) {
            resolve(blob);
          } else {
            reject(new Error('Failed to compress image'));
          }
        },
        'image/jpeg',
        quality
      );
    };

    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = URL.createObjectURL(file);
  });
}

export function ThumbnailUpload({ cardId, value, onChange, onViewFullSize }: ThumbnailUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Reset input so same file can be selected again
    e.target.value = '';

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setError('Please select an image file');
      return;
    }

    // Validate file size (max 10MB before compression)
    if (file.size > 10 * 1024 * 1024) {
      setError('Image too large (max 10MB)');
      return;
    }

    setIsUploading(true);
    setError(null);

    try {
      // Compress image client-side
      const compressedBlob = await compressImage(file);

      // Create FormData with compressed image
      const formData = new FormData();
      formData.append('file', compressedBlob, 'thumbnail.jpg');

      // Upload to API
      const response = await fetch(`/api/cards/${cardId}/thumbnail`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Upload failed');
      }

      const data = await response.json();
      onChange(data.thumbnail);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to upload image');
    } finally {
      setIsUploading(false);
    }
  };

  const handleDelete = async () => {
    if (!value) return;

    setIsUploading(true);
    setError(null);

    try {
      const response = await fetch(`/api/cards/${cardId}/thumbnail`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Delete failed');
      }

      onChange(undefined);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete image');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-text-primary">
        Thumbnail
      </label>

      {value ? (
        <div className="relative group">
          <img
            src={value}
            alt="Card thumbnail"
            className="w-full max-h-48 object-cover rounded-lg border border-bg-tertiary"
          />
          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center gap-2">
            {onViewFullSize && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onViewFullSize()}
                className="text-white hover:text-white hover:bg-white/20"
                disabled={isUploading}
              >
                <ZoomIn className="h-5 w-5" />
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={handleDelete}
              className="text-white hover:text-white hover:bg-white/20"
              disabled={isUploading}
            >
              {isUploading ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <X className="h-5 w-5" />
              )}
            </Button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={isUploading}
          className="w-full h-32 border-2 border-dashed border-bg-tertiary rounded-lg flex flex-col items-center justify-center gap-2 hover:border-accent-primary hover:bg-bg-secondary/50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isUploading ? (
            <Loader2 className="h-8 w-8 text-text-tertiary animate-spin" />
          ) : (
            <>
              <ImagePlus className="h-8 w-8 text-text-tertiary" />
              <span className="text-sm text-text-secondary">Click to upload image</span>
            </>
          )}
        </button>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileSelect}
        className="hidden"
      />

      {error && (
        <p className="text-xs text-accent-danger">{error}</p>
      )}
    </div>
  );
}
