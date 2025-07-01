"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { type UnreadEmailSummary } from "@/lib/api/emailAnalytics"
import { useEffect, useState } from "react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { AlertCircle, Mail, Clock, Star, Flag, Inbox, ChevronDown } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { useRouter } from "next/navigation"
import { Skeleton } from "@/components/ui/skeleton"
import { formatDistanceToNow } from "date-fns"
import { useAnalytics } from "@/contexts/AnalyticsContext"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"

const priorityColors = {
  urgent: "bg-red-100 text-red-800 border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800",
  high: "bg-orange-100 text-orange-800 border-orange-200 dark:bg-orange-900/20 dark:text-orange-400 dark:border-orange-800",
  medium: "bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-900/20 dark:text-yellow-400 dark:border-yellow-800",
  low: "bg-green-100 text-green-800 border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800"
}

type TimePeriod = '24h' | '3d' | '7d';

const timePeriodOptions = [
  { value: '24h', label: 'Last 24 hours' },
  { value: '3d', label: 'Last 3 days' },
  { value: '7d', label: 'Last 7 days' },
] as const;

export function UnreadSummary() {
  const router = useRouter();
  const { unreadSummaryData, isUnreadLoading, unreadError, refetchUnreadWithPeriod } = useAnalytics();
  const [emails, setEmails] = useState<UnreadEmailSummary[]>([]);
  const [selectedPeriod, setSelectedPeriod] = useState<TimePeriod>('24h');

  // Debug logging
  useEffect(() => {
    console.log('🔍 UnreadSummary Debug:', {
      emailsCount: emails.length,
      emails: emails,
      isLoading: isUnreadLoading,
      error: unreadError,
      unreadSummaryData: unreadSummaryData,
      selectedPeriod
    });
  }, [emails, isUnreadLoading, unreadError, unreadSummaryData, selectedPeriod]);

  // Update local state when context data changes
  useEffect(() => {
    if (unreadSummaryData) {
      setEmails(unreadSummaryData.emails);
    }
  }, [unreadSummaryData]);

  const handleEmailClick = (emailId: string) => {
    router.push(`/email/${emailId}`);
  };

  const getPriorityLabel = (priority: string) => {
    return priority.charAt(0).toUpperCase() + priority.slice(1);
  };

  const handlePeriodChange = async (period: TimePeriod) => {
    setSelectedPeriod(period);
    console.log('🔄 Time period changed to:', period);
    // Fetch new data with the selected time period
    await refetchUnreadWithPeriod(period);
  };

  const getSelectedPeriodLabel = () => {
    return timePeriodOptions.find(option => option.value === selectedPeriod)?.label || 'Last 24 hours';
  };

  if (unreadError) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>{unreadError}</AlertDescription>
      </Alert>
    );
  }

  if (isUnreadLoading) {
    return (
      <Card className="h-full bg-card/50 backdrop-blur-sm border-border/50">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center">
                <Skeleton className="h-5 w-5" />
              </div>
              <div className="space-y-1">
                <Skeleton className="h-5 w-32" />
                <Skeleton className="h-4 w-24" />
              </div>
            </div>
            <Skeleton className="h-8 w-32" />
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex items-start gap-3 p-3 rounded-lg border bg-card/50">
              <Skeleton className="w-3 h-3 rounded-full mt-1" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
                <Skeleton className="h-3 w-1/4" />
              </div>
              <Skeleton className="h-6 w-16" />
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-card/50 backdrop-blur-sm border-border/50 shadow-sm h-full">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-orange-500/10 to-red-500/10 flex items-center justify-center">
              <Inbox className="h-5 w-5 text-orange-600 dark:text-orange-400" />
            </div>
            <div>
              <CardTitle className="text-lg font-semibold">Unread Summary</CardTitle>
              <p className="text-sm text-muted-foreground">Unread emails with summaries</p>
            </div>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="h-8 px-3">
                <span className="text-xs">{getSelectedPeriodLabel()}</span>
                <ChevronDown className="h-3 w-3 ml-1" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-40">
              {timePeriodOptions.map((option) => (
                <DropdownMenuItem
                  key={option.value}
                  onClick={() => handlePeriodChange(option.value as TimePeriod)}
                  className="text-xs"
                >
                  {option.label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>
      <CardContent className="space-y-4 h-[calc(100vh-16rem)] overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100 dark:scrollbar-thumb-gray-700 dark:scrollbar-track-gray-900">
        {emails.length === 0 ? (
          <div className="text-center py-12">
            <div className="h-16 w-16 rounded-full bg-green-100 dark:bg-green-900/20 flex items-center justify-center mx-auto mb-4">
              <Mail className="h-8 w-8 text-green-600 dark:text-green-400" />
            </div>
            <h3 className="text-lg font-semibold text-foreground mb-2">All caught up!</h3>
            <p className="text-sm text-muted-foreground">
              No unread emails in the {getSelectedPeriodLabel().toLowerCase()}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {emails.map((email) => (
              <div
                key={email.id}
                className="flex items-start gap-3 p-3 rounded-lg border bg-card/50 hover:bg-card/70 transition-colors cursor-pointer"
                onClick={() => handleEmailClick(email.id)}
              >
                <div className="flex-shrink-0 mt-1">
                  <div 
                    className={`w-3 h-3 rounded-full shadow-sm ${
                      email.aiMeta.priority === 'urgent' ? 'bg-red-500' :
                      email.aiMeta.priority === 'high' ? 'bg-orange-500' :
                      email.aiMeta.priority === 'medium' ? 'bg-yellow-500' :
                      'bg-green-500'
                    }`}
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <h4 className="font-medium text-sm text-foreground truncate">
                      {email.subject}
                    </h4>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      {email.important && (
                        <Star className="h-3 w-3 text-yellow-500 fill-current" />
                      )}
                      {email.flagged && (
                        <Flag className="h-3 w-3 text-red-500 fill-current" />
                      )}
                      <Badge 
                        variant="outline" 
                        className={`text-xs ${priorityColors[email.aiMeta.priority as keyof typeof priorityColors]}`}
                      >
                        {getPriorityLabel(email.aiMeta.priority)}
                      </Badge>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground mb-1 line-clamp-2">
                    {email.aiMeta.summary}
                  </p>
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span className="truncate">{email.from}</span>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <Clock className="h-3 w-3" />
                      <span>{formatDistanceToNow(new Date(email.timestamp), { addSuffix: true })}</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
} 