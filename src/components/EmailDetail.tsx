import React, { useEffect, useState } from 'react';
import { format } from 'date-fns';
import {
  Star,
  AlertCircle,
  ListTodo,
  MessageSquare,
  Loader2,
  RefreshCw
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { emitMailEvent } from '@/lib/socket';
import { useSocket } from '@/contexts/SocketContext';
import { EmailMessage } from '@/types/email';

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
  };
  onToggleImportant: (id: string) => void;
}

export const EmailDetail: React.FC<Props> = ({ email, onToggleImportant }) => {
  const [emailContent, setEmailContent] = useState<string | null>(email.content || null);
  const [isLoadingContent, setIsLoadingContent] = useState(!email.content);
  const [contentError, setContentError] = useState<string | null>(null);
  const [isEnriching, setIsEnriching] = useState(false);
  const { socket, isConnected, addEventHandler, removeEventHandler } = useSocket();

  useEffect(() => {
    // If content is not available, fetch it
    if (!emailContent && !contentError) {
      const appUserId = localStorage.getItem('appUserId');
      const activeEmail = localStorage.getItem('activeEmail');
      
      if (appUserId && activeEmail) {
        console.log('Fetching email content for:', email.id);
        console.log('Socket connection status:', isConnected);
        setIsLoadingContent(true);
        
        // Ensure socket is connected before sending request
        if (isConnected && socket) {
          emitMailEvent.getMessage({
            appUserId,
            email: activeEmail,
            messageId: email.id
          });
        } else {
          console.error('Socket not connected');
          setContentError('Connection error - please refresh the page');
          setIsLoadingContent(false);
        }
      } else {
        setContentError('Missing authentication data');
        setIsLoadingContent(false);
      }
    }
  }, [email.id, emailContent, contentError, socket, isConnected]);

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

  // Listen for email content updates
  useEffect(() => {
    console.log('Setting up socket listeners for email:', email.id);
    
    const handleEmailContent = (details: EmailMessage) => {
      console.log('Received email content:', details);
      if (details.id === email.id) {
        console.log('Content received for current email');
        setEmailContent(details.content);
        setIsLoadingContent(false);
        setContentError(null);
      } else {
        console.log('Content received for different email:', details.id);
      }
    };

    const handleEmailError = (error: string) => {
      console.error('Email content error:', error);
      setContentError(error);
      setIsLoadingContent(false);
    };

    // Add socket event handlers using the context
    if (socket) {
      addEventHandler('mail:message', handleEmailContent);
      addEventHandler('mail:error', handleEmailError);
      
      // If socket is already connected, try fetching again
      if (isConnected && !emailContent && !contentError) {
        const appUserId = localStorage.getItem('appUserId');
        const activeEmail = localStorage.getItem('activeEmail');
        
        if (appUserId && activeEmail) {
          console.log('Socket already connected, fetching email content');
          emitMailEvent.getMessage({
            appUserId,
            email: activeEmail,
            messageId: email.id
          });
        }
      }
    }

    return () => {
      // Clean up event handlers
      removeEventHandler('mail:message', handleEmailContent);
      removeEventHandler('mail:error', handleEmailError);
    };
  }, [email.id, emailContent, contentError, socket, isConnected, addEventHandler, removeEventHandler]);

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

  const renderEmailContent = () => {
    if (isLoadingContent) {
      return (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
          <span className="ml-2 text-gray-500">Loading email content...</span>
        </div>
      );
    }

    if (contentError) {
      return (
        <div className="flex items-center justify-center py-8 text-red-500">
          <AlertCircle className="w-5 h-5 mr-2" />
          <span>Failed to load email content: {contentError}</span>
        </div>
      );
    }

    if (!emailContent) {
      return (
        <div className="text-gray-500 italic py-4">
          No content available for this email.
        </div>
      );
    }

    // Check if content is HTML or plain text
    const isHtml = emailContent.includes('<') && emailContent.includes('>');
    
    if (isHtml) {
      return (
        <div 
          className="prose prose-sm max-w-none text-gray-700"
          dangerouslySetInnerHTML={{ __html: emailContent }}
        />
      );
    } else {
      return (
        <div className="text-gray-700 whitespace-pre-wrap break-words leading-relaxed">
          {emailContent}
        </div>
      );
    }
  };

  return (
    <div className="h-full flex flex-col bg-white">
      {/* Header */}
      <div className="border-b border-gray-200 p-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-900 pr-4">{email.subject}</h2>
          <button
            onClick={() => onToggleImportant(email.id)}
            className="p-1 hover:bg-gray-100 rounded-full flex-shrink-0"
          >
            <Star
              className={cn(
                'w-6 h-6',
                email.important ? 'text-yellow-400 fill-current' : 'text-gray-400'
              )}
            />
          </button>
        </div>
        <div className="mt-2 flex items-center text-sm text-gray-500">
          <span className="font-medium">{email.from}</span>
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
      <div className="bg-gray-50 px-4 border-b border-gray-200">
        <div className="flex items-center justify-between mb-1">
          <h3 className="text-sm font-medium text-gray-900">AI Insights</h3>
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
              "inline-flex items-center px-2.5 py-1.5 mt-2 text-xs font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary",
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
            <MessageSquare className="w-5 h-5 text-gray-400 mt-0.5 flex-shrink-0" />
            <div className="min-w-0 flex-1">
              <div className="text-xs font-medium text-gray-700 mb-1">Summary</div>
              <p className="text-sm text-gray-600">{email.aiMeta?.summary}</p>
            </div>
          </div>

          {/* Action Items */}
          {email.aiMeta?.actionItems && email.aiMeta.actionItems.length > 0 && (
            <div className="flex items-start space-x-3">
              <ListTodo className="w-5 h-5 text-gray-400 mt-0.5 flex-shrink-0" />
              <div className="min-w-0 flex-1">
                <div className="text-xs font-medium text-gray-700 mb-1">Action Items</div>
                <ul className="space-y-1">
                  {email.aiMeta.actionItems.map((item: string, index: number) => (
                    <li key={index} className="text-sm text-gray-600 flex items-start space-x-2">
                      <span className="text-gray-400 mt-1">•</span>
                      <span className="flex-1">{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          {/* {email.aiMeta?.followUpDate && (
            <div>
              <div className="text-xs font-medium text-gray-700 mb-1">Follow-up Date</div>
              <div className="text-sm text-gray-600">{email.aiMeta.followUpDate}</div>
            </div>
          )}

          {email.aiMeta?.relatedContacts && email.aiMeta.relatedContacts.length > 0 && (
            <div>
              <div className="text-xs font-medium text-gray-700 mb-1">Related Contacts</div>
              <div className="text-sm text-gray-600">{email.aiMeta.relatedContacts.join(", ")}</div>
            </div>
          )}

          {email.aiMeta?.relatedDocuments && email.aiMeta.relatedDocuments.length > 0 && (
            <div>
              <div className="text-xs font-medium text-gray-700 mb-1">Related Documents</div>
              <div className="text-sm text-gray-600">{email.aiMeta.relatedDocuments.join(", ")}</div>
            </div>
          )}

          {email.aiMeta?.tags && email.aiMeta.tags.length > 0 && (
            <div>
              <div className="text-xs font-medium text-gray-700 mb-1">Tags</div>
              <div className="flex flex-wrap gap-2">
                {email.aiMeta.tags.map((tag: string, index: number) => (
                  <span key={index} className="px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded-full">
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          )} */}
        </div>
      </div>

      {/* Email Content */}
      <div className="flex-1 p-4 overflow-auto">
        <div className="border-t border-gray-200 pt-2">
          {/* <h3 className="text-sm font-medium text-gray-900 mb-4">Original Email</h3> */}
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            {renderEmailContent()}
          </div>
        </div>
      </div>
    </div>
  );
};