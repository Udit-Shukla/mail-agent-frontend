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
} from 'lucide-react'
import { useSocket } from '@/contexts/SocketContext'
import { emitMailEvent } from '@/lib/socket'

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
        setEmail(details);
        setIsLoading(false);
      }
    };

    const handleError = (error: string) => {
      console.error('[Debug] Email content error:', error);
      toast.error(error);
      setIsLoading(false);
    };

    // Add socket event handlers
    addEventHandler('mail:message', handleEmailContent);
    addEventHandler('mail:error', handleError);

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
    };
  }, [params.id, router, socket, isConnected, addEventHandler, removeEventHandler]);

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
    <div className="container mx-auto p-4">
      <div className="flex items-center gap-4 mb-6">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <h1 className="text-2xl font-semibold">{email.subject}</h1>
      </div>

      <div className="space-y-4">
        <div className="flex items-start gap-4">
          <Avatar className="h-10 w-10">
            <Mail className="h-6 w-6" />
          </Avatar>
          <div className="flex-1">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">{email.from}</p>
                <p className="text-sm text-muted-foreground">To: {email.to}</p>
                {email.cc && (
                  <p className="text-sm text-muted-foreground">Cc: {email.cc}</p>
                )}
              </div>
              <p className="text-sm text-muted-foreground">
                {new Date(email.timestamp).toLocaleString()}
              </p>
            </div>
          </div>
        </div>

        <Separator className="my-4" />

        <div className="prose max-w-none" dangerouslySetInnerHTML={{ __html: email.content }} />

        {email.attachments && email.attachments.length > 0 && (
          <div className="mt-6">
            <h3 className="text-lg font-medium mb-2">Attachments</h3>
            <div className="grid gap-2">
              {email.attachments.map((attachment) => (
                <div
                  key={attachment.id}
                  className="flex items-center gap-2 p-2 border rounded-lg"
                >
                  <Mail className="h-4 w-4" />
                  <span className="text-sm">{attachment.name}</span>
                  <span className="text-xs text-muted-foreground">
                    ({(attachment.size / 1024).toFixed(1)} KB)
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
} 