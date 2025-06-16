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

// Helper function to get auth headers
const getAuthHeaders = () => {
  const token = localStorage.getItem('token');
  return token ? { Authorization: `Bearer ${token}` } : {};
};

export const getEmailStats = async (): Promise<EmailStats> => {
  try {
    console.log('Fetching email stats with token:', localStorage.getItem('token')?.substring(0, 10) + '...');
    const response = await axios.get(`${API_URL}/email-analytics/stats`, {
      withCredentials: true,
      headers: getAuthHeaders()
    });
    return response.data;
  } catch (error) {
    console.error('Error in getEmailStats:', error);
    throw error;
  }
};

export const getEmailAnalytics = async (): Promise<EmailAnalyticsData> => {
  try {
    console.log('Fetching email analytics with token:', localStorage.getItem('token')?.substring(0, 10) + '...');
    const response = await axios.get(`${API_URL}/email-analytics/analytics`, {
      withCredentials: true,
      headers: getAuthHeaders()
    });
    return response.data;
  } catch (error) {
    console.error('Error in getEmailAnalytics:', error);
    throw error;
  }
}; 