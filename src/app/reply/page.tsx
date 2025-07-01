'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { ReplyEmail } from '@/components/ReplyEmail';
import { LoadingScreen } from '@/components/LoadingScreen';
import { emitMailEvent } from '@/lib/socket';
import { useSocket } from '@/contexts/SocketContext';
import { MailLayout } from '@/components/MailLayout';

export default function ReplyPage() {
  const searchParams = useSearchParams();
  const [emailData, setEmailData] = useState<{ id: string; subject: string; from: string; to?: string; cc?: string; content?: string; timestamp: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const { socket, isConnected } = useSocket();

  useEffect(() => {
    const emailId = searchParams.get('id');
    const replyType = searchParams.get('type') as 'reply' | 'replyAll';
    
    if (!emailId || !replyType) {
      console.error('Missing required parameters');
      setLoading(false);
      return;
    }

    console.log('Fetching email details for ID:', emailId);

    const appUserId = localStorage.getItem('appUserId');
    const activeEmail = localStorage.getItem('activeEmail');
    
    if (!appUserId || !activeEmail) {
      console.error('Missing user authentication data');
      setLoading(false);
      return;
    }

    if (!socket || !isConnected) {
      console.error('Socket not connected');
      setLoading(false);
      return;
    }

    // Fetch email details via socket
    emitMailEvent.getMessage({
      appUserId,
      email: activeEmail,
      messageId: emailId
    });

    // Set up listener for email content
    const handleEmailContent = (details: { id: string; subject: string; from: string; to?: string; cc?: string; content?: string; timestamp: string }) => {
      if (details.id === emailId) {
        console.log('Received email details:', details);
        setEmailData(details);
        setLoading(false);
        socket.off('mail:message', handleEmailContent);
      }
    };

    const handleError = (error: string) => {
      console.error('Error fetching email:', error);
      setLoading(false);
      socket.off('mail:message', handleEmailContent);
      socket.off('mail:error', handleError);
    };

    socket.on('mail:message', handleEmailContent);
    socket.on('mail:error', handleError);

    // Set a timeout to prevent infinite loading
    const timeout = setTimeout(() => {
      if (loading) {
        console.log('Timeout reached while fetching email');
        setLoading(false);
        socket.off('mail:message', handleEmailContent);
        socket.off('mail:error', handleError);
      }
    }, 10000);

    // Cleanup function
    return () => {
      clearTimeout(timeout);
      socket.off('mail:message', handleEmailContent);
      socket.off('mail:error', handleError);
    };
  }, [searchParams, socket, isConnected]);

  if (loading) {
    return (
      <MailLayout>
        <LoadingScreen />
      </MailLayout>
    );
  }

  if (!emailData) {
    return (
      <MailLayout>
        <div className="flex items-center justify-center h-screen">
          <div className="text-center">
            <h2 className="text-xl font-semibold mb-2">Email Not Found</h2>
            <p className="text-muted-foreground">The email you&apos;re trying to reply to could not be found.</p>
            <p className="text-sm text-muted-foreground mt-2">Please try going back and clicking reply again.</p>
            <div className="mt-4 p-4 bg-muted rounded text-left text-xs">
              <p><strong>Debug Info:</strong></p>
              <p>Email ID: {searchParams.get('id')}</p>
              <p>Reply Type: {searchParams.get('type')}</p>
              <p>Socket connected: {isConnected ? 'Yes' : 'No'}</p>
              <p>App User ID: {localStorage.getItem('appUserId') ? 'Yes' : 'No'}</p>
              <p>Active Email: {localStorage.getItem('activeEmail') ? 'Yes' : 'No'}</p>
            </div>
          </div>
        </div>
      </MailLayout>
    );
  }

  const replyType = searchParams.get('type') as 'reply' | 'replyAll';

  return (
    <MailLayout>
      <div className="w-full h-full">
        <ReplyEmail originalEmail={emailData} replyType={replyType} />
      </div>
    </MailLayout>
  );
} 