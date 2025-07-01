
export interface GenerateReplyRequest {
  originalEmail: {
    id: string;
    from: string;
    subject: string;
    content?: string;
    body?: string;
    timestamp: string;
  };
  replyType?: 'reply' | 'replyAll';
  userTone?: 'professional' | 'casual' | 'friendly' | 'formal';
  additionalContext?: string;
  maxLength?: number;
  recipientName?: string;
  senderName?: string;
}

export interface GenerateComposeRequest {
  subject?: string;
  recipient?: string;
  purpose?: string;
  userTone?: 'professional' | 'casual' | 'friendly' | 'formal';
  additionalContext?: string;
  maxLength?: number;
  recipientName?: string;
  senderName?: string;
}

export interface ImproveEmailRequest {
  currentContent: string;
  improvementType?: 'general' | 'grammar' | 'tone' | 'clarity' | 'professional';
  userTone?: 'professional' | 'casual' | 'friendly' | 'formal';
  additionalContext?: string;
  recipientName?: string;
  senderName?: string;
}

export interface GenerateReplyResponse {
  success: boolean;
  reply?: string;
  error?: string;
  usage?: {
    input_tokens: number;
    output_tokens: number;
  };
}

export interface GenerateComposeResponse {
  success: boolean;
  subject?: string;
  body?: string;
  error?: string;
  usage?: {
    input_tokens: number;
    output_tokens: number;
  };
}

export interface ImproveEmailResponse {
  success: boolean;
  improvedContent?: string;
  error?: string;
  usage?: {
    input_tokens: number;
    output_tokens: number;
  };
}

import axios from 'axios';
import { getApiUrl } from '../api';

export const aiReplyApi = {
  generateReply: async (data: GenerateReplyRequest): Promise<GenerateReplyResponse> => {
    const response = await axios.post(getApiUrl('ai-reply/generate-reply'), data, {
      withCredentials: true
    });
    return response.data;
  },

  generateComposeEmail: async (data: GenerateComposeRequest): Promise<GenerateComposeResponse> => {
    const response = await axios.post(getApiUrl('ai-reply/generate-compose'), data, {
      withCredentials: true
    });
    return response.data;
  },

  improveEmail: async (data: ImproveEmailRequest): Promise<ImproveEmailResponse> => {
    const response = await axios.post(getApiUrl('ai-reply/improve-email'), data, {
      withCredentials: true
    });
    return response.data;
  }
}; 