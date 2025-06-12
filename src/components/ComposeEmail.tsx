'use client';

import { useState, ChangeEvent } from 'react';
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

export const ComposeEmail = () => {
  const router = useRouter();
  const [to, setTo] = useState('');
  const [cc, setCc] = useState('');
  const [bcc, setBcc] = useState('');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [isSending, setIsSending] = useState(false);
  const [showCc, setShowCc] = useState(false);
  const [showBcc, setShowBcc] = useState(false);

  const handleSend = async () => {
    if (!to || !subject || !body) {
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
        to,
        subject,
        body,
        cc: cc || undefined,
        bcc: bcc || undefined
      });

      toast.success('Email sent successfully');
      // Reset form
      setTo('');
      setCc('');
      setBcc('');
      setSubject('');
      setBody('');
      setAttachments([]);
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

    setAttachments(prev => [...prev, ...newAttachments]);
  };

  const removeAttachment = (id: string) => {
    setAttachments(prev => prev.filter(attachment => attachment.id !== id));
  };

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
            <Input
              id="to"
              value={to}
              onChange={(e: ChangeEvent<HTMLInputElement>) => setTo(e.target.value)}
              placeholder="recipient@example.com"
              required
              className="w-full"
            />
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
              <Input
                id="cc"
                value={cc}
                onChange={(e: ChangeEvent<HTMLInputElement>) => setCc(e.target.value)}
                placeholder="cc@example.com"
                className="w-full"
              />
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
              <Input
                id="bcc"
                value={bcc}
                onChange={(e: ChangeEvent<HTMLInputElement>) => setBcc(e.target.value)}
                placeholder="bcc@example.com"
                className="w-full"
              />
            )}
          </div>

          {/* Subject field */}
          <div className="space-y-2">
            <Label htmlFor="subject" className="text-sm font-medium">Subject</Label>
            <Input
              id="subject"
              value={subject}
              onChange={(e: ChangeEvent<HTMLInputElement>) => setSubject(e.target.value)}
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
              value={body}
              onChange={(e: ChangeEvent<HTMLTextAreaElement>) => setBody(e.target.value)}
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
            {attachments.length > 0 && (
              <div className="mt-2 space-y-2">
                {attachments.map((attachment) => (
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