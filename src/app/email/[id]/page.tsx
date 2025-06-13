'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Avatar } from '@/components/ui/avatar'
import { Separator } from '@/components/ui/separator'
import { toast } from 'sonner'
import {
  ChevronLeft,
  Mail,
  Star,
  Trash2,
  Reply,
  ReplyAll,
  Forward,
  Archive,
  Flag,
  MoreVertical,
  Download,
  File
} from 'lucide-react'
import { useSocket } from '@/contexts/SocketContext'
import { emitMailEvent } from '@/lib/socket'
import { cn } from '@/lib/utils'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

interface EmailDetails {
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

export default function EmailPage() {
  const params = useParams();
  const router = useRouter();
  const [email, setEmail] = useState<EmailDetails | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { socket, isConnected, addEventHandler, removeEventHandler } = useSocket();
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    const messageId = params.id as string;
    const appUserId = localStorage.getItem('appUserId');
    const activeEmail = localStorage.getItem('activeEmail');

    if (!appUserId || !activeEmail) {
      console.log('[Debug] Missing required data, redirecting to home');
      router.push('/');
      return;
    }

    const handleEmailContent = (details: EmailDetails) => {
      console.log('[Debug] Received email content:', details.id);
      if (details.id === messageId) {
        console.log('[Debug] Content received for current email');
        console.log('[Debug] Full email details:', details);
        console.log('[Debug] Attachments:', details.attachments);
        setEmail(details);
        setIsLoading(false);
      }
    };

    const handleError = (error: string) => {
      console.error('[Debug] Email content error:', error);
      toast.error(error);
      setIsLoading(false);
    };

    const handleImportantMarked = ({ messageId, flag }: { messageId: string; flag: boolean }) => {
      if (messageId === params.id) {
        setEmail(prev => prev ? { ...prev, important: flag } : null);
      }
    };

    // Add socket event handlers
    addEventHandler('mail:message', handleEmailContent);
    addEventHandler('mail:error', handleError);
    addEventHandler('mail:importantMarked', handleImportantMarked);

    // If socket is already connected, fetch the email
    if (isConnected) {
      console.log('[Debug] Socket connected, fetching email content');
      emitMailEvent.getMessage({
        appUserId,
        email: activeEmail,
        messageId
      });
    } else {
      console.log('[Debug] Socket not connected, waiting for connection...');
    }

    return () => {
      // Clean up event handlers
      removeEventHandler('mail:message', handleEmailContent);
      removeEventHandler('mail:error', handleError);
      removeEventHandler('mail:importantMarked', handleImportantMarked);
    };
  }, [params.id, router, socket, isConnected, addEventHandler, removeEventHandler]);

  const handleToggleImportant = () => {
    const appUserId = localStorage.getItem('appUserId');
    const activeEmail = localStorage.getItem('activeEmail');
    if (!appUserId || !activeEmail || !email) return;

    emitMailEvent.markImportant({
      appUserId,
      email: activeEmail,
      messageId: email.id,
      flag: !email.important
    });

    // Optimistically update UI
    setEmail(prev => prev ? { ...prev, important: !prev.important } : null);
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
        messageId: params.id as string
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
      if (data.messageId === params.id) {
        toast.success('Email deleted successfully');
        router.push('/dashboard');
      }
    };

    socket.on('mail:deleted', handleDeleted);

    return () => {
      socket.off('mail:deleted', handleDeleted);
    };
  }, [socket, isConnected, params.id, router]);

  if (isLoading) {
    return (
      <div className="container mx-auto p-4">
        <div className="flex items-center gap-4 mb-6">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Skeleton className="h-6 w-1/3" />
        </div>
        <div className="space-y-4">
          <Skeleton className="h-8 w-1/4" />
          <Skeleton className="h-4 w-1/2" />
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-4 w-2/3" />
          <Separator className="my-4" />
          <Skeleton className="h-32 w-full" />
        </div>
      </div>
    );
  }

  if (!email) {
    return (
      <div className="container mx-auto p-4">
        <div className="flex items-center gap-4 mb-6">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-2xl font-semibold">Email not found</h1>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6">
      {/* Top Action Bar */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.back()}
            className="flex items-center gap-2"
          >
            <ChevronLeft className="h-4 w-4" />
            Back
          </Button>
          <div className="h-6 w-px bg-border mx-2" />
          <Button variant="ghost" size="sm" className="flex items-center gap-2">
            <Reply className="h-4 w-4" />
            Reply
          </Button>
          <Button variant="ghost" size="sm" className="flex items-center gap-2">
            <ReplyAll className="h-4 w-4" />
            Reply All
          </Button>
          <Button variant="ghost" size="sm" className="flex items-center gap-2">
            <Forward className="h-4 w-4" />
            Forward
          </Button>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleToggleImportant}
            className={cn(
              "flex items-center gap-2",
              email.important && "text-yellow-500"
            )}
          >
            <Star className={cn(
              "h-4 w-4",
              email.important && "fill-yellow-400"
            )} />
            {email.important ? 'Remove Important' : 'Mark as Important'}
          </Button>
          <Button variant="ghost" size="sm" className="flex items-center gap-2">
            <Archive className="h-4 w-4" />
            Archive
          </Button>
          <Button variant="ghost" size="sm" className="flex items-center gap-2">
            <Flag className="h-4 w-4" />
            Flag
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                onClick={handleDelete}
                disabled={isDeleting}
                className="text-red-500 focus:text-red-500"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Email Header */}
      <div className="bg-card rounded-lg border p-6 mb-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-start gap-4">
            <Avatar className="h-10 w-10">
              <Mail className="h-6 w-6" />
            </Avatar>
            <div>
              <h1 className="text-2xl font-semibold mb-2">{email.subject}</h1>
              <div className="flex items-center gap-2">
                <p className="font-medium">{email.from}</p>
                <span className="text-muted-foreground">•</span>
                <p className="text-sm text-muted-foreground">
                  {new Date(email.timestamp).toLocaleString()}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-2 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <span className="font-medium text-foreground">From:</span>
            {email.from}
          </div>
          <div className="flex items-center gap-2">
            <span className="font-medium text-foreground">To:</span>
            {email.to}
          </div>
          {email.cc && (
            <div className="flex items-center gap-2">
              <span className="font-medium text-foreground">Cc:</span>
              {email.cc}
            </div>
          )}
        </div>
      </div>

      {/* Email Content */}
      <div className="bg-card rounded-lg border p-6">
        <div className="prose max-w-none" dangerouslySetInnerHTML={{ __html: email.content }} />

        {email.attachments && Array.isArray(email.attachments) && email.attachments.length > 0 && (
          <div className="mt-6">
            <h3 className="text-lg font-medium mb-2">Attachments ({email.attachments.length})</h3>
            <div className="grid gap-2">
              {email.attachments.map((attachment) => {
                console.log('[Debug] Rendering attachment:', attachment);
                return (
                  <div
                    key={attachment.id}
                    className="flex items-center justify-between p-3 border rounded-lg hover:bg-accent/50"
                  >
                    <div className="flex items-center gap-3">
                      <File className="h-5 w-5 text-muted-foreground" />
                      <div className="flex flex-col">
                        <span className="text-sm font-medium">{attachment.name}</span>
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
                      className="flex items-center gap-2"
                    >
                      <Download className="h-4 w-4" />
                      Download
                    </Button>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
} 