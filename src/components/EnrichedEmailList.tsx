'use client'

import React from 'react';
import { EmailDetail } from '@/components/EmailDetail';
import { emitMailEvent } from '@/lib/socket';
import { MailMessage, EmailDetails } from '@/lib/types';
import { useSocket } from '@/contexts/SocketContext';
import { Sparkles, AlertCircle, Clock, ArrowLeft, Filter } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface EmailMeta {
  summary: string;
  category: string;
  priority: 'urgent' | 'high' | 'medium' | 'low';
  sentiment: 'positive' | 'negative' | 'neutral';
  actionItems: string[];
  enrichedAt: string;
  version: string;
  error?: string;
}

// Extend the existing EmailDetails type with AI metadata
interface EnrichedEmail extends EmailDetails {
  aiMeta: EmailMeta;
  flagged: boolean;
  to: string;
  preview: string;
}

const getPriorityStyle = (priority: string) => {
  switch (priority.toLowerCase()) {
    case 'urgent':
      return 'bg-destructive text-destructive-foreground';
    case 'high':
      return 'bg-destructive/20 text-destructive';
    case 'medium':
      return 'bg-primary/20 text-primary';
    case 'low':
      return 'bg-muted text-muted-foreground';
    default:
      return 'bg-muted text-muted-foreground';
  }
};

const getSentimentStyle = (sentiment: string) => {
  switch (sentiment.toLowerCase()) {
    case 'positive':
      return 'text-green-500 bg-green-500/20 px-2 py-0.5 rounded-full';
    case 'negative':
      return 'text-destructive bg-destructive/20 px-2 py-0.5 rounded-full';
    case 'neutral':
      return 'text-muted-foreground bg-muted/20 px-2 py-0.5 rounded-full';
    default:
      return 'text-muted-foreground bg-muted/20 px-2 py-0.5 rounded-full';
  }
};

const getCategoryStyle = () => {
  return 'bg-secondary/20 text-secondary-foreground';
};

const CATEGORIES = [
  'Work',
  'Personal',
  'Finance',
  'Shopping',
  'Travel',
  'Social',
  'Newsletter',
  'Marketing',
  'Important Documents',
  'Other'
] as const;

const PRIORITIES = ['urgent', 'high', 'medium', 'low'] as const;

export function EnrichedEmailList() {
  const router = useRouter();
  const { socket, isConnected } = useSocket();
  const [selectedEmail, setSelectedEmail] = React.useState<EnrichedEmail | null>(null);
  const [emails, setEmails] = React.useState<EnrichedEmail[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [currentPage, setCurrentPage] = React.useState(1);
  const [hasMore, setHasMore] = React.useState(true);
  const [isLoadingMore, setIsLoadingMore] = React.useState(false);
  const [selectedCategory, setSelectedCategory] = React.useState<string | null>(null);
  const [selectedPriority, setSelectedPriority] = React.useState<string | null>(null);
  const [showFilters, setShowFilters] = React.useState(false);

  React.useEffect(() => {
    if (!socket || !isConnected) return;

    // Set up event handlers
    socket.on('mail:folderMessages', (data: { messages: MailMessage[]; folderId: string; nextLink: string | null; page: number }) => {
      // Convert MailMessage to EnrichedEmail
      const enrichedEmails = data.messages.map(msg => ({
        ...msg,
        content: '', // Add empty content initially, will be loaded on demand
        to: msg.to || '', // Add empty to field if not present
        aiMeta: msg.aiMeta || {
          summary: 'Analyzing...',
          category: 'Other',
          priority: 'medium' as const,
          sentiment: 'neutral' as const,
          actionItems: [],
          enrichedAt: new Date().toISOString(),
          version: '1.0'
        },
        flagged: false
      }));

      if (data.page === 1) {
        setEmails(enrichedEmails);
      } else {
        setEmails(prev => [...prev, ...enrichedEmails]);
      }
      
      setHasMore(data.nextLink !== null);
      setIsLoading(false);
      setIsLoadingMore(false);
    });

    socket.on('mail:new', (message: MailMessage) => {
      const enrichedEmail: EnrichedEmail = {
        ...message,
        content: '', // Add empty content initially, will be loaded on demand
        to: message.to || '', // Add empty to field if not present
        aiMeta: message.aiMeta || {
          summary: 'Analyzing...',
          category: 'Other',
          priority: 'medium' as const,
          sentiment: 'neutral' as const,
          actionItems: [],
          enrichedAt: new Date().toISOString(),
          version: '1.0'
        },
        flagged: false
      };
      setEmails(prev => [enrichedEmail, ...prev]);
    });

    // Handle enrichment status updates
    socket.on('mail:enrichmentStatus', (data: { 
      messageId: string; 
      status: 'queued' | 'analyzing' | 'completed' | 'error';
      message: string;
      aiMeta?: EmailMeta;
    }) => {
      console.log('📊 Received enrichment status:', data);
      
      setEmails(prev => 
        prev.map(email => {
          if (email.id === data.messageId) {
            if (data.status === 'completed' && data.aiMeta) {
              // Only include fields that exist in the analysis
              const updatedAiMeta = {
                summary: data.aiMeta.summary,
                category: data.aiMeta.category,
                ...(data.aiMeta.priority && { priority: data.aiMeta.priority }),
                ...(data.aiMeta.sentiment && { sentiment: data.aiMeta.sentiment }),
                actionItems: data.aiMeta.actionItems || [],
                enrichedAt: data.aiMeta.enrichedAt,
                version: data.aiMeta.version || '1.0'
              };
              return { ...email, aiMeta: updatedAiMeta };
            } else if (data.status === 'error') {
              return {
                ...email,
                aiMeta: {
                  ...email.aiMeta,
                  error: data.message,
                  summary: 'Enrichment failed',
                  version: email.aiMeta?.version || '1.0'
                }
              };
            } else if (data.status === 'analyzing') {
              return {
                ...email,
                aiMeta: {
                  ...email.aiMeta,
                  summary: 'Analyzing...',
                  error: undefined,
                  version: email.aiMeta?.version || '1.0'
                }
              };
            }
          }
          return email;
        })
      );

      // Update selected email if it's the one being enriched
      setSelectedEmail(prev => {
        if (prev?.id === data.messageId) {
          if (data.status === 'completed' && data.aiMeta) {
            // Only include fields that exist in the analysis
            const updatedAiMeta = {
              summary: data.aiMeta.summary,
              category: data.aiMeta.category,
              ...(data.aiMeta.priority && { priority: data.aiMeta.priority }),
              ...(data.aiMeta.sentiment && { sentiment: data.aiMeta.sentiment }),
              actionItems: data.aiMeta.actionItems || [],
              enrichedAt: data.aiMeta.enrichedAt,
              version: data.aiMeta.version || '1.0'
            };
            return { ...prev, aiMeta: updatedAiMeta };
          } else if (data.status === 'error') {
            return {
              ...prev,
              aiMeta: {
                ...prev.aiMeta,
                error: data.message,
                summary: 'Enrichment failed',
                version: prev.aiMeta?.version || '1.0'
              }
            };
          } else if (data.status === 'analyzing') {
            return {
              ...prev,
              aiMeta: {
                ...prev.aiMeta,
                summary: 'Analyzing...',
                error: undefined,
                version: prev.aiMeta?.version || '1.0'
              }
            };
          }
        }
        return prev;
      });
    });

    // Load initial messages from inbox
    const appUserId = localStorage.getItem('appUserId');
    const activeEmail = localStorage.getItem('activeEmail');
    
    if (appUserId && activeEmail) {
      emitMailEvent.getFolder({
        appUserId,
        email: activeEmail,
        folderId: 'inbox',
        page: 1
      });
    }

    // Cleanup
    return () => {
      socket.off('mail:folderMessages');
      socket.off('mail:new');
      socket.off('mail:enrichmentStatus');
    };
  }, [socket, isConnected]);

  const handleEmailClick = (email: EnrichedEmail) => {
    // Load full email content if not already loaded
    if (!email.content) {
      const appUserId = localStorage.getItem('appUserId');
      const activeEmail = localStorage.getItem('activeEmail');
      
      if (!appUserId || !activeEmail) return;

      emitMailEvent.getMessage({
        appUserId,
        email: activeEmail,
        messageId: email.id
      });
    }

    setSelectedEmail(email);
    
    if (!email.read) {
      const appUserId = localStorage.getItem('appUserId');
      const activeEmail = localStorage.getItem('activeEmail');
      
      if (!appUserId || !activeEmail) return;

      emitMailEvent.markRead({
        appUserId,
        email: activeEmail,
        messageId: email.id
      });
    }
  };

  const handleToggleImportant = async (emailId: string) => {
    const appUserId = localStorage.getItem('appUserId');
    const activeEmail = localStorage.getItem('activeEmail');
    
    if (!appUserId || !activeEmail || !selectedEmail) return;
    
    emitMailEvent.markImportant({
      appUserId,
      email: activeEmail,
      messageId: emailId,
      flag: !selectedEmail.important
    });

    // Optimistically update UI
    setSelectedEmail(prev => {
      if (!prev) return null;
      return {
        ...prev,
        important: !prev.important
      };
    });

    // Update in list
    setEmails(prev => 
      prev.map(email => 
        email.id === emailId 
          ? { ...email, important: !email.important }
          : email
      )
    );
  };

  const handleLoadMore = () => {
    if (isLoadingMore || !hasMore) return;

    setIsLoadingMore(true);
    const appUserId = localStorage.getItem('appUserId');
    const activeEmail = localStorage.getItem('activeEmail');
    
    if (appUserId && activeEmail) {
      const nextPage = currentPage + 1;
      setCurrentPage(nextPage);
      emitMailEvent.getFolder({
        appUserId,
        email: activeEmail,
        folderId: 'inbox',
        page: nextPage
      });
    }
  };

  const getEnrichmentStatus = (email: EnrichedEmail) => {
    if (email.aiMeta?.error) {
      return { icon: <AlertCircle className="h-3 w-3 text-destructive" />, text: 'Enrichment failed' };
    }
    if (email.aiMeta?.summary && email.aiMeta.summary !== 'Analyzing...' && email.aiMeta.enrichedAt) {
      return { icon: <Sparkles className="h-3 w-3 text-primary" />, text: email.aiMeta.summary };
    }
    return { icon: <Clock className="h-3 w-3 text-muted-foreground" />, text: email.preview };
  };

  const filteredEmails = React.useMemo(() => {
    return emails.filter(email => {
      const matchesCategory = !selectedCategory || email.aiMeta.category === selectedCategory;
      const matchesPriority = !selectedPriority || email.aiMeta.priority === selectedPriority;
      return matchesCategory && matchesPriority;
    });
  }, [emails, selectedCategory, selectedPriority]);

  const handleBackToClassic = () => {
    router.push('/dashboard');
  };

  if (isLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="flex h-full bg-background">
      {/* Email List */}
      <div className="w-1/3 border-r border-border bg-card overflow-y-auto">
        {/* Header with back button and filters */}
        <div className="sticky top-0 z-10 bg-card border-b border-border p-4">
          <div className="flex items-center justify-between mb-2">
            <button
              onClick={handleBackToClassic}
              className="flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Classic View
            </button>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors"
            >
              <Filter className="h-4 w-4" />
              Filters
            </button>
          </div>
          
          {/* Filter Options */}
          {showFilters && (
            <div className="space-y-2 mt-2">
              {/* Category Filter */}
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Category</label>
                <select
                  value={selectedCategory || ''}
                  onChange={(e) => setSelectedCategory(e.target.value || null)}
                  className="w-full text-sm bg-background border border-border rounded-md px-2 py-1"
                >
                  <option value="">All Categories</option>
                  {CATEGORIES.map(category => (
                    <option key={category} value={category}>{category}</option>
                  ))}
                </select>
              </div>
              
              {/* Priority Filter */}
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Priority</label>
                <select
                  value={selectedPriority || ''}
                  onChange={(e) => setSelectedPriority(e.target.value || null)}
                  className="w-full text-sm bg-background border border-border rounded-md px-2 py-1"
                >
                  <option value="">All Priorities</option>
                  {PRIORITIES.map(priority => (
                    <option key={priority} value={priority}>{priority}</option>
                  ))}
                </select>
              </div>
            </div>
          )}
        </div>

        <div className="divide-y divide-border">
          {filteredEmails.map((email) => {
            const { icon, text } = getEnrichmentStatus(email);
            return (
              <div
                key={email.id}
                onClick={() => handleEmailClick(email)}
                className={`p-4 cursor-pointer hover:bg-accent/50 transition-colors ${
                  selectedEmail?.id === email.id ? 'bg-accent' : ''
                }`}
              >
                <div className="flex flex-col">
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-card-foreground truncate">
                        {email.from.split('<')[0]}
                      </p>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${getPriorityStyle(email.aiMeta.priority)}`}>
                        {email.aiMeta.priority}
                      </span>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${getCategoryStyle()}`}>
                        {email.aiMeta.category}
                      </span>
                      <span className={`text-xs ${getSentimentStyle(email.aiMeta.sentiment)}`}>
                        {email.aiMeta.sentiment}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {new Date(email.timestamp).toLocaleTimeString()}
                    </p>
                  </div>
                  <p className="text-sm font-semibold text-card-foreground mb-2">
                    {email.subject}
                  </p>
                  <div className="flex items-center gap-1.5">
                    <div className="flex-shrink-0">
                      {icon}
                    </div>
                    <p className="text-sm text-muted-foreground italic line-clamp-2 flex-1">
                      {text}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        
        {/* Load More Button */}
        {hasMore && (
          <div className="p-4 text-center">
            <button
              onClick={handleLoadMore}
              disabled={isLoadingMore}
              className="text-sm text-primary hover:text-primary/80 disabled:opacity-50"
            >
              {isLoadingMore ? 'Loading...' : 'Load More'}
            </button>
          </div>
        )}
      </div>

      {/* Email Detail */}
      <div className="flex-1 overflow-y-auto">
        {selectedEmail ? (
          <EmailDetail
            email={selectedEmail}
            onToggleImportant={handleToggleImportant}
          />
        ) : (
          <div className="flex h-full items-center justify-center text-muted-foreground">
            Select an email to view details
          </div>
        )}
      </div>
    </div>
  );
} 