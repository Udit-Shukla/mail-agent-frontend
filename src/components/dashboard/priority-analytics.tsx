"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useAnalytics } from "@/contexts/AnalyticsContext"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { AlertCircle, AlertTriangle } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { useRouter } from "next/navigation"
import { Counter } from "@/components/ui/counter"
import { Skeleton } from "@/components/ui/skeleton"
import { useEffect } from "react"

export function PriorityAnalytics() {
  const router = useRouter();
  const { analyticsData, isLoading, error } = useAnalytics();

  // Debug logging
  useEffect(() => {
    console.log('🔍 PriorityAnalytics Debug:', {
      analyticsData: analyticsData,
      isLoading,
      error
    });
    
    // Log the actual analytics data structure
    if (analyticsData) {
      console.log('📊 PriorityAnalytics - Full analytics data:', analyticsData);
      console.log('📊 PriorityAnalytics - Priority data:', analyticsData.priority);
    }
  }, [analyticsData, isLoading, error]);

  const handlePriorityClick = (priority: string) => {
    router.push(`/mail?priority=${encodeURIComponent(priority)}`);
  };

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  if (isLoading || !analyticsData) {
    return (
      <Card className="bg-card/50 backdrop-blur-sm border-border/50 shadow-sm">
        <CardHeader className="pb-4">
          <div className="flex items-center gap-3">
            <Skeleton className="h-10 w-10 rounded-lg" />
            <div className="space-y-1">
              <Skeleton className="h-5 w-32" />
              <Skeleton className="h-4 w-24" />
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-1 gap-3">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="flex items-center justify-between p-4 rounded-xl border bg-card/30">
                <div className="flex items-center gap-3">
                  <Skeleton className="w-3 h-3 rounded-full" />
                  <div className="flex flex-col gap-2">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-3 w-16" />
                  </div>
                </div>
                <Skeleton className="h-6 w-16" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-card/50 backdrop-blur-sm border-border/50 shadow-sm">
      <CardHeader className="pb-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-orange-500/10 to-red-500/10 flex items-center justify-center">
            <AlertTriangle className="h-5 w-5 text-orange-600 dark:text-orange-400" />
          </div>
          <div>
            <CardTitle className="text-lg font-semibold">Email Priority</CardTitle>
            <p className="text-sm text-muted-foreground">AI-assigned importance</p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {analyticsData.priority.map((item) => (
          <button
            key={item.name}
            onClick={() => handlePriorityClick(item.name)}
            className="group flex items-center justify-between p-4 rounded-xl border bg-card/30 hover:bg-card/60 transition-all duration-200 text-left w-full hover:shadow-md hover:scale-[1.01]"
          >
            <div className="flex items-center gap-3">
              <div 
                className={`w-3 h-3 rounded-full transition-transform duration-200 group-hover:scale-110 shadow-sm ${
                  item.name === 'urgent' ? 'bg-red-500' :
                  item.name === 'high' ? 'bg-orange-500' :
                  item.name === 'medium' ? 'bg-yellow-500' :
                  'bg-green-500'
                }`}
              />
              <div className="flex flex-col">
                <span className="font-medium text-sm capitalize">
                  {item.name}
                </span>
              </div>
            </div>
            <Badge variant="secondary" className="font-medium text-xs">
              <Counter value={item.value} />
            </Badge>
          </button>
        ))}
      </CardContent>
    </Card>
  );
} 