import { MailFolder, MailMessage } from './types';

interface CacheData {
  folders: {
    [email: string]: {
      data: MailFolder[];
      timestamp: number;
    };
  };
  messages: {
    [key: string]: {
      data: MailMessage[];
      nextLink: string | null;
      timestamp: number;
      page: number;
    };
  };
}

class MailCache {
  private static instance: MailCache;
  private cache: CacheData = {
    folders: {},
    messages: {},
  };
  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

  private constructor() {}

  static getInstance(): MailCache {
    if (!MailCache.instance) {
      MailCache.instance = new MailCache();
    }
    return MailCache.instance;
  }

  private getCurrentTimestamp(): number {
    if (typeof window === 'undefined') {
      return 0; // Return 0 during SSR
    }
    return Date.now();
  }

  private isExpired(timestamp: number): boolean {
    const currentTime = this.getCurrentTimestamp();
    return currentTime - timestamp > this.CACHE_DURATION;
  }

  // Folder cache methods
  getFolders(email: string): MailFolder[] | null {
    const cached = this.cache.folders[email];
    if (cached && !this.isExpired(cached.timestamp)) {
      return cached.data;
    }
    return null;
  }

  setFolders(email: string, folders: MailFolder[]): void {
    this.cache.folders[email] = {
      data: folders,
      timestamp: this.getCurrentTimestamp(),
    };
  }

  // Message cache methods
  getMessages(email: string, folderId: string): {
    messages: MailMessage[];
    nextLink: string | null;
    page: number;
  } | null {
    const key = this.generateMessageKey(email, folderId);
    const cached = this.cache.messages[key];
    if (cached && !this.isExpired(cached.timestamp)) {
      return {
        messages: cached.data,
        nextLink: cached.nextLink,
        page: cached.page,
      };
    }
    return null;
  }

  setMessages(
    email: string,
    folderId: string,
    messages: MailMessage[],
    nextLink: string | null,
    page: number
  ): void {
    const key = this.generateMessageKey(email, folderId);
    this.cache.messages[key] = {
      data: messages,
      nextLink,
      timestamp: this.getCurrentTimestamp(),
      page,
    };
  }

  updateMessage(email: string, folderId: string, messageId: string, updates: Partial<MailMessage>): void {
    const key = this.generateMessageKey(email, folderId);
    const cached = this.cache.messages[key];
    if (cached) {
      cached.data = cached.data.map(msg =>
        msg.id === messageId ? { ...msg, ...updates } : msg
      );
      cached.timestamp = this.getCurrentTimestamp();
    }
  }

  appendMessages(
    email: string,
    folderId: string,
    newMessages: MailMessage[],
    nextLink: string | null,
    page: number
  ): void {
    const key = this.generateMessageKey(email, folderId);
    const cached = this.cache.messages[key];
    if (cached) {
      cached.data = [...cached.data, ...newMessages];
      cached.nextLink = nextLink;
      cached.page = page;
      cached.timestamp = this.getCurrentTimestamp();
    } else {
      this.setMessages(email, folderId, newMessages, nextLink, page);
    }
  }

  private generateMessageKey(email: string, folderId: string): string {
    return `${email}:${folderId}`;
  }

  clearCache(email?: string): void {
    if (email) {
      // Clear specific email cache
      delete this.cache.folders[email];
      Object.keys(this.cache.messages).forEach(key => {
        if (key.startsWith(`${email}:`)) {
          delete this.cache.messages[key];
        }
      });
    } else {
      // Clear all cache
      this.cache = {
        folders: {},
        messages: {},
      };
    }
  }
}

export const mailCache = MailCache.getInstance(); 