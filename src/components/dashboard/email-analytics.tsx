"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { getEmailAnalytics, type EmailAnalyticsData } from "@/lib/api/emailAnalytics"
import { useEffect, useState } from "react"
import { Skeleton } from "@/components/ui/skeleton"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { AlertCircle } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { useRouter } from "next/navigation"

const COLORS = {
  categories: ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#8884D8", "#82CA9D", "#FFC658", "#FF6B6B", "#4ECDC4", "#45B7D1"],
  sentiment: {
    positive: "#4CAF50",
    negative: "#F44336",
    neutral: "#9E9E9E"
  },
  priority: {
    urgent: "#F44336",
    high: "#FF9800",
    medium: "#2196F3",
    low: "#9E9E9E"
  }
}

export function EmailAnalytics() {
  const router = useRouter();
  const [data, setData] = useState<EmailAnalyticsData>({
    volumeOverTime: [],
    categories: [],
    sentiment: [],
    priority: []
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        setIsLoading(true);
        setError(null);
        console.log('Fetching email analytics...');
        const analyticsData = await getEmailAnalytics();
        console.log('Received analytics data:', analyticsData);
        
        // Calculate totals for percentages
        const categoryTotal = analyticsData.categories.reduce((sum, item) => sum + item.value, 0);
        const sentimentTotal = analyticsData.sentiment.reduce((sum, item) => sum + item.value, 0);
        const priorityTotal = analyticsData.priority.reduce((sum, item) => sum + item.value, 0);

        // Add total to each item for percentage calculation
        const enhancedData = {
          ...analyticsData,
          categories: analyticsData.categories.map(item => ({ ...item, total: categoryTotal })),
          sentiment: analyticsData.sentiment.map(item => ({ ...item, total: sentimentTotal })),
          priority: analyticsData.priority.map(item => ({ ...item, total: priorityTotal }))
        };

        setData(enhancedData);
      } catch (error) {
        console.error('Error fetching email analytics:', error);
        setError('Failed to load email analytics. Please try again later.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchAnalytics();
  }, []);

  const handleCategoryClick = (category: string) => {
    router.push(`/mail?category=${encodeURIComponent(category)}`);
  };

  const handleSentimentClick = (sentiment: string) => {
    router.push(`/mail?sentiment=${encodeURIComponent(sentiment)}`);
  };

  const handlePriorityClick = (priority: string) => {
    router.push(`/mail?priority=${encodeURIComponent(priority)}`);
  };

  if (error) {
    return (
      <Alert variant="destructive" className="col-span-7">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  if (isLoading) {
    return (
      <>
        <Card className="col-span-3">
          <CardHeader>
            <CardTitle>Email Categories</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 gap-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-14 rounded-lg" />
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="col-span-3">
          <CardHeader>
            <CardTitle>Sentiment Analysis</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 gap-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-14 rounded-lg" />
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="col-span-3">
          <CardHeader>
            <CardTitle>Priority Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 gap-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-14 rounded-lg" />
              ))}
            </div>
          </CardContent>
        </Card>
      </>
    );
  }

  return (
    <>
      <Card className="col-span-3">
        <CardHeader>
          <CardTitle>Email Categories</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-3">
            {data.categories.map((category) => (
              <button
                key={category.name}
                onClick={() => handleCategoryClick(category.name)}
                className="group flex items-center justify-between p-4 rounded-lg border bg-card hover:bg-accent/50 transition-all duration-200 text-left w-full hover:shadow-md"
              >
                <div className="flex items-center gap-3">
                  <div 
                    className="w-3 h-3 rounded-full transition-transform duration-200 group-hover:scale-110" 
                    style={{ backgroundColor: COLORS.categories[data.categories.indexOf(category) % COLORS.categories.length] }} 
                  />
                  <div className="flex flex-col">
                    <span className="font-medium text-sm">
                      {category.name === 'Other' ? 'Others/Unanalysed' : category.name}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {category.total ? ((category.value / category.total) * 100).toFixed(1) : '0'}% of total
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {category.unreadCount && category.unreadCount > 0 && (
                    <Badge variant="destructive" className="font-medium">
                      {category.unreadCount} unread
                    </Badge>
                  )}
                  <Badge variant="secondary" className="font-medium">
                    {category.value}
                  </Badge>
                </div>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="col-span-3 flex flex-col gap-4">
        <Card className="h-fit">
          <CardHeader>
            <CardTitle>Sentiment Analysis</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 gap-3">
              {data.sentiment.map((sentiment) => (
                <button
                  key={sentiment.name}
                  onClick={() => handleSentimentClick(sentiment.name)}
                  className="group flex items-center justify-between p-4 rounded-lg border bg-card hover:bg-accent/50 transition-all duration-200 text-left w-full hover:shadow-md"
                >
                  <div className="flex items-center gap-3">
                    <div 
                      className="w-3 h-3 rounded-full transition-transform duration-200 group-hover:scale-110" 
                      style={{ backgroundColor: COLORS.sentiment[sentiment.name as keyof typeof COLORS.sentiment] }} 
                    />
                    <div className="flex flex-col">
                      <span className="font-medium text-sm capitalize">{sentiment.name}</span>
                      <span className="text-xs text-muted-foreground">
                        {sentiment.total ? ((sentiment.value / sentiment.total) * 100).toFixed(1) : '0'}% of total
                      </span>
                    </div>
                  </div>
                  <Badge variant="secondary" className="ml-2 font-medium">
                    {sentiment.value}
                  </Badge>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="h-fit">
          <CardHeader>
            <CardTitle>Priority Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 gap-3">
              {data.priority.map((priority) => (
                <button
                  key={priority.name}
                  onClick={() => handlePriorityClick(priority.name)}
                  className="group flex items-center justify-between p-4 rounded-lg border bg-card hover:bg-accent/50 transition-all duration-200 text-left w-full hover:shadow-md"
                >
                  <div className="flex items-center gap-3">
                    <div 
                      className="w-3 h-3 rounded-full transition-transform duration-200 group-hover:scale-110" 
                      style={{ backgroundColor: COLORS.priority[priority.name as keyof typeof COLORS.priority] }} 
                    />
                    <div className="flex flex-col">
                      <span className="font-medium text-sm capitalize">{priority.name}</span>
                      <span className="text-xs text-muted-foreground">
                        {priority.total ? ((priority.value / priority.total) * 100).toFixed(1) : '0'}% of total
                      </span>
                    </div>
                  </div>
                  <Badge variant="secondary" className="ml-2 font-medium">
                    {priority.value}
                  </Badge>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  )
} 