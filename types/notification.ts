export type NotificationType =
  | 'assignment'     // Assigned as responsible
  | 'comment'        // Comment on card you're responsible for
  | 'mention'        // Mentioned in comment (@user)
  | 'due_date'       // Card due date approaching
  | 'due_date_passed'; // Card due date passed

export interface Notification {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  message?: string;
  link?: string;
  isRead: boolean;
  createdAt: string;
}
