import { useState, useEffect } from 'react';
import { getEmailAnalytics, type EmailAnalyticsData } from '@/lib/api/emailAnalytics';

interface UseEmailAnalyticsReturn {
  data: EmailAnalyticsData | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function useEmailAnalytics(): UseEmailAnalyticsReturn {
  const [data, setData] = useState<EmailAnalyticsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentActiveEmail, setCurrentActiveEmail] = useState<string | null>(null);

  const fetchData = async () => {
    const appUserId = localStorage.getItem('appUserId');
    const activeEmail = localStorage.getItem('activeEmail');
    if (!appUserId || !activeEmail) {
      setError(null);
      setData(null);
      setIsLoading(false);
      return;
    }
    try {
      setError(null);
      setIsLoading(true);
      
      // Get the inbox folder ID from localStorage, default to 'Inbox' if not set
      let inboxFolderId = localStorage.getItem('inboxFolderId');
      if (!inboxFolderId) {
        inboxFolderId = 'Inbox';
        localStorage.setItem('inboxFolderId', inboxFolderId);
        console.log('🔄 Analytics: inboxFolderId not found, setting to default: Inbox');
      }
      
      console.log('🔄 Analytics: Fetching data with folderId:', inboxFolderId);
      
      const analyticsData = await getEmailAnalytics(inboxFolderId);
      setData(analyticsData);
    } catch (error) {
      console.error('Error fetching email analytics:', error);
      setError('Failed to load analytics data. Please try again later.');
    } finally {
      setIsLoading(false);
    }
  };

  // Watch for changes in activeEmail from localStorage
  useEffect(() => {
    const checkActiveEmail = () => {
      const activeEmail = localStorage.getItem('activeEmail');
      if (activeEmail !== currentActiveEmail) {
        console.log('🔄 Analytics: Account switched from', currentActiveEmail, 'to', activeEmail);
        setCurrentActiveEmail(activeEmail);
        // Trigger data refresh when account changes
        fetchData();
      }
    };

    // Check immediately
    checkActiveEmail();

    // Set up interval to check for changes
    const interval = setInterval(checkActiveEmail, 1000);

    return () => clearInterval(interval);
  }, [currentActiveEmail]);

  useEffect(() => {
    fetchData();

    // Add 5-minute interval refresh
    const interval = setInterval(() => {
      fetchData();
    }, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  return {
    data,
    isLoading,
    error,
    refetch: fetchData
  };
} 