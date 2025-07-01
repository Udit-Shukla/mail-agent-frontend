'use client'

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { getEmailStats, getEmailAnalytics, getUnreadEmailsSummary, type EmailAnalyticsData, type EmailStats, type UnreadEmailsSummaryData } from '@/lib/api/emailAnalytics';
import { useSocket } from './SocketContext';
import { type MailMessage } from '@/lib/types';

interface AnalyticsContextType {
  // Analytics data
  analyticsData: EmailAnalyticsData | null;
  statsData: EmailStats | null;
  unreadSummaryData: UnreadEmailsSummaryData | null;
  
  // Loading states
  isLoading: boolean;
  isStatsLoading: boolean;
  isUnreadLoading: boolean;
  
  // Error states
  error: string | null;
  statsError: string | null;
  unreadError: string | null;
  
  // Actions
  refetchAll: () => Promise<void>;
  refetchAnalytics: () => Promise<void>;
  refetchStats: () => Promise<void>;
  refetchUnread: () => Promise<void>;
  refetchUnreadWithPeriod: (timePeriod: string) => Promise<void>;
}

const AnalyticsContext = createContext<AnalyticsContextType | undefined>(undefined);

export function AnalyticsProvider({ children }: { children: React.ReactNode }) {
  const [analyticsData, setAnalyticsData] = useState<EmailAnalyticsData | null>(null);
  const [statsData, setStatsData] = useState<EmailStats | null>(null);
  const [unreadSummaryData, setUnreadSummaryData] = useState<UnreadEmailsSummaryData | null>(null);
  
  const [isLoading, setIsLoading] = useState(true);
  const [isStatsLoading, setIsStatsLoading] = useState(true);
  const [isUnreadLoading, setIsUnreadLoading] = useState(true);
  
  const [error, setError] = useState<string | null>(null);
  const [statsError, setStatsError] = useState<string | null>(null);
  const [unreadError, setUnreadError] = useState<string | null>(null);
  
  const [currentActiveEmail, setCurrentActiveEmail] = useState<string | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);

  const { socket, isConnected, addEventHandler, removeEventHandler } = useSocket();

  // Get folder ID from localStorage
  const getFolderId = useCallback(() => {
    let inboxFolderId = localStorage.getItem('inboxFolderId');
    if (!inboxFolderId) {
      inboxFolderId = 'Inbox';
      localStorage.setItem('inboxFolderId', inboxFolderId);
      console.log('🔄 Analytics: inboxFolderId not found, setting to default: Inbox');
    }
    return inboxFolderId;
  }, []);

  // Fetch analytics data
  const fetchAnalytics = useCallback(async () => {
    const appUserId = localStorage.getItem('appUserId');
    const activeEmail = localStorage.getItem('activeEmail');
    if (!appUserId || !activeEmail) {
      setError(null);
      setAnalyticsData(null);
      setIsLoading(false);
      return;
    }
    try {
      setError(null);
      setIsLoading(true);
      
      const folderId = getFolderId();
      console.log('🔄 Analytics: Fetching analytics data with folderId:', folderId);
      
      const data = await getEmailAnalytics(folderId);
      setAnalyticsData(data);
    } catch (error) {
      console.error('Error fetching analytics data:', error);
      setError('Failed to load analytics data. Please try again later.');
    } finally {
      setIsLoading(false);
    }
  }, [getFolderId]);

  // Fetch stats data
  const fetchStats = useCallback(async () => {
    const appUserId = localStorage.getItem('appUserId');
    const activeEmail = localStorage.getItem('activeEmail');
    if (!appUserId || !activeEmail) {
      setStatsError(null);
      setStatsData(null);
      setIsStatsLoading(false);
      return;
    }
    try {
      setStatsError(null);
      setIsStatsLoading(true);
      
      const folderId = getFolderId();
      console.log('🔄 Analytics: Fetching stats data with folderId:', folderId);
      
      const data = await getEmailStats(folderId);
      setStatsData(data);
    } catch (error) {
      console.error('Error fetching stats data:', error);
      setStatsError('Failed to load stats data. Please try again later.');
    } finally {
      setIsStatsLoading(false);
    }
  }, [getFolderId]);

  // Fetch unread summary data
  const fetchUnreadSummary = useCallback(async (timePeriod: string = '24h') => {
    const appUserId = localStorage.getItem('appUserId');
    const activeEmail = localStorage.getItem('activeEmail');
    if (!appUserId || !activeEmail) {
      setUnreadError(null);
      setUnreadSummaryData(null);
      setIsUnreadLoading(false);
      return;
    }
    try {
      setUnreadError(null);
      setIsUnreadLoading(true);
      
      const folderId = getFolderId();
      console.log('🔄 Analytics: Fetching unread summary data with folderId:', folderId, 'timePeriod:', timePeriod);
      
      const data = await getUnreadEmailsSummary(folderId, timePeriod);
      setUnreadSummaryData(data);
    } catch (error) {
      console.error('Error fetching unread summary data:', error);
      setUnreadError('Failed to load unread summary data. Please try again later.');
    } finally {
      setIsUnreadLoading(false);
    }
  }, [getFolderId]);

  // Fetch all data in parallel
  const fetchAllData = useCallback(async () => {
    const appUserId = localStorage.getItem('appUserId');
    const activeEmail = localStorage.getItem('activeEmail');
    if (!appUserId || !activeEmail) {
      setIsLoading(false);
      setIsStatsLoading(false);
      setIsUnreadLoading(false);
      setAnalyticsData(null);
      setStatsData(null);
      setUnreadSummaryData(null);
      setError(null);
      setStatsError(null);
      setUnreadError(null);
      return;
    }

    try {
      console.log('🔄 Analytics: Fetching all data for email:', activeEmail);
      
      const folderId = getFolderId();
      
      // Fetch all data in parallel
      const [analytics, stats, unread] = await Promise.all([
        getEmailAnalytics(folderId),
        getEmailStats(folderId),
        getUnreadEmailsSummary(folderId, '24h') // Default to 24h for initial load
      ]);

      setAnalyticsData(analytics);
      setStatsData(stats);
      setUnreadSummaryData(unread);
      
      setError(null);
      setStatsError(null);
      setUnreadError(null);
      
      console.log('📊 Analytics: All data fetched successfully');
    } catch (error) {
      console.error('Error fetching all data:', error);
      setError('Failed to load data. Please try again later.');
    } finally {
      setIsLoading(false);
      setIsStatsLoading(false);
      setIsUnreadLoading(false);
    }
  }, [getFolderId]);

  // Watch for changes in activeEmail from localStorage
  useEffect(() => {
    const checkActiveEmail = () => {
      const activeEmail = localStorage.getItem('activeEmail');
      if (activeEmail !== currentActiveEmail) {
        console.log('🔄 Analytics: Account switched from', currentActiveEmail, 'to', activeEmail);
        setCurrentActiveEmail(activeEmail);
        // Trigger data refresh when account changes
        if (isInitialized) {
          fetchAllData();
        }
      }
    };

    // Check immediately
    checkActiveEmail();

    // Set up interval to check for changes
    const interval = setInterval(checkActiveEmail, 1000);

    return () => clearInterval(interval);
  }, [currentActiveEmail, isInitialized, fetchAllData]);

  // Initial data fetch
  useEffect(() => {
    const activeEmail = localStorage.getItem('activeEmail');
    if (activeEmail && !isInitialized) {
      setCurrentActiveEmail(activeEmail);
      fetchAllData();
      setIsInitialized(true);
    }
  }, [fetchAllData, isInitialized]);

  // Set up socket event listeners for real-time updates
  useEffect(() => {
    if (!socket || !isConnected) {
      console.log('🔌 Socket not connected, skipping event listener setup');
      return;
    }

    console.log('🎧 Setting up mail event listeners for analytics');

    const handleEmailRead = (data: { messageId: string }) => {
      console.log('📧 Email marked as read, refreshing analytics:', data.messageId);
      // Refresh all data when email read status changes
      fetchAllData();
    };

    const handleNewEmail = (message: MailMessage) => {
      console.log('📧 New email received, refreshing analytics:', message.id);
      // Refresh all data when new emails arrive
      fetchAllData();
    };

    // Use the proper event handler pattern
    addEventHandler('mail:markedRead', handleEmailRead);
    addEventHandler('mail:new', handleNewEmail);

    return () => {
      console.log('🧹 Cleaning up mail event listeners');
      removeEventHandler('mail:markedRead', handleEmailRead);
      removeEventHandler('mail:new', handleNewEmail);
    };
  }, [socket, isConnected, addEventHandler, removeEventHandler, fetchAllData]);

  // Periodic refresh (every 5 minutes)
  useEffect(() => {
    const interval = setInterval(() => {
      const activeEmail = localStorage.getItem('activeEmail');
      if (activeEmail && isInitialized) {
        console.log('🔄 Analytics: Periodic refresh triggered');
        fetchAllData();
      }
    }, 5 * 60 * 1000);
    
    return () => clearInterval(interval);
  }, [fetchAllData, isInitialized]);

  const value: AnalyticsContextType = {
    analyticsData,
    statsData,
    unreadSummaryData,
    isLoading,
    isStatsLoading,
    isUnreadLoading,
    error,
    statsError,
    unreadError,
    refetchAll: fetchAllData,
    refetchAnalytics: fetchAnalytics,
    refetchStats: fetchStats,
    refetchUnread: () => fetchUnreadSummary('24h'),
    refetchUnreadWithPeriod: fetchUnreadSummary,
  };

  return (
    <AnalyticsContext.Provider value={value}>
      {children}
    </AnalyticsContext.Provider>
  );
}

export function useAnalytics() {
  const context = useContext(AnalyticsContext);
  if (context === undefined) {
    throw new Error('useAnalytics must be used within an AnalyticsProvider');
  }
  return context;
} 