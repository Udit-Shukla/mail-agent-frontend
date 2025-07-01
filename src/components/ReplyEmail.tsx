'use client';

import { useState, ChangeEvent, KeyboardEvent, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { ArrowLeft, Paperclip, Send, X, Sparkles } from 'lucide-react';
import { emitMailEvent } from '@/lib/socket';
import { Textarea } from '@/components/ui/textarea';
import { useRouter } from 'next/navigation';
import { parseEmailAddresses } from '@/lib/utils';
import { useSocket } from '@/contexts/SocketContext';
import { AIGenerationModal } from '@/components/AIGenerationModal';

interface Attachment {
  id: string;
  name: string;
  size: number;
  type: string;
}

interface EmailPill {
  id: string;
  email: string;
}

interface FormData {
  toEmails: EmailPill[];
  ccEmails: EmailPill[];
  bccEmails: EmailPill[];
  toInput: string;
  ccInput: string;
  bccInput: string;
  subject: string;
  body: string;
  attachments: Attachment[];
}

interface ReplyEmailProps {
  originalEmail: {
    id: string;
    subject: string;
    from: string;
    to?: string;
    cc?: string;
    content?: string;
    timestamp: string;
    aiMeta?: {
      priority: 'urgent' | 'high' | 'medium' | 'low';
      category: string;
      sentiment: 'positive' | 'negative' | 'neutral';
    };
  };
  replyType: 'reply' | 'replyAll';
}

const isValidEmail = (email: string) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

export const ReplyEmail = ({ originalEmail, replyType }: ReplyEmailProps) => {
  const router = useRouter();
  const { socket } = useSocket();
  const [formData, setFormData] = useState<FormData>({
    toEmails: [],
    ccEmails: [],
    bccEmails: [],
    toInput: '',
    ccInput: '',
    bccInput: '',
    subject: '',
    body: '',
    attachments: []
  });
  const [isSending, setIsSending] = useState(false);
  const [showCc, setShowCc] = useState(false);
  const [showBcc, setShowBcc] = useState(false);

  // Listen for reply success events
  useEffect(() => {
    if (!socket) return;

    const handleReplySuccess = (result: { messageId: string; success: boolean }) => {
      if (result.messageId === originalEmail.id && result.success) {
        toast.success(`${replyType === 'reply' ? 'Reply' : 'Reply All'} sent successfully`);
        router.back();
      }
    };

    const handleReplyAllSuccess = (result: { messageId: string; success: boolean }) => {
      if (result.messageId === originalEmail.id && result.success) {
        toast.success(`${replyType === 'reply' ? 'Reply' : 'Reply All'} sent successfully`);
        router.back();
      }
    };

    const handleError = (error: string) => {
      toast.error(`Failed to send ${replyType === 'reply' ? 'reply' : 'reply all'}: ${error}`);
      setIsSending(false);
    };

    socket.on('mail:replied', handleReplySuccess);
    socket.on('mail:repliedAll', handleReplyAllSuccess);
    socket.on('mail:error', handleError);

    return () => {
      socket.off('mail:replied', handleReplySuccess);
      socket.off('mail:repliedAll', handleReplyAllSuccess);
      socket.off('mail:error', handleError);
    };
  }, [socket, originalEmail.id, replyType, router]);

  // Initialize form data based on reply type
  useEffect(() => {
    const currentUserEmail = localStorage.getItem('activeEmail');
    if (!currentUserEmail) return;

    const fromEmails = parseEmailAddresses(originalEmail.from);
    const toEmails = originalEmail.to ? parseEmailAddresses(originalEmail.to) : [];
    const ccEmails = originalEmail.cc ? parseEmailAddresses(originalEmail.cc) : [];

    let newToEmails: EmailPill[] = [];
    const newCcEmails: EmailPill[] = [];

    if (replyType === 'reply') {
      // Reply: Send to the original sender only
      if (fromEmails.length > 0) {
        newToEmails = [{ id: Math.random().toString(), email: fromEmails[0].email }];
      }
    } else if (replyType === 'replyAll') {
      // Reply All: Send to original sender + all original recipients (except current user)
      if (fromEmails.length > 0) {
        newToEmails = [{ id: Math.random().toString(), email: fromEmails[0].email }];
      }

      // Add original 'to' recipients (excluding current user)
      toEmails.forEach(email => {
        if (email.email !== currentUserEmail) {
          newToEmails.push({ id: Math.random().toString(), email: email.email });
        }
      });

      // Add original 'cc' recipients (excluding current user)
      ccEmails.forEach(email => {
        if (email.email !== currentUserEmail) {
          newCcEmails.push({ id: Math.random().toString(), email: email.email });
        }
      });
    }

    // Set subject with Re: prefix
    const subject = originalEmail.subject.startsWith('Re:') 
      ? originalEmail.subject 
      : `Re: ${originalEmail.subject}`;

    setFormData(prev => ({
      ...prev,
      toEmails: newToEmails,
      ccEmails: newCcEmails,
      subject,
      body: '' // Start with empty body, original message is displayed separately
    }));

    // Show CC field if there are CC recipients
    if (newCcEmails.length > 0) {
      setShowCc(true);
    }
  }, [originalEmail, replyType]);

  const handleEmailInput = (
    value: string,
    field: 'toInput' | 'ccInput' | 'bccInput',
    emailField: 'toEmails' | 'ccEmails' | 'bccEmails'
  ) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    if (value.endsWith(',') || value.endsWith(' ')) {
      const email = value.slice(0, -1).trim();
      if (email && isValidEmail(email)) {
        setFormData(prev => ({
          ...prev,
          [emailField]: [...prev[emailField], { id: Math.random().toString(), email }],
          [field]: ''
        }));
      } else if (email) {
        toast.error('Please enter a valid email address');
      }
    }
  };

  const handleKeyDown = (
    e: KeyboardEvent<HTMLInputElement>,
    value: string,
    field: 'toInput' | 'ccInput' | 'bccInput',
    emailField: 'toEmails' | 'ccEmails' | 'bccEmails'
  ) => {
    if (e.key === 'Enter' && value.trim()) {
      e.preventDefault();
      if (isValidEmail(value.trim())) {
        setFormData(prev => ({
          ...prev,
          [emailField]: [...prev[emailField], { id: Math.random().toString(), email: value.trim() }],
          [field]: ''
        }));
      } else {
        toast.error('Please enter a valid email address');
      }
    }
  };

  const removeEmail = (id: string, emailField: 'toEmails' | 'ccEmails' | 'bccEmails') => {
    setFormData(prev => ({
      ...prev,
      [emailField]: prev[emailField].filter(email => email.id !== id)
    }));
  };

  const handleSend = async () => {
    if (formData.toEmails.length === 0 || !formData.subject || !formData.body) {
      toast.error('Please fill in all required fields');
      return;
    }

    setIsSending(true);
    try {
      const appUserId = localStorage.getItem('appUserId');
      const activeEmail = localStorage.getItem('activeEmail');

      if (!appUserId || !activeEmail) {
        throw new Error('User not authenticated');
      }

      // Prepare recipients in the format expected by the API
      const toRecipients = formData.toEmails.map(email => ({
        emailAddress: { address: email.email }
      }));
      
      const ccRecipients = formData.ccEmails.length > 0 ? formData.ccEmails.map(email => ({
        emailAddress: { address: email.email }
      })) : undefined;
      
      const bccRecipients = formData.bccEmails.length > 0 ? formData.bccEmails.map(email => ({
        emailAddress: { address: email.email }
      })) : undefined;

      // Use reply or reply all based on the reply type
      if (replyType === 'reply') {
        emitMailEvent.replyEmail({
          appUserId,
          email: activeEmail,
          messageId: originalEmail.id,
          comment: formData.body,
          toRecipients,
          ccRecipients,
          bccRecipients
        });
      } else {
        emitMailEvent.replyAllEmail({
          appUserId,
          email: activeEmail,
          messageId: originalEmail.id,
          comment: formData.body,
          toRecipients,
          ccRecipients,
          bccRecipients
        });
      }

      // Success and navigation will be handled by socket events
    } catch (error) {
      toast.error(`Failed to send ${replyType === 'reply' ? 'reply' : 'reply all'}`);
      console.error('Error sending reply:', error);
      setIsSending(false);
    }
  };

  const handleAttachment = (event: ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files) return;

    const newAttachments: Attachment[] = Array.from(files).map(file => ({
      id: Math.random().toString(36).substr(2, 9),
      name: file.name,
      size: file.size,
      type: file.type
    }));

    setFormData(prev => ({
      ...prev,
      attachments: [...prev.attachments, ...newAttachments]
    }));
  };

  const removeAttachment = (id: string) => {
    setFormData(prev => ({
      ...prev,
      attachments: prev.attachments.filter(attachment => attachment.id !== id)
    }));
  };

  const handleAIGenerated = (content: string, subject?: string) => {
    setFormData(prev => ({
      ...prev,
      body: content
    }));
    toast.success('AI-generated content applied to your reply!');
  };

  const handleAIImproved = (content: string) => {
    setFormData(prev => ({
      ...prev,
      body: content
    }));
    toast.success('AI-improved content applied to your reply!');
  };

  const EmailPillList = ({ emails, onRemove }: { emails: EmailPill[], onRemove: (id: string) => void }) => (
    <div className="flex flex-wrap gap-2 mt-2">
      {emails.map(({ id, email }) => (
        <div
          key={id}
          className="flex items-center gap-1 bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded-full text-sm"
        >
          <span>{email}</span>
          <button
            onClick={() => onRemove(id)}
            className="hover:text-red-500"
          >
            <X className="w-3 h-3" />
          </button>
        </div>
      ))}
    </div>
  );

  return (
    <div className="flex-1 h-full flex flex-col bg-white dark:bg-gray-800">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.back()}
          className="flex items-center gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Email
        </Button>
        <h2 className="text-lg font-semibold">
          {replyType === 'reply' ? 'Reply' : 'Reply All'}
        </h2>
      </div>

      {/* Compose Form */}
      <div className="flex-1 overflow-auto p-6">
        <div className="space-y-4 w-full">
          {/* To field */}
          <div className="space-y-2">
            <Label htmlFor="to" className="text-sm font-medium">To</Label>
            <div className="space-y-2">
              <Input
                id="to"
                value={formData.toInput}
                onChange={(e) => handleEmailInput(
                  e.target.value,
                  'toInput',
                  'toEmails'
                )}
                onKeyDown={(e) => handleKeyDown(
                  e,
                  formData.toInput,
                  'toInput',
                  'toEmails'
                )}
                placeholder="recipient@example.com"
                className="w-full"
              />
              <EmailPillList
                emails={formData.toEmails}
                onRemove={(id) => removeEmail(id, 'toEmails')}
              />
            </div>
          </div>

          {/* CC field */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="cc" className="text-sm font-medium">Cc</Label>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowCc(!showCc)}
                className="text-sm"
              >
                {showCc ? 'Hide' : 'Show'} Cc
              </Button>
            </div>
            {showCc && (
              <div className="space-y-2">
                <Input
                  id="cc"
                  value={formData.ccInput}
                  onChange={(e) => handleEmailInput(
                    e.target.value,
                    'ccInput',
                    'ccEmails'
                  )}
                  onKeyDown={(e) => handleKeyDown(
                    e,
                    formData.ccInput,
                    'ccInput',
                    'ccEmails'
                  )}
                  placeholder="cc@example.com"
                  className="w-full"
                />
                <EmailPillList
                  emails={formData.ccEmails}
                  onRemove={(id) => removeEmail(id, 'ccEmails')}
                />
              </div>
            )}
          </div>

          {/* BCC field */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="bcc" className="text-sm font-medium">Bcc</Label>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowBcc(!showBcc)}
                className="text-sm"
              >
                {showBcc ? 'Hide' : 'Show'} Bcc
              </Button>
            </div>
            {showBcc && (
              <div className="space-y-2">
                <Input
                  id="bcc"
                  value={formData.bccInput}
                  onChange={(e) => handleEmailInput(
                    e.target.value,
                    'bccInput',
                    'bccEmails'
                  )}
                  onKeyDown={(e) => handleKeyDown(
                    e,
                    formData.bccInput,
                    'bccInput',
                    'bccEmails'
                  )}
                  placeholder="bcc@example.com"
                  className="w-full"
                />
                <EmailPillList
                  emails={formData.bccEmails}
                  onRemove={(id) => removeEmail(id, 'bccEmails')}
                />
              </div>
            )}
          </div>

          {/* Subject field */}
          <div className="space-y-2">
            <Label htmlFor="subject" className="text-sm font-medium">Subject</Label>
            <Input
              id="subject"
              value={formData.subject}
              onChange={(e) => setFormData(prev => ({ ...prev, subject: e.target.value }))}
              placeholder="Enter subject"
              required
              className="w-full"
            />
          </div>

          {/* Body field */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="body" className="text-sm font-medium">Message</Label>
              <div className="flex gap-2">
                <AIGenerationModal
                  type="reply"
                  originalEmail={originalEmail}
                  replyType={replyType}
                  onGenerated={handleAIGenerated}
                  trigger={
                    <Button variant="outline" size="sm" className="gap-2">
                      <Sparkles className="w-4 h-4" />
                      AI Reply
                    </Button>
                  }
                />
                {formData.body.trim() && (
                  <AIGenerationModal
                    type="improve"
                    currentContent={formData.body}
                    onGenerated={handleAIImproved}
                    trigger={
                      <Button variant="outline" size="sm" className="gap-2">
                        <Sparkles className="w-4 h-4" />
                        AI Improve
                      </Button>
                    }
                  />
                )}
              </div>
            </div>
            <Textarea
              id="body"
              value={formData.body}
              onChange={(e) => setFormData(prev => ({ ...prev, body: e.target.value }))}
              placeholder="Write your reply here..."
              className="min-h-[300px] w-full"
              required
            />
            
            {/* Original Message Display */}
            {originalEmail.content && (
              <div className="mt-4 border-t pt-4">
                <div className="bg-muted/50 rounded-lg p-4 border">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-sm font-semibold text-muted-foreground">Original Message</h4>
                    <div className="text-xs text-muted-foreground">
                      {new Date(originalEmail.timestamp).toLocaleString()}
                    </div>
                  </div>
                  
                  <div className="space-y-2 text-sm text-muted-foreground mb-3">
                    <div><strong>From:</strong> {originalEmail.from}</div>
                    {originalEmail.to && <div><strong>To:</strong> {originalEmail.to}</div>}
                    {originalEmail.cc && <div><strong>Cc:</strong> {originalEmail.cc}</div>}
                    <div><strong>Subject:</strong> {originalEmail.subject}</div>
                  </div>
                  
                  <div 
                    className="email-content text-sm border-t pt-3 mt-3"
                    dangerouslySetInnerHTML={{ __html: originalEmail.content }}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Attachments */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Attachments</Label>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => document.getElementById('attachment-input')?.click()}
                className="text-sm"
              >
                <Paperclip className="w-4 h-4 mr-2" />
                Add Attachment
              </Button>
              <input
                id="attachment-input"
                type="file"
                multiple
                className="hidden"
                onChange={handleAttachment}
              />
            </div>
            {formData.attachments.length > 0 && (
              <div className="mt-2 space-y-2">
                {formData.attachments.map((attachment) => (
                  <div
                    key={attachment.id}
                    className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-700 rounded"
                  >
                    <span className="text-sm truncate">{attachment.name}</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeAttachment(attachment.id)}
                      className="h-8 w-8 p-0"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Send button */}
          <div className="flex justify-end pt-4">
            <Button
              onClick={handleSend}
              disabled={isSending}
              className="w-32"
            >
              {isSending ? (
                <div className="flex items-center">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                  Sending...
                </div>
              ) : (
                <div className="flex items-center">
                  <Send className="w-4 h-4 mr-2" />
                  Send Reply
                </div>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}; 