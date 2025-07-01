'use client'

import React from 'react';
import { EmailDetail } from '@/components/EmailDetail';
import { emitMailEvent } from '@/lib/socket';
import { useSocket } from '@/contexts/SocketContext';
import { Sparkles, AlertCircle, Clock, ArrowLeft, Filter } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { getEmailCategories, type EmailCategory as Category } from "@/lib/api/emailCategories"
import { toast } from "sonner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"


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
  to?: string;
  cc?: string;
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

const PRIORITIES = ['All', 'urgent', 'high', 'medium', 'low'] as const;
const SENTIMENTS = ['All', 'positive', 'negative', 'neutral'] as const;

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
  const searchParams = useSearchParams();
  const { socket, isConnected } = useSocket();
  const [selectedEmail, setSelectedEmail] = React.useState<EnrichedEmail | null>(null);
  const [emails, setEmails] = React.useState<EnrichedEmail[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [currentPage, setCurrentPage] = React.useState(1);
  const [hasMore, setHasMore] = React.useState(true);
  const [isLoadingMore, setIsLoadingMore] = React.useState(false);
  const [selectedCategory, setSelectedCategory] = React.useState<string | null>(null);
  const [selectedPriority, setSelectedPriority] = React.useState<string | null>(null);
  const [selectedSentiment, setSelectedSentiment] = React.useState<string | null>(null);
  const [showFilters, setShowFilters] = React.useState(false);
  const [categories, setCategories] = React.useState<Category[]>([]);
  const [currentActiveEmail, setCurrentActiveEmail] = React.useState<string | null>(null);

  // Watch for changes in activeEmail from localStorage
  React.useEffect(() => {
    const checkActiveEmail = () => {
      const activeEmail = localStorage.getItem('activeEmail');
      if (activeEmail !== currentActiveEmail) {
        console.log('🔄 Account switched from', currentActiveEmail, 'to', activeEmail);
        setCurrentActiveEmail(activeEmail);
        
        // Reset component state when account changes
        setSelectedEmail(null);
        setEmails([]);
        setCurrentPage(1);
        setHasMore(true);
        setIsLoading(true);
        setIsLoadingMore(false);
        setSelectedCategory(null);
        setSelectedPriority(null);
        setSelectedSentiment(null);
        setShowFilters(false);
      }
    };

    // Check immediately
    checkActiveEmail();

    // Set up interval to check for changes
    const interval = setInterval(checkActiveEmail, 1000);

    return () => clearInterval(interval);
  }, [currentActiveEmail]);

  // Fetch categories on component mount and when active email changes
  React.useEffect(() => {
    const fetchCategories = async () => {
      try {
        const userCategories = await getEmailCategories();
        setCategories(userCategories);
      } catch (error) {
        console.error('Error fetching categories:', error);
        toast.error('Failed to load categories');
      }
    };
    
    if (currentActiveEmail) {
      fetchCategories();
    }
  }, [currentActiveEmail]);

  // Handle URL parameters for filters
  React.useEffect(() => {
    const category = searchParams.get('category');
    const priority = searchParams.get('priority');
    const sentiment = searchParams.get('sentiment');

    if (category) {
      setSelectedCategory(category);
      setShowFilters(true);
    }
    if (priority) {
      setSelectedPriority(priority);
      setShowFilters(true);
    }
    if (sentiment) {
      setSelectedSentiment(sentiment);
      setShowFilters(true);
    }
  }, [searchParams]);

  // Load more emails when category is selected and no results are found
  React.useEffect(() => {
    if (selectedCategory && !isLoading && !isLoadingMore) {
      const hasMatchingEmails = emails.some(email => email.aiMeta?.category === selectedCategory);
      if (!hasMatchingEmails && hasMore) {
        loadMoreEmails();
      }
    }
  }, [selectedCategory, emails, isLoading, isLoadingMore, hasMore]);

  const loadMoreEmails = async () => {
    if (!socket || !isConnected || isLoadingMore || !hasMore || !currentActiveEmail) return;

    const appUserId = localStorage.getItem('appUserId');
    
    if (!appUserId) return;

    setIsLoadingMore(true);
    const nextPage = currentPage + 1;

    try {
      emitMailEvent.getFolder({
        appUserId,
        email: currentActiveEmail,
        folderId: 'Inbox',
        page: nextPage
      });
      setCurrentPage(nextPage);
    } catch (error) {
      console.error('Error loading more emails:', error);
    } finally {
      setIsLoadingMore(false);
    }
  };

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
            // Otherwise, update the aiMeta if available
            if (data.aiMeta) {
              return {
                ...email,
                aiMeta: { ...email.aiMeta, ...data.aiMeta }
              };
            }
            return email;
          }
          return email;
        });
      });

      // Update selected email if it's the one being updated
      if (selectedEmail?.id === data.messageId) {
        if (data.email) {
          setSelectedEmail(data.email);
        } else if (data.aiMeta) {
          setSelectedEmail(prev => prev ? {
            ...prev,
            aiMeta: { ...prev.aiMeta, ...data.aiMeta }
          } : null);
        }
      }
    };

    // Handle category update responses
    const handleCategoryUpdated = (data: {
      messageId: string;
      category: string;
      aiMeta: EmailMeta;
    }) => {
      console.log('🏷️ Category updated:', data);
      
      // Update emails list
      setEmails(prevEmails => 
        prevEmails.map(email => 
          email.id === data.messageId 
            ? { ...email, aiMeta: { ...email.aiMeta, ...data.aiMeta } }
            : email
        )
      );

      // Update selected email if it's the one being updated
      if (selectedEmail?.id === data.messageId) {
        setSelectedEmail(prev => prev ? {
          ...prev,
          aiMeta: { ...prev.aiMeta, ...data.aiMeta }
        } : null);
      }
    };

    // Listen for enrichment events
    socket.on('mail:enrichmentStatus', handleEnrichmentUpdate);
    socket.on('mail:categoryUpdated', handleCategoryUpdated);

    return () => {
      socket.off('mail:enrichmentStatus', handleEnrichmentUpdate);
      socket.off('mail:categoryUpdated', handleCategoryUpdated);
    };
  }, [socket, selectedEmail]);

  // Request enrichment for loaded emails
  React.useEffect(() => {
    if (!socket || !emails.length || !currentActiveEmail) return;

    const appUserId = localStorage.getItem('appUserId');
    
    if (!appUserId) return;

    // Get IDs of unenriched emails
    const unenrichedIds = emails
      .filter(email => !email.aiMeta?.enrichedAt)
      .map(email => email.id);

    if (unenrichedIds.length > 0) {
      console.log('🔄 Requesting enrichment for', unenrichedIds.length, 'emails');
      emitMailEvent.enrichEmails({
        appUserId,
        email: currentActiveEmail,
        messageIds: unenrichedIds
      });
    }
  }, [socket, emails, currentActiveEmail]);

  // Handle initial email loading
  React.useEffect(() => {
    if (!socket || !isConnected || !currentActiveEmail) return;

    const appUserId = localStorage.getItem('appUserId');
    
    if (!appUserId) return;

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
        // Deduplicate emails by ID to prevent duplicates
        const existingIds = new Set(prevEmails.map(email => email.id));
        const newEmails = data.messages.filter(email => !existingIds.has(email.id));
        return [...prevEmails, ...newEmails];
      });
      setHasMore(!!data.nextLink);
      setIsLoading(false);
      setIsLoadingMore(false);
    };

    socket.on('mail:folderMessages', handleFolderMessages);

    // Reset state when loading new folder
    setCurrentPage(1);
    setHasMore(true);
    setIsLoading(true);
    setEmails([]);

    // Fetch inbox messages
    emitMailEvent.getFolder({
      appUserId,
      email: currentActiveEmail,
      folderId: 'Inbox',
      page: 1
    });

    return () => {
      socket.off('mail:folderMessages', handleFolderMessages);
    };
  }, [socket, isConnected, currentActiveEmail]);

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

  // Listen for emails marked as read
  React.useEffect(() => {
    if (!socket) return;
    const handleEmailMarkedRead = (data: { messageId: string }) => {
      setEmails(prevEmails => 
        prevEmails.map(email => 
          email.id === data.messageId 
            ? { ...email, read: true }
            : email
        )
      );
      setSelectedEmail(prev => 
        prev && prev.id === data.messageId 
          ? { ...prev, read: true }
          : prev
      );
    };
    socket.on('mail:markedRead', handleEmailMarkedRead);
    return () => {
      socket.off('mail:markedRead', handleEmailMarkedRead);
    };
  }, [socket]);

  const handleEmailClick = (email: EnrichedEmail) => {
    // If content is missing or too short, fetch full message
    if (!email.content || email.content.length < 30) {
      const appUserId = localStorage.getItem('appUserId');
      if (appUserId && currentActiveEmail) {
        emitMailEvent.getMessage({
          appUserId,
          email: currentActiveEmail,
          messageId: email.id
        });
      }
    }
    setSelectedEmail(email);
    
    if (!email.read) {
      const appUserId = localStorage.getItem('appUserId');
      
      if (!appUserId || !currentActiveEmail) return;

      emitMailEvent.markRead({
        appUserId,
        email: currentActiveEmail,
        messageId: email.id
      });
    }
  };

  const handleBackToClassic = () => {
    router.push('/emailList');
  };

  const handleCategoryUpdate = (emailId: string, newCategory: string) => {
    const appUserId = localStorage.getItem('appUserId');
    
    if (!appUserId || !currentActiveEmail) {
      toast.error('Missing user information');
      return;
    }

    // Update local state immediately for responsive UI
    setEmails(prevEmails => 
      prevEmails.map(email => 
        email.id === emailId 
          ? { ...email, aiMeta: { ...email.aiMeta, category: newCategory } }
          : email
      )
    );

    // Update selected email if it's the one being updated
    if (selectedEmail?.id === emailId) {
      setSelectedEmail(prev => prev ? { ...prev, aiMeta: { ...prev.aiMeta, category: newCategory } } : null);
    }

    // Send update to backend
    emitMailEvent.updateEmailCategory({
      appUserId,
      email: currentActiveEmail,
      messageId: emailId,
      category: newCategory
    });

    toast.success('Category updated successfully');
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
      const matchesCategory = !selectedCategory || selectedCategory === 'All' || email.aiMeta?.category === selectedCategory;
      const matchesPriority = !selectedPriority || selectedPriority === 'All' || email.aiMeta?.priority === selectedPriority;
      const matchesSentiment = !selectedSentiment || selectedSentiment === 'All' || email.aiMeta?.sentiment === selectedSentiment;
      return matchesCategory && matchesPriority && matchesSentiment;
    });
  }, [emails, selectedCategory, selectedPriority, selectedSentiment]);

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
            <div className="space-y-4 mt-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Category</label>
                <div className="flex flex-wrap gap-2">
                  <button
                    key="All"
                    onClick={() => setSelectedCategory(selectedCategory === 'All' ? null : 'All')}
                    className={`px-3 py-1 rounded-full text-sm transition-colors ${
                      selectedCategory === 'All'
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-secondary/20 text-secondary-foreground hover:bg-secondary/30'
                    }`}
                  >
                    All
                  </button>
                  {categories.map(category => (
                    <button
                      key={category.name}
                      onClick={() => setSelectedCategory(selectedCategory === category.name ? null : category.name)}
                      className={`px-3 py-1 rounded-full text-sm transition-colors ${
                        selectedCategory === category.name
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-secondary/20 text-secondary-foreground hover:bg-secondary/30'
                      }`}
                      style={{ backgroundColor: selectedCategory === category.name ? undefined : category.color + '20' }}
                    >
                      {category.label}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">Priority</label>
                <div className="flex flex-wrap gap-2">
                  {PRIORITIES.map(priority => (
                    <button
                      key={priority}
                      onClick={() => setSelectedPriority(selectedPriority === priority ? null : priority)}
                      className={`px-3 py-1 rounded-full text-sm transition-colors ${
                        selectedPriority === priority
                          ? getPriorityStyle(priority)
                          : 'bg-secondary/20 text-secondary-foreground hover:bg-secondary/30'
                      }`}
                    >
                      {priority}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">Sentiment</label>
                <div className="flex flex-wrap gap-2">
                  {SENTIMENTS.map(sentiment => (
                    <button
                      key={sentiment}
                      onClick={() => setSelectedSentiment(selectedSentiment === sentiment ? null : sentiment)}
                      className={`px-3 py-1 rounded-full text-sm transition-colors ${
                        selectedSentiment === sentiment
                          ? getSentimentStyle(sentiment)
                          : 'bg-secondary/20 text-secondary-foreground hover:bg-secondary/30'
                      }`}
                    >
                      {sentiment}
                    </button>
                  ))}
                </div>
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
          ) : filteredEmails.length === 0 ? (
            <div className="p-4 text-center text-muted-foreground">
              {isLoadingMore ? (
                <div className="flex items-center justify-center gap-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-primary border-t-transparent" />
                  <span>Loading more emails...</span>
                </div>
              ) : (
                <p>No emails found in this category</p>
              )}
            </div>
          ) : (
            <>
              {filteredEmails.map(email => {
                const { icon, text } = getEnrichmentStatus(email);
                return (
                  <div
                    key={email.id}
                    onClick={() => handleEmailClick(email)}
                    className={`p-4 cursor-pointer hover:bg-accent/50 transition-colors ${
                      selectedEmail?.id === email.id ? 'bg-accent' : ''
                    } ${!email.read ? 'border-l-4 border-primary bg-primary/5' : ''}`}
                  >
                    <div className="flex flex-col">
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2">
                          <p className={`text-sm font-medium text-card-foreground truncate ${
                            !email.read ? 'font-semibold' : ''
                          }`}>
                            {email.from.split('<')[0]}
                          </p>
                          {email.aiMeta?.priority && (
                            <span className={`text-xs px-2 py-0.5 rounded-full ${getPriorityStyle(email.aiMeta.priority)}`}>
                              {email.aiMeta.priority}
                            </span>
                          )}
                          {email.aiMeta?.category && (
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <span 
                                  className={`text-xs px-2 py-0.5 rounded-full ${getCategoryStyle()} cursor-pointer hover:opacity-80`}
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  {categories.find(c => c.name === email.aiMeta.category)?.label || email.aiMeta.category}
                                </span>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="start">
                                {categories.map(category => (
                                  <DropdownMenuItem
                                    key={category.name}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleCategoryUpdate(email.id, category.name);
                                    }}
                                    className="flex items-center gap-2"
                                  >
                                    <div 
                                      className="w-3 h-3 rounded-full" 
                                      style={{ backgroundColor: category.color }}
                                    />
                                    {category.label}
                                  </DropdownMenuItem>
                                ))}
                              </DropdownMenuContent>
                            </DropdownMenu>
                          )}
                          {email.aiMeta?.sentiment && (
                            <span className={`text-xs ${getSentimentStyle(email.aiMeta.sentiment)}`}>
                              {email.aiMeta.sentiment}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {new Date(email.timestamp).toLocaleDateString()} {new Date(email.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                      <p className={`text-sm text-card-foreground mb-2 ${
                        !email.read ? 'font-semibold' : 'font-medium'
                      }`}>
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
              {hasMore && (
                <button
                  onClick={loadMoreEmails}
                  disabled={isLoadingMore}
                  className="w-full p-4 text-center text-sm text-muted-foreground hover:text-primary transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoadingMore ? (
                    <div className="flex items-center justify-center gap-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-primary border-t-transparent" />
                      <span>Loading more...</span>
                    </div>
                  ) : (
                    'Load More'
                  )}
                </button>
              )}
            </>
          )}
        </div>
      </div>

      {/* Email Detail */}
      <div className="w-3/5 h-full overflow-y-auto bg-card border-l border-border flex items-center">
        {selectedEmail ? (
          <EmailDetail 
            email={selectedEmail} 
            onToggleImportant={() => {
              const appUserId = localStorage.getItem('appUserId');
              if (appUserId && currentActiveEmail) {
                emitMailEvent.markImportant({
                  appUserId,
                  email: currentActiveEmail,
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