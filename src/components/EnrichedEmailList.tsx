'use client'

import React from 'react';
import { EmailDetail } from '@/components/EmailDetail';
import { emitMailEvent } from '@/lib/socket';
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

interface EnrichedEmail {
  id: string;
  from: string;
  subject: string;
  content: string;
  preview: string;
  timestamp: string;
  read: boolean;
  folder: string;
  important: boolean;
  flagged: boolean;
  aiMeta: EmailMeta;
  isProcessed: boolean;
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

// Add EmailSkeleton component
const EmailSkeleton = () => (
  <div className="p-4 animate-pulse">
    <div className="flex items-center justify-between mb-1">
      <div className="flex items-center gap-2">
        <div className="h-4 w-32 bg-muted rounded" />
        <div className="h-4 w-16 bg-muted rounded-full" />
        <div className="h-4 w-20 bg-muted rounded-full" />
      </div>
      <div className="h-3 w-16 bg-muted rounded" />
    </div>
    <div className="h-5 w-3/4 bg-muted rounded mb-2" />
    <div className="flex items-center gap-1.5">
      <div className="h-3 w-3 bg-muted rounded-full" />
      <div className="h-4 w-full bg-muted rounded" />
    </div>
  </div>
);

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

  // Handle real-time enrichment updates
  React.useEffect(() => {
    if (!socket) return;

    // Handle enrichment updates
    const handleEnrichmentUpdate = (data: {
      messageId: string;
      status: 'analyzing' | 'completed' | 'error';
      message: string;
      aiMeta?: EmailMeta;
      email?: EnrichedEmail;
      error?: boolean;
    }) => {
      console.log('📨 Received enrichment update:', data);
      
      setEmails(prevEmails => {
        return prevEmails.map(email => {
          if (email.id === data.messageId) {
            // If we have the full email object, use it
            if (data.email) {
              return data.email;
            }
            
            // Otherwise, update the existing email with new AI metadata
            return {
              ...email,
              aiMeta: data.aiMeta || email.aiMeta,
              isProcessed: data.status === 'completed'
            };
          }
          return email;
        });
      });

      // Update selected email if it's the one being enriched
      if (selectedEmail?.id === data.messageId) {
        setSelectedEmail(prev => {
          if (!prev) return prev;
          if (data.email) return data.email;
          return {
            ...prev,
            aiMeta: data.aiMeta || prev.aiMeta,
            isProcessed: data.status === 'completed'
          };
        });
      }
    };

    // Listen for enrichment events
    socket.on('mail:enrichmentStatus', handleEnrichmentUpdate);

    return () => {
      socket.off('mail:enrichmentStatus', handleEnrichmentUpdate);
    };
  }, [socket, selectedEmail]);

  // Request enrichment for loaded emails
  React.useEffect(() => {
    if (!socket || !emails.length) return;

    const appUserId = localStorage.getItem('appUserId');
    const activeEmail = localStorage.getItem('activeEmail');
    
    if (!appUserId || !activeEmail) return;

    // Get IDs of unenriched emails
    const unenrichedIds = emails
      .filter(email => !email.aiMeta?.enrichedAt)
      .map(email => email.id);

    if (unenrichedIds.length > 0) {
      console.log('🔄 Requesting enrichment for', unenrichedIds.length, 'emails');
      emitMailEvent.enrichEmails({
        appUserId,
        email: activeEmail,
        messageIds: unenrichedIds
      });
    }
  }, [socket, emails]);

  // Handle initial email loading
  React.useEffect(() => {
    if (!socket || !isConnected) return;

    const appUserId = localStorage.getItem('appUserId');
    const activeEmail = localStorage.getItem('activeEmail');
    
    if (!appUserId || !activeEmail) return;

    // Listen for incoming email messages
    const handleFolderMessages = (data: {
      folderId: string;
      page: number;
      messages: EnrichedEmail[];
      nextLink: string | null;
    }) => {
      console.log('📨 Received folder messages:', data);
      setEmails(prevEmails => {
        if (data.page === 1) {
          return data.messages;
        }
        return [...prevEmails, ...data.messages];
      });
      setHasMore(!!data.nextLink);
      setIsLoading(false);
      setIsLoadingMore(false); // Reset loading more state
    };

    socket.on('mail:folderMessages', handleFolderMessages);

    // Fetch inbox messages
    emitMailEvent.getFolder({
      appUserId,
      email: activeEmail,
      folderId: 'Inbox',
      page: 1
    });

    return () => {
      socket.off('mail:folderMessages', handleFolderMessages);
    };
  }, [socket, isConnected]);

  // Add this useEffect to listen for mail:message and update selected email
  React.useEffect(() => {
    if (!socket) return;
    const handleFullMessage = (msg: EnrichedEmail) => {
      setEmails(prevEmails => prevEmails.map(e => e.id === msg.id ? { ...e, ...msg } : e));
      setSelectedEmail(prev => prev && prev.id === msg.id ? { ...prev, ...msg } : prev);
    };
    socket.on('mail:message', handleFullMessage);
    return () => {
      socket.off('mail:message', handleFullMessage);
    };
  }, [socket]);

  const handleEmailClick = (email: EnrichedEmail) => {
    // If content is missing or too short, fetch full message
    if (!email.content || email.content.length < 30) {
      const appUserId = localStorage.getItem('appUserId');
      const activeEmail = localStorage.getItem('activeEmail');
      if (appUserId && activeEmail) {
        emitMailEvent.getMessage({
          appUserId,
          email: activeEmail,
          messageId: email.id
        });
      }
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

  const handleBackToClassic = () => {
    router.push('/dashboard');
  };

  const getEnrichmentStatus = (email: EnrichedEmail) => {
    if (email.aiMeta?.error) {
      return { icon: <AlertCircle className="h-3 w-3 text-destructive" />, text: email.aiMeta.error };
    }
    if (!email.aiMeta?.summary) {
      return { icon: <Clock className="h-3 w-3 text-muted-foreground" />, text: 'Analyzing...' };
    }
    return { icon: <Sparkles className="h-3 w-3 text-primary" />, text: email.aiMeta.summary };
  };

  const filteredEmails = React.useMemo(() => {
    return emails.filter(email => {
      const matchesCategory = !selectedCategory || email.aiMeta?.category === selectedCategory;
      const matchesPriority = !selectedPriority || email.aiMeta?.priority === selectedPriority;
      return matchesCategory && matchesPriority;
    });
  }, [emails, selectedCategory, selectedPriority]);

  return (
    <div className="flex h-full bg-background">
      {/* Email List */}
      <div className="w-2/5 h-full border-r border-border bg-card overflow-y-auto">
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
              {showFilters ? 'Hide Filters' : 'Show Filters'}
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
          {isLoading ? (
            // Show skeleton loading for initial load
            Array.from({ length: 10 }).map((_, i) => (
              <EmailSkeleton key={i} />
            ))
          ) : (
            filteredEmails.map((email) => {
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
                        {email.aiMeta?.priority && (
                          <span className={`text-xs px-2 py-0.5 rounded-full ${getPriorityStyle(email.aiMeta.priority)}`}>
                            {email.aiMeta.priority}
                          </span>
                        )}
                        {email.aiMeta?.category && (
                          <span className={`text-xs px-2 py-0.5 rounded-full ${getCategoryStyle()}`}>
                            {email.aiMeta.category}
                          </span>
                        )}
                        {email.aiMeta?.sentiment && (
                          <span className={`text-xs ${getSentimentStyle(email.aiMeta.sentiment)}`}>
                            {email.aiMeta.sentiment}
                          </span>
                        )}
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
            })
          )}
        </div>
        
        {/* Load More Button */}
        {hasMore && (
          <div className="p-4 text-center">
            <button
              onClick={() => {
                setIsLoadingMore(true);
                const appUserId = localStorage.getItem('appUserId');
                const activeEmail = localStorage.getItem('activeEmail');
                if (appUserId && activeEmail) {
                  emitMailEvent.getFolder({
                    appUserId,
                    email: activeEmail,
                    folderId: 'Inbox',
                    page: currentPage + 1
                  });
                  setCurrentPage(prev => prev + 1);
                }
              }}
              disabled={isLoadingMore}
              className="text-sm text-primary hover:text-primary/80 disabled:opacity-50"
            >
              {isLoadingMore ? (
                <div className="flex items-center justify-center gap-2">
                  <div className="h-4 w-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                  Loading...
                </div>
              ) : (
                'Load More'
              )}
            </button>
          </div>
        )}
      </div>

      {/* Email Detail */}
      <div className="w-3/5 h-full overflow-y-auto bg-card border-l border-border flex items-center">
        {selectedEmail ? (
          <EmailDetail 
            email={selectedEmail} 
            onToggleImportant={() => {
              const appUserId = localStorage.getItem('appUserId');
              const activeEmail = localStorage.getItem('activeEmail');
              if (appUserId && activeEmail) {
                emitMailEvent.markImportant({
                  appUserId,
                  email: activeEmail,
                  messageId: selectedEmail.id,
                  flag: !selectedEmail.important
                });
              }
            }} 
          />
        ) : (
          <div className="flex flex-col items-center justify-center w-full h-full text-muted-foreground">
            <svg width="48" height="48" fill="none" viewBox="0 0 24 24" stroke="currentColor" className="mb-4 opacity-30">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
            <span className="text-lg">Select an email to view details</span>
          </div>
        )}
      </div>
    </div>
  );
} 