export interface EmailMessage {
  id: string;
  subject: string;
  from: string;
  to: string;
  cc?: string;
  content: string;
  timestamp: string;
  read: boolean;
  folder: string | null;
  important: boolean;
  flagged: boolean;
  aiMeta?: EmailMeta;
  attachments?: Array<{
    id: string;
    name: string;
    contentId?: string;
    contentType: string;
    size: number;
    isInline: boolean;
    contentBytes: string;
  }>;
}

export interface EmailMeta {
  priority: string;
  category: string;
  sentiment: string;
  summary: string;
  actionItems: string[];
  followUpDate?: string;
  relatedContacts?: string[];
  relatedDocuments?: string[];
  tags?: string[];
} 