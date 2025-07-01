import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export interface EmailStats {
  total: number;
  read: number;
  important: number;
  flagged: number;
}

export interface AnalyticsItem {
  name: string;
  value: number;
  unreadCount?: number;
  total?: number;
}

export interface EmailAnalyticsData {
  volumeOverTime: Array<{
    date: string;
    count: number;
  }>;
  categories: AnalyticsItem[];
  sentiment: AnalyticsItem[];
  priority: AnalyticsItem[];
  enrichedCount?: number;
}

export const getEmailStats = async (folderId?: string): Promise<EmailStats> => {
  try {
    const appUserId = localStorage.getItem('appUserId');
    const activeEmail = localStorage.getItem('activeEmail');
    if (!appUserId || !activeEmail) {
      throw new Error('appUserId or activeEmail not found');
    }

    // Use provided folderId or fallback to 'Inbox'
    const actualFolderId = folderId || 'Inbox';
    console.log('📊 API: Using folderId for stats:', actualFolderId);

    const params: { appUserId: string; email: string; folderId: string } = { 
      appUserId, 
      email: activeEmail, 
      folderId: actualFolderId 
    };

    const response = await axios.get(`${API_URL}/email-analytics/stats`, {
      params,
      withCredentials: true
    });
    return response.data;
  } catch (error) {
    console.error('Error in getEmailStats:', error);
    throw error;
  }
};

export const getEmailAnalytics = async (folderId?: string): Promise<EmailAnalyticsData> => {
  try {
    const appUserId = localStorage.getItem('appUserId');
    const activeEmail = localStorage.getItem('activeEmail');
    if (!appUserId || !activeEmail) {
      throw new Error('appUserId or activeEmail not found');
    }

    // Use provided folderId or fallback to 'Inbox'
    const actualFolderId = folderId || 'Inbox';
    console.log('📊 API: Using folderId for analytics:', actualFolderId);

    const params: { appUserId: string; email: string; folderId: string } = { 
      appUserId, 
      email: activeEmail, 
      folderId: actualFolderId 
    };

    const response = await axios.get(`${API_URL}/email-analytics/analytics`, {
      params,
      withCredentials: true
    });
    return response.data;
  } catch (error) {
    console.error('Error in getEmailAnalytics:', error);
    throw error;
  }
};

export interface UnreadEmailSummary {
  id: string;
  subject: string;
  from: string;
  timestamp: string;
  aiMeta: {
    priority: string;
    category: string;
    summary: string;
  };
  important: boolean;
  flagged: boolean;
}

export interface UnreadEmailsSummaryData {
  emails: UnreadEmailSummary[];
  total: number;
  lastUpdated: string;
}

export const getUnreadEmailsSummary = async (folderId?: string, timePeriod: string = '24h'): Promise<UnreadEmailsSummaryData> => {
  try {
    const appUserId = localStorage.getItem('appUserId');
    const activeEmail = localStorage.getItem('activeEmail');
    if (!appUserId || !activeEmail) {
      throw new Error('appUserId or activeEmail not found');
    }

    // Use provided folderId or fallback to 'Inbox'
    const actualFolderId = folderId || 'Inbox';
    console.log('📊 API: Using folderId for unread summary:', actualFolderId, 'timePeriod:', timePeriod);

    const params: { appUserId: string; email: string; folderId: string; timePeriod: string } = { 
      appUserId, 
      email: activeEmail, 
      folderId: actualFolderId,
      timePeriod
    };

    const response = await axios.get(`${API_URL}/email-analytics/unread-summary`, {
      params,
      withCredentials: true
    });
    return response.data;
  } catch (error) {
    console.error('Error in getUnreadEmailsSummary:', error);
    throw error;
  }
}; 