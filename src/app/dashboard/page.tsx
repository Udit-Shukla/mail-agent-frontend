'use client'

import { CategoryAnalytics } from "@/components/dashboard/category-analytics"
import { PriorityAnalytics } from "@/components/dashboard/priority-analytics"
import { SentimentAnalytics } from "@/components/dashboard/sentiment-analytics"
import { UnreadSummary } from "@/components/dashboard/unread-summary"
import { MailLayout } from "@/components/MailLayout"
import { Card, CardContent } from "@/components/ui/card"
import { Mail, TrendingUp, Clock, AlertCircle } from "lucide-react"
import { Skeleton } from "@/components/ui/skeleton"
import { useAnalytics } from "@/contexts/AnalyticsContext"

export default function DashboardPage() {
  const { 
    analyticsData, 
    statsData, 
    unreadSummaryData, 
    isLoading, 
    isStatsLoading, 
    isUnreadLoading,
    error,
    statsError,
    unreadError
  } = useAnalytics();

  // Calculate stats from shared context data
  const stats = (() => {
    if (!analyticsData || !statsData || !unreadSummaryData) {
      return null;
    }

    // Calculate read rate
    const readRate = statsData.total > 0 ? Math.round((statsData.read / statsData.total) * 100) : 0;

    return {
      totalEmails: `${analyticsData.enrichedCount || 0} / ${statsData.total || 0}`,
      readRate,
      unread24h: unreadSummaryData.total
    };
  })();

  // Show error if any of the data sources have errors
  const hasError = error || statsError || unreadError;
  const errorMessage = error || statsError || unreadError;

  // Show loading if any data is still loading
  const isAnyLoading = isLoading || isStatsLoading || isUnreadLoading;

  const StatCard = ({ 
    title, 
    value, 
    icon: Icon, 
    gradient, 
    textColor, 
    bgColor, 
    isLoading 
  }: {
    title: string;
    value: string | number;
    icon: React.ComponentType<{ className?: string }>;
    gradient: string;
    textColor: string;
    bgColor: string;
    isLoading: boolean;
  }) => (
    <Card className={gradient}>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className={`text-sm font-medium ${textColor}`}>{title}</p>
            {isLoading ? (
              <Skeleton className="h-8 w-16 mt-1" />
            ) : (
              <p className={`text-2xl font-bold ${textColor}`}>
                {value}
              </p>
            )}
          </div>
          <div className={`h-12 w-12 rounded-lg ${bgColor} flex items-center justify-center`}>
            <Icon className={`h-6 w-6 ${textColor}`} />
          </div>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <MailLayout>
      <div className="h-full bg-gradient-to-br from-background via-background to-muted/20 overflow-auto lg:overflow-visible">
        {/* Main Content */}
        <div className="w-full max-w-[95vw] mx-auto py-4 px-4">
          {/* Quick Stats Row */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
            <StatCard
              title="Total Analysed Emails"
              value={stats?.totalEmails || 0} 
              icon={Mail}
              gradient="bg-gradient-to-br from-blue-50 to-blue-100/50 dark:from-blue-950/50 dark:to-blue-900/30 border-blue-200/50 dark:border-blue-800/50"
              textColor="text-blue-600 dark:text-blue-300"
              bgColor="bg-blue-500/10 dark:bg-blue-500/20"
              isLoading={isAnyLoading}
            />

            <StatCard
              title="Read Rate"
              value={stats?.readRate ? `${stats.readRate}%` : 0}
              icon={TrendingUp}
              gradient="bg-gradient-to-br from-green-50 to-green-100/50 dark:from-green-950/50 dark:to-green-900/30 border-green-200/50 dark:border-green-800/50"
              textColor="text-green-600 dark:text-green-300"
              bgColor="bg-green-500/10 dark:bg-green-500/20"
              isLoading={isAnyLoading}
            />

            <StatCard
              title="Unread (24h)"
              value={stats?.unread24h || 0}
              icon={Clock}
              gradient="bg-gradient-to-br from-orange-50 to-orange-100/50 dark:from-orange-950/50 dark:to-orange-900/30 border-orange-200/50 dark:border-orange-800/50"
              textColor="text-orange-600 dark:text-orange-300"
              bgColor="bg-orange-500/10 dark:bg-orange-500/20"
              isLoading={isAnyLoading}
            />
          </div>

          {/* Error Display */}
          {hasError && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <AlertCircle className="h-5 w-5 text-red-500 mr-2" />
                  <span className="text-red-700">{errorMessage}</span>
                </div>
                <button
                  onClick={() => {
                    // The context handles refetching automatically
                    window.location.reload();
                  }}
                  className="mt-2 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 text-sm"
                >
                  Retry
                </button>
              </div>
            </div>
          )}

          {/* Main Dashboard Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-6 xl:grid-cols-8 gap-4">
            {/* Categories Section */}
            <div className="lg:col-span-3">
              <CategoryAnalytics />
            </div>

            {/* Priority and Sentiment Section - Same row */}
            <div className="lg:col-span-2 space-y-8 xl:col-span-2 ">
              <PriorityAnalytics />
              <SentimentAnalytics />
            </div>

            {/* Unread Summary Section - Same row on large screens */}
            <div className="lg:col-span-1 xl:col-span-3">
              <div className="h-full overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100 dark:scrollbar-thumb-gray-700 dark:scrollbar-track-gray-900 shadow-sm">
                <UnreadSummary />
              </div>
            </div>
          </div>
        </div>
      </div>
    </MailLayout>
  )
}
