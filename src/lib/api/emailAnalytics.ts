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
}

export const getEmailStats = async (): Promise<EmailStats> => {
  try {
    const appUserId = localStorage.getItem('appUserId');
    const token = localStorage.getItem('token');
    if (!appUserId || !token) {
      throw new Error('appUserId or token not found');
    }

    const response = await axios.get(`${API_URL}/email-analytics/stats`, {
      params: { appUserId },
      headers: {
        Authorization: `Bearer ${token}`
      },
      withCredentials: true
    });
    return response.data;
  } catch (error) {
    console.error('Error in getEmailStats:', error);
    throw error;
  }
};

export const getEmailAnalytics = async (): Promise<EmailAnalyticsData> => {
  try {
    const appUserId = localStorage.getItem('appUserId');
    const token = localStorage.getItem('token');
    if (!appUserId || !token) {
      throw new Error('appUserId or token not found');
    }

    const response = await axios.get(`${API_URL}/email-analytics/analytics`, {
      params: { appUserId },
      headers: {
        Authorization: `Bearer ${token}`
      },
      withCredentials: true
    });
    return response.data;
  } catch (error) {
    console.error('Error in getEmailAnalytics:', error);
    throw error;
  }
}; 