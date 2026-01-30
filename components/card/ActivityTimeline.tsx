'use client';

import { useState, useEffect } from 'react';
import { History, Loader2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface Activity {
  id: string;
  entityType: string;
  entityId: string;
  userId: string;
  action: string;
  details: Record<string, unknown> | null;
  createdAt: string;
  user: {
    name: string | null;
    email: string;
  };
}

interface ActivityTimelineProps {
  cardId: string;
}

const ACTION_LABELS: Record<string, string> = {
  created: 'created this card',
  updated: 'updated this card',
  deleted: 'deleted this card',
  moved: 'moved this card',
  archived: 'archived this card',
  restored: 'restored this card',
  assigned: 'assigned this card',
  commented: 'added a comment',
  attachment_added: 'added an attachment',
  attachment_deleted: 'removed an attachment',
};

function getActionLabel(action: string, details: Record<string, unknown> | null): string {
  if (action === 'updated' && details?.fields) {
    const fields = details.fields as string[];
    if (fields.includes('listId') || details.movedToList) {
      return 'moved this card';
    }
    if (fields.length === 1) {
      return `updated ${fields[0]}`;
    }
    if (fields.length <= 3) {
      return `updated ${fields.join(', ')}`;
    }
    return `updated ${fields.length} fields`;
  }
  return ACTION_LABELS[action] || action;
}

export function ActivityTimeline({ cardId }: ActivityTimelineProps) {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchActivities = async () => {
      try {
        const res = await fetch(`/api/cards/${cardId}/activity`);
        if (res.ok) {
          const data = await res.json();
          setActivities(data.activities);
        } else {
          // Activity log might not exist yet (table not created)
          setActivities([]);
        }
      } catch (err) {
        console.error('Failed to fetch activities:', err);
        setError('Failed to load activity');
      } finally {
        setLoading(false);
      }
    };

    fetchActivities();
  }, [cardId]);

  const getUserDisplay = (user: Activity['user']) => {
    return user.name || user.email.split('@')[0];
  };

  const getInitials = (user: Activity['user']) => {
    if (user.name) {
      return user.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
    }
    return user.email[0].toUpperCase();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-4">
        <Loader2 className="h-5 w-5 animate-spin text-text-secondary" />
      </div>
    );
  }

  if (error) {
    return (
      <p className="text-sm text-text-secondary py-2">{error}</p>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-text-primary">
        <History className="h-5 w-5" />
        <h3 className="font-medium">Activity</h3>
        <span className="text-sm text-text-secondary">({activities.length})</span>
      </div>

      {activities.length === 0 ? (
        <p className="text-sm text-text-secondary">No activity recorded yet</p>
      ) : (
        <div className="space-y-2 max-h-48 overflow-y-auto">
          {activities.map((activity) => (
            <div key={activity.id} className="flex gap-3 text-sm">
              {/* Avatar */}
              <div className="flex-shrink-0 w-6 h-6 rounded-full bg-accent-primary/20 flex items-center justify-center">
                <span className="text-xs font-medium text-accent-primary">
                  {getInitials(activity.user)}
                </span>
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <p className="text-text-primary">
                  <span className="font-medium">{getUserDisplay(activity.user)}</span>
                  {' '}
                  <span className="text-text-secondary">
                    {getActionLabel(activity.action, activity.details)}
                  </span>
                </p>
                <p className="text-xs text-text-tertiary">
                  {formatDistanceToNow(new Date(activity.createdAt), { addSuffix: true })}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
