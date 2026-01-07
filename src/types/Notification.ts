export interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'COMMENT' | 'MENTION' | 'SYSTEM' | 'APPROVAL' | 'COLLABORATION';
  link?: string; // URL to redirect to
  metadata?: Record<string, any>; // Extra data like documentId, commentId
  createdAt: string;
  read: boolean;
}