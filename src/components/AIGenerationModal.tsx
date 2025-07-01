'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { Sparkles, Loader2, Copy, Check } from 'lucide-react';
import { aiReplyApi, GenerateReplyRequest, GenerateComposeRequest, ImproveEmailRequest } from '@/lib/api/aiReply';
import { parseEmailAddresses } from '@/lib/utils';

interface AIGenerationModalProps {
  type: 'reply' | 'compose' | 'improve';
  trigger?: React.ReactNode;
  originalEmail?: {
    id: string;
    from: string;
    subject: string;
    content?: string;
    body?: string;
    timestamp: string;
  };
  currentContent?: string;
  onGenerated?: (content: string, subject?: string) => void;
  replyType?: 'reply' | 'replyAll';
  recipient?: string; // For compose emails
}

export const AIGenerationModal = ({
  type,
  trigger,
  originalEmail,
  currentContent = '',
  onGenerated,
  replyType = 'reply',
  recipient
}: AIGenerationModalProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedContent, setGeneratedContent] = useState('');
  const [generatedSubject, setGeneratedSubject] = useState('');
  const [copied, setCopied] = useState(false);
  
  // Form states
  const [userTone, setUserTone] = useState<'professional' | 'casual' | 'friendly' | 'formal'>('professional');
  const [additionalContext, setAdditionalContext] = useState('');
  const [maxLength, setMaxLength] = useState(200);
  const [purpose, setPurpose] = useState('');
  const [recipientInput, setRecipientInput] = useState('');
  const [improvementType, setImprovementType] = useState<'general' | 'grammar' | 'tone' | 'clarity' | 'professional'>('general');

  const handleGenerate = async () => {
    setIsGenerating(true);
    try {
      let response;

      // Extract names from email addresses
      const getNamesFromEmail = (emailString: string) => {
        const parsed = parseEmailAddresses(emailString);
        return parsed.length > 0 ? parsed[0].name : '';
      };

      // Get current user's name (sender)
      const currentUserEmail = localStorage.getItem('activeEmail') || '';
      const senderName = getNamesFromEmail(currentUserEmail);

      if (type === 'reply' && originalEmail) {
        // Extract recipient name from original email
        const recipientName = getNamesFromEmail(originalEmail.from);
        
        const request: GenerateReplyRequest = {
          originalEmail,
          replyType,
          userTone,
          additionalContext,
          maxLength,
          recipientName,
          senderName
        };
        response = await aiReplyApi.generateReply(request);
        if (response.success && response.reply) {
          setGeneratedContent(response.reply);
        }
      } else if (type === 'compose') {
        // Use the recipient input field if available, otherwise use the prop
        const recipientEmail = recipientInput || recipient || '';
        const recipientName = getNamesFromEmail(recipientEmail);
        
        const request: GenerateComposeRequest = {
          subject: '',
          recipient: recipientEmail,
          purpose,
          userTone,
          additionalContext,
          maxLength,
          recipientName,
          senderName
        };
        response = await aiReplyApi.generateComposeEmail(request);
        if (response.success && response.subject && response.body) {
          setGeneratedSubject(response.subject);
          setGeneratedContent(response.body);
        }
      } else if (type === 'improve') {
        // For improve, we need to extract names from the current content or use defaults
        const recipientName = ''; // Could be extracted from content if needed
        const request: ImproveEmailRequest = {
          currentContent,
          improvementType,
          userTone,
          additionalContext,
          recipientName,
          senderName
        };
        response = await aiReplyApi.improveEmail(request);
        if (response.success && response.improvedContent) {
          setGeneratedContent(response.improvedContent);
        }
      }

      if (response?.success) {
        toast.success('AI content generated successfully!');
      } else {
        toast.error('Failed to generate content');
      }
    } catch {
      toast.error('Failed to generate content. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleUseContent = () => {
    if (onGenerated) {
      onGenerated(generatedContent, generatedSubject);
    }
    setIsOpen(false);
    setGeneratedContent('');
    setGeneratedSubject('');
  };

  const handleCopy = async () => {
    const contentToCopy = type === 'compose' && generatedSubject 
      ? `Subject: ${generatedSubject}\n\n${generatedContent}`
      : generatedContent;
    
    try {
      await navigator.clipboard.writeText(contentToCopy);
      setCopied(true);
      toast.success('Content copied to clipboard!');
      setTimeout(() => setCopied(false), 2000);
    } catch (error: unknown) {
      if (error instanceof Error) {
        toast.error('Failed to copy content', { description: error.message });
      } else {
        toast.error('Failed to copy content');
      }
    }
  };

  const getModalTitle = () => {
    switch (type) {
      case 'reply':
        return `Generate AI ${replyType === 'replyAll' ? 'Reply All' : 'Reply'}`;
      case 'compose':
        return 'Generate AI Email';
      case 'improve':
        return 'Improve Email with AI';
      default:
        return 'AI Generation';
    }
  };

  const getTriggerContent = () => {
    if (trigger) return trigger;
    
    return (
      <Button variant="outline" size="sm" className="gap-2">
        <Sparkles className="w-4 h-4" />
        {type === 'reply' ? 'AI Reply' : type === 'compose' ? 'AI Compose' : 'AI Improve'}
      </Button>
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {getTriggerContent()}
      </DialogTrigger>
      <DialogContent className="!w-[95vw] !max-w-[1200px] max-h-[80vh] overflow-y-auto p-6">
        <DialogHeader className="pb-4">
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Sparkles className="w-5 h-5" />
            {getModalTitle()}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Configuration Section */}
          <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
            <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-4">Configuration</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="tone" className="text-sm font-medium">Tone</Label>
                <Select value={userTone} onValueChange={(value: 'professional' | 'casual' | 'friendly' | 'formal') => setUserTone(value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="professional">Professional</SelectItem>
                    <SelectItem value="casual">Casual</SelectItem>
                    <SelectItem value="friendly">Friendly</SelectItem>
                    <SelectItem value="formal">Formal</SelectItem>
                  </SelectContent>
                </Select>
              </div>

            {type === 'reply' && (
              <div className="space-y-2">
                <Label htmlFor="maxLength" className="text-sm font-medium">Max Length (words)</Label>
                <Input
                  id="maxLength"
                  type="number"
                  value={maxLength}
                  onChange={(e) => setMaxLength(Number(e.target.value))}
                  min={50}
                  max={500}
                />
              </div>
            )}

            {type === 'compose' && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="recipient" className="text-sm font-medium">Recipient (optional)</Label>
                  <Input
                    id="recipient"
                    value={recipientInput}
                    onChange={(e) => setRecipientInput(e.target.value)}
                    placeholder="recipient@example.com"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="purpose" className="text-sm font-medium">Purpose (optional)</Label>
                  <Input
                    id="purpose"
                    value={purpose}
                    onChange={(e) => setPurpose(e.target.value)}
                    placeholder="e.g., follow-up, inquiry, thank you"
                  />
                </div>
              </>
            )}

            {type === 'improve' && (
              <div className="space-y-2">
                <Label htmlFor="improvementType" className="text-sm font-medium">Improvement Type</Label>
                <Select value={improvementType} onValueChange={(value: 'general' | 'grammar' | 'tone' | 'clarity' | 'professional') => setImprovementType(value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="general">General</SelectItem>
                    <SelectItem value="grammar">Grammar & Spelling</SelectItem>
                    <SelectItem value="tone">Tone</SelectItem>
                    <SelectItem value="clarity">Clarity</SelectItem>
                    <SelectItem value="professional">Professional</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
            </div>
          </div>

          <div className="space-y-3">
            <Label htmlFor="context" className="text-sm font-medium">Additional Context (optional)</Label>
            <Textarea
              id="context"
              value={additionalContext}
              onChange={(e) => setAdditionalContext(e.target.value)}
              placeholder="Any additional context or specific requirements..."
              rows={3}
              className="resize-none"
            />
          </div>

          {/* Generate Button */}
          <div className="pt-2">
            <Button 
              onClick={handleGenerate} 
              disabled={isGenerating}
              className="w-full h-11 text-base font-medium"
            >
            {isGenerating ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 mr-2" />
                Generate
              </>
            )}
            </Button>
          </div>

          {/* Generated Content */}
          {generatedContent && (
            <div className="space-y-4 pt-4 border-t">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-medium">Generated Content</Label>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleCopy}
                    className="gap-2 h-8"
                  >
                    {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                    {copied ? 'Copied!' : 'Copy'}
                  </Button>
                  <Button
                    size="sm"
                    onClick={handleUseContent}
                    className="h-8"
                  >
                    Use Content
                  </Button>
                </div>
              </div>

              {type === 'compose' && generatedSubject && (
                <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border">
                  <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">Subject:</Label>
                  <p className="text-sm mt-2 text-gray-900 dark:text-gray-100">{generatedSubject}</p>
                </div>
              )}

              <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border">
                <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">Content:</Label>
                <div className="mt-2 whitespace-pre-wrap text-sm text-gray-900 dark:text-gray-100 leading-relaxed">
                  {generatedContent}
                </div>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}; 