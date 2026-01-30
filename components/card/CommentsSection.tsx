'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/lib/context/AuthContext';
import { Button } from '@/components/ui/Button';
import { Textarea } from '@/components/ui/Textarea';
import { MessageSquare, Trash2, Send } from 'lucide-react';
import { format } from 'date-fns';

interface Comment {
  id: string;
  cardId: string;
  userId: string;
  content: string;
  createdAt: string;
  updatedAt: string;
  user: {
    email: string;
    name: string | null;
  };
}

interface CommentsSectionProps {
  cardId: string;
  onCommentCountChange?: (count: number) => void;
  canComment?: boolean; // Whether the user can add comments
}

export function CommentsSection({ cardId, onCommentCountChange, canComment = true }: CommentsSectionProps) {
  const { user } = useAuth();
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const fetchComments = useCallback(async () => {
    try {
      const res = await fetch(`/api/cards/${cardId}/comments`);
      if (!res.ok) throw new Error('Failed to fetch comments');
      const data = await res.json();
      setComments(data.comments);
    } catch (err) {
      console.error('Error fetching comments:', err);
      setError('Failed to load comments');
    } finally {
      setLoading(false);
    }
  }, [cardId]);

  useEffect(() => {
    fetchComments();
  }, [fetchComments]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim() || submitting) return;

    setSubmitting(true);
    setError('');

    try {
      const res = await fetch(`/api/cards/${cardId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: newComment.trim() }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to add comment');
      }

      const data = await res.json();
      const newComments = [...comments, data.comment];
      setComments(newComments);
      setNewComment('');
      onCommentCountChange?.(newComments.length);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add comment');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (commentId: string) => {
    try {
      const res = await fetch(`/api/comments/${commentId}`, {
        method: 'DELETE',
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to delete comment');
      }

      const newComments = comments.filter(c => c.id !== commentId);
      setComments(newComments);
      onCommentCountChange?.(newComments.length);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete comment');
    }
  };

  const getInitials = (name: string | null, email: string) => {
    if (name) {
      return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
    }
    return email[0].toUpperCase();
  };

  const canDelete = (comment: Comment) => {
    return user && (comment.userId === user.id || user.is_admin);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-text-primary">
        <MessageSquare className="h-5 w-5" />
        <h3 className="font-medium">Comments</h3>
        <span className="text-sm text-text-secondary">({comments.length})</span>
      </div>

      {error && (
        <p className="text-sm text-accent-danger">{error}</p>
      )}

      {/* Comments list */}
      {loading ? (
        <p className="text-sm text-text-secondary">Loading comments...</p>
      ) : comments.length === 0 ? (
        <p className="text-sm text-text-secondary">No comments yet. Be the first to comment!</p>
      ) : (
        <div className="space-y-3 max-h-64 overflow-y-auto">
          {comments.map((comment) => (
            <div key={comment.id} className="flex gap-3 p-3 bg-bg-secondary rounded-lg">
              {/* Avatar */}
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-accent-primary flex items-center justify-center text-white text-xs font-medium">
                {getInitials(comment.user.name, comment.user.email)}
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-text-primary truncate">
                      {comment.user.name || comment.user.email}
                    </span>
                    <span className="text-xs text-text-secondary">
                      {format(new Date(comment.createdAt), 'MMM d, yyyy HH:mm')}
                    </span>
                  </div>

                  {canDelete(comment) && (
                    <button
                      onClick={() => handleDelete(comment.id)}
                      className="p-1 text-text-secondary hover:text-accent-danger transition-colors"
                      title="Delete comment"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>

                <p className="mt-1 text-sm text-text-primary whitespace-pre-wrap break-words">
                  {comment.content}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add comment form - only show if user can comment */}
      {canComment ? (
        <form onSubmit={handleSubmit} className="space-y-2">
          <Textarea
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder="Write a comment..."
            rows={2}
          />
          <div className="flex justify-end">
            <Button
              type="submit"
              size="sm"
              disabled={!newComment.trim() || submitting}
              className="flex items-center gap-2"
            >
              <Send className="h-4 w-4" />
              {submitting ? 'Sending...' : 'Send'}
            </Button>
          </div>
        </form>
      ) : (
        <p className="text-sm text-text-secondary italic">
          You don&apos;t have permission to add comments
        </p>
      )}
    </div>
  );
}
