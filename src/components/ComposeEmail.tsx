'use client';

import { useState, ChangeEvent, KeyboardEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { ArrowLeft, Paperclip, Send, X } from 'lucide-react';
import { emitMailEvent } from '@/lib/socket';
import { Textarea } from '@/components/ui/textarea';
import { useRouter } from 'next/navigation';

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

const isValidEmail = (email: string) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

export const ComposeEmail = () => {
  const router = useRouter();
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

      await emitMailEvent.sendEmail({
        appUserId,
        email: activeEmail,
        to: formData.toEmails.map(e => e.email).join(','),
        subject: formData.subject,
        body: formData.body,
        cc: formData.ccEmails.length > 0 ? formData.ccEmails.map(e => e.email).join(',') : undefined,
        bcc: formData.bccEmails.length > 0 ? formData.bccEmails.map(e => e.email).join(',') : undefined
      });

      toast.success('Email sent successfully');
      // Reset form
      setFormData({
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
      // Navigate back to the previous page
      router.back();
    } catch (error) {
      toast.error('Failed to send email');
      console.error('Error sending email:', error);
    } finally {
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
          Back to Inbox
        </Button>
        <h2 className="text-lg font-semibold">New Message</h2>
      </div>

      {/* Compose Form */}
      <div className="flex-1 overflow-auto p-6">
        <div className="space-y-4 max-w-4xl mx-auto">
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
            <Label htmlFor="body" className="text-sm font-medium">Message</Label>
            <Textarea
              id="body"
              value={formData.body}
              onChange={(e) => setFormData(prev => ({ ...prev, body: e.target.value }))}
              placeholder="Write your message here..."
              className="min-h-[300px] w-full"
              required
            />
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
                  Send
                </div>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}; 