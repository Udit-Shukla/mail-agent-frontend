import React, { useEffect, useState } from 'react';
import { format } from 'date-fns';
import {
  Star,
  ListTodo,
  MessageSquare,
  RefreshCw,
  Trash2,
  ArrowLeft,
  File,
  Download
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { emitMailEvent } from '@/lib/socket';
import { useSocket } from '@/contexts/SocketContext';
import { EmailMessage } from '@/types/email';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';

interface EmailMeta {
  summary: string;
  category: string;
  priority: 'urgent' | 'high' | 'medium' | 'low';
  sentiment: 'positive' | 'negative' | 'neutral';
  actionItems: string[];
  enrichedAt: string;
  version: string;
  error?: string;
  followUpDate?: string;
  relatedContacts?: string[];
  relatedDocuments?: string[];
  tags?: string[];
}

interface Props {
  email: {
    id: string;
    subject: string;
    from: string;
    timestamp: string;
    important: boolean;
    content?: string;
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
  };
  onToggleImportant: (id: string) => void;
}

export const EmailDetail: React.FC<Props> = ({ email, onToggleImportant }) => {
  const router = useRouter();
  const { socket, isConnected } = useSocket();
  const [isEnriching, setIsEnriching] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showOriginal, setShowOriginal] = useState(false);
  const [emailContent, setEmailContent] = useState<string | undefined>(email.content);
  const [emailAttachments, setEmailAttachments] = useState(email.attachments);
  const isLongContent = emailContent && emailContent.length > 400;

  // Fetch email content when component mounts or when showOriginal changes
  useEffect(() => {
    if (showOriginal && !emailContent) {
      const appUserId = localStorage.getItem('appUserId');
      const activeEmail = localStorage.getItem('activeEmail');
      
      if (appUserId && activeEmail && socket && isConnected) {
        console.log('🔍 Fetching email content:', {
          appUserId,
          activeEmail,
          messageId: email.id,
          socketConnected: isConnected
        });
        
        // Request the email content
        emitMailEvent.getMessage({
          appUserId,
          email: activeEmail,
          messageId: email.id
        });
      } else {
        console.log('❌ Missing required data:', {
          hasAppUserId: !!appUserId,
          hasActiveEmail: !!activeEmail,
          hasSocket: !!socket,
          isConnected
        });
      }
    }
  }, [showOriginal, email.id, emailContent, socket, isConnected]);

  // Listen for email content updates
  useEffect(() => {
    if (!socket) {
      console.log('❌ Socket not available');
      return;
    }

    console.log('🎧 Setting up socket listeners for email:', email.id);

    const handleEmailContent = (details: EmailMessage) => {
      console.log('📨 Received email content:', {
        receivedId: details.id,
        currentId: email.id,
        hasContent: !!details.content,
        hasAttachments: !!details.attachments,
        attachmentsCount: details.attachments?.length
      });

      if (details.id === email.id) {
        console.log('✅ Content received for current email');
        
        // Update content if available
        if (details.content) {
          console.log('📝 Setting email content');
          setEmailContent(details.content);
        }
        
        // Update attachments if available
        if (details.attachments) {
          console.log('📎 Setting email attachments:', details.attachments.length);
          setEmailAttachments(details.attachments);
        }
      } else {
        console.log('⚠️ Content received for different email');
      }
    };

    const handleEmailError = (error: string) => {
      console.error('❌ Email content error:', error);
      toast.error(error);
    };

    // Add socket event handlers
    socket.on('mail:message', handleEmailContent);
    socket.on('mail:error', handleEmailError);

    // Cleanup function
    return () => {
      console.log('🧹 Cleaning up socket listeners');
      socket.off('mail:message', handleEmailContent);
      socket.off('mail:error', handleEmailError);
    };
  }, [socket, email.id]);

  // Reset content when email changes
  useEffect(() => {
    console.log('🔄 Email changed, resetting content');
    setEmailContent(undefined);
    setEmailAttachments(undefined);
  }, [email.id]);

  useEffect(() => {
    if (!socket || !isConnected) return;

    // Listen for enrichment status updates
    socket.on('mail:enrichmentStatus', (data: { 
      messageId: string; 
      status: 'queued' | 'analyzing' | 'completed' | 'error';
      message: string;
      aiMeta?: EmailMeta;
    }) => {
      console.log('📊 Received enrichment status:', data);
      if (data.messageId === email.id) {
        if (data.status === 'completed') {
          setIsEnriching(false);
        } else if (data.status === 'error') {
          setIsEnriching(false);
          console.error('❌ Enrichment error:', data.message);
        } else if (data.status === 'analyzing') {
          setIsEnriching(true);
        }
      }
    });

    return () => {
      socket.off('mail:enrichmentStatus');
    };
  }, [socket, isConnected, email.id]);

  useEffect(() => {
    // Collapse by default if content is long
    setShowOriginal(!isLongContent);
  }, [email.id]);

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'bg-destructive text-destructive-foreground';
      case 'high': return 'bg-destructive/20 text-destructive';
      case 'medium': return 'bg-primary/20 text-primary';
      case 'low': return 'bg-muted text-muted-foreground';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const getSentimentColor = (sentiment: string) => {
    switch (sentiment) {
      case 'positive': return 'text-green-500 bg-green-500/20 px-2 py-0.5 rounded-full';
      case 'negative': return 'text-destructive bg-destructive/20 px-2 py-0.5 rounded-full';
      case 'neutral': return 'text-muted-foreground bg-muted/20 px-2 py-0.5 rounded-full';
      default: return 'text-muted-foreground bg-muted/20 px-2 py-0.5 rounded-full';
    }
  };

  const getCategoryStyle = () => {
    return 'bg-secondary/20 text-secondary-foreground px-2 py-0.5 rounded-full';
  };

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this email?')) {
      return;
    }

    setIsDeleting(true);
    const appUserId = localStorage.getItem('appUserId');
    const activeEmail = localStorage.getItem('activeEmail');
    
    if (!appUserId || !activeEmail) {
      toast.error('Missing user information');
      setIsDeleting(false);
      return;
    }

    try {
      emitMailEvent.deleteMessage({
        appUserId,
        email: activeEmail,
        messageId: email.id
      });
    } catch (error) {
      console.error('Failed to delete email:', error);
      toast.error('Failed to delete email');
      setIsDeleting(false);
    }
  };

  // Listen for delete confirmation
  useEffect(() => {
    if (!socket || !isConnected) return;

    const handleDeleted = (data: { messageId: string }) => {
      if (data.messageId === email.id) {
        toast.success('Email deleted successfully');
        router.push('/dashboard');
      }
    };

    socket.on('mail:deleted', handleDeleted);

    return () => {
      socket.off('mail:deleted', handleDeleted);
    };
  }, [socket, isConnected, email.id, router]);

  return (
    <div className="h-full w-full flex flex-col bg-background">
      {/* Header */}
      <div className="border-b p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => router.back()}
              className="p-2 hover:bg-accent rounded-full"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <h2 className="text-xl font-semibold pr-4">{email.subject}</h2>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => onToggleImportant(email.id)}
              className={cn(
                "p-2 hover:bg-accent rounded-full",
                email.important && "text-yellow-500"
              )}
            >
              <Star className="h-5 w-5" />
            </button>
            <button
              onClick={handleDelete}
              disabled={isDeleting}
              className={cn(
                "p-2 hover:bg-accent rounded-full text-destructive",
                isDeleting && "opacity-50 cursor-not-allowed"
              )}
            >
              <Trash2 className="h-5 w-5" />
            </button>
          </div>
        </div>
        <div className="mt-2 flex items-center text-sm text-muted-foreground">
          <span className="font-medium text-foreground">{email.from}</span>
          <span className="mx-2">•</span>
          <time>{format(new Date(email.timestamp), 'MMM d, yyyy h:mm a')}</time>
        </div>
        {email.aiMeta && (
          <div className="mt-3 flex flex-wrap gap-2">
            <span className={`text-xs ${getPriorityColor(email.aiMeta.priority)} px-2 py-0.5 rounded-full`}>
              {email.aiMeta.priority}
            </span>
            <span className={`text-xs ${getCategoryStyle()}`}>
              {email.aiMeta.category}
            </span>
            <span className={`text-xs ${getSentimentColor(email.aiMeta.sentiment)}`}>
              {email.aiMeta.sentiment}
            </span>
          </div>
        )}
      </div>

      {/* AI Insights Panel */}
      <div className="bg-muted/50 px-4 border-b">
        <div className="flex items-center justify-between mb-1">
          <h3 className="text-sm font-medium">AI Insights</h3>
          <button
            onClick={() => {
              const appUserId = localStorage.getItem('appUserId');
              const activeEmail = localStorage.getItem('activeEmail');
              if (appUserId && activeEmail) {
                console.log('🔄 Retrying enrichment for:', { appUserId, activeEmail, messageId: email.id });
                setIsEnriching(true);
                emitMailEvent.retryEnrichment({
                  appUserId,
                  email: activeEmail,
                  messageId: email.id
                });
              } else {
                console.error('❌ Missing appUserId or activeEmail');
              }
            }}
            disabled={isEnriching}
            className={cn(
              "inline-flex items-center px-2.5 py-1.5 mt-2 text-xs font-medium bg-background border rounded-md hover:bg-accent focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary",
              isEnriching && "opacity-50 cursor-not-allowed"
            )}
          >
            <RefreshCw className={cn("w-3 h-3 mr-1", isEnriching && "animate-spin")} />
            {isEnriching ? "Analyzing..." : "Retry Analysis"}
          </button>
        </div>
        <div className="space-y-4">
          {/* Summary */}
          <div className="flex items-start space-x-3">
            <MessageSquare className="w-5 h-5 text-muted-foreground mt-0.5 flex-shrink-0" />
            <div className="min-w-0 flex-1">
              <div className="text-xs font-medium mb-1">Summary</div>
              <p className="text-sm text-muted-foreground">{email.aiMeta?.summary}</p>
            </div>
          </div>

          {/* Action Items */}
          {email.aiMeta?.actionItems && email.aiMeta.actionItems.length > 0 && (
            <div className="flex items-start space-x-3">
              <ListTodo className="w-5 h-5 text-muted-foreground mt-0.5 flex-shrink-0" />
              <div className="min-w-0 flex-1">
                <div className="text-xs font-medium mb-1">Action Items</div>
                <ul className="space-y-1">
                  {email.aiMeta.actionItems.map((item: string, index: number) => (
                    <li key={index} className="text-sm text-muted-foreground flex items-start space-x-2">
                      <span className="text-muted-foreground mt-1">•</span>
                      <span className="flex-1">{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Email Content */}
      <div className="flex-1 p-4 overflow-auto">
        <div className="border-t pt-2">
          <div className="mt-6">
            <button
              className="text-sm text-primary underline mb-2"
              onClick={() => {
                console.log('👆 Toggle original email:', !showOriginal);
                setShowOriginal(v => !v);
              }}
            >
              {showOriginal ? 'Hide Original Email' : 'Show Original Email'}
            </button>
            {showOriginal && (
              <div className="prose prose-sm max-w-none rounded p-4 border mt-2 overflow-x-auto bg-gray-200 dark:bg-gray-700">
                {/* Render as HTML if available, fallback to plain text */}
                {emailContent ? (
                  <div dangerouslySetInnerHTML={{ __html: emailContent }} />
                ) : (
                  <div className="italic text-muted-foreground">
                    {socket && isConnected ? 'Loading email content...' : 'Connecting to server...'}
                  </div>
                )}

                {/* Attachments Section */}
                {emailAttachments && Array.isArray(emailAttachments) && emailAttachments.length > 0 && (
                  <div className="mt-6 bg-gray-100 rounded p-4 border border-border dark:bg-gray-700">
                    <h3 className="text-lg font-medium mb-2 text-foreground">Attachments ({emailAttachments.length})</h3>
                    <div className="grid gap-2">
                      {emailAttachments.map((attachment) => (
                        <div
                          key={attachment.id}
                          className="flex items-center justify-between p-3 border border-border rounded-lg bg-white dark:bg-gray-700"
                        >
                          <div className="flex items-center gap-3">
                            <File className="h-5 w-5 text-gray-600" />
                            <div className="flex flex-col">
                              <span className="text-sm font-medium text-foreground">{attachment.name}</span>
                              <span className="text-xs text-muted-foreground">
                                {(attachment.size / 1024).toFixed(1)} KB
                              </span>
                            </div>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              try {
                                // Convert base64 to blob and download
                                const byteCharacters = atob(attachment.contentBytes);
                                const byteNumbers = new Array(byteCharacters.length);
                                for (let i = 0; i < byteCharacters.length; i++) {
                                  byteNumbers[i] = byteCharacters.charCodeAt(i);
                                }
                                const byteArray = new Uint8Array(byteNumbers);
                                const blob = new Blob([byteArray], { type: attachment.contentType });
                                const url = window.URL.createObjectURL(blob);
                                const a = document.createElement('a');
                                a.href = url;
                                a.download = attachment.name;
                                document.body.appendChild(a);
                                a.click();
                                window.URL.revokeObjectURL(url);
                                document.body.removeChild(a);
                              } catch (error) {
                                console.error('Error downloading attachment:', error);
                                toast.error('Failed to download attachment');
                              }
                            }}
                            className="flex items-center gap-2 text-gray-700 hover:text-gray-900"
                          >
                            <Download className="h-4 w-4 text-foreground" />
                            <span className="text-foreground">Download</span>
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};