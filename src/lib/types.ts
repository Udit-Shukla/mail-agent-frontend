export type Provider = 'outlook' | 'gmail';

export interface MailFolder {
  id: string;
  displayName: string;
  totalItemCount: number;
  unreadItemCount: number;
}

export interface MailMessage {
  id: string;
  from: string;
  to?: string;
  subject: string;
  preview: string;
  timestamp: string;
  read: boolean;
  folder: string;
  important: boolean;
  flagged: boolean;
  aiMeta?: {
    summary: string;
    category: string;
    priority: 'urgent' | 'high' | 'medium' | 'low';
    sentiment: 'positive' | 'negative' | 'neutral';
    actionItems: string[];
    enrichedAt: string;
    version: string;
    error?: string;
  };
}

export interface EmailDetails extends MailMessage {
  content: string;
  to?: string;
  cc?: string;
  bcc?: string;
}

export interface Account {
  id: string;
  email: string;
  provider: Provider;
  name?: string;
} 