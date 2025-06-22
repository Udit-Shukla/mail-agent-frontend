"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { getEmailAnalytics, type EmailAnalyticsData } from "@/lib/api/emailAnalytics"
import { useEffect, useState } from "react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { AlertCircle, Plus, GripVertical } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { CategoryModal } from "@/components/CategoryModal"
import { updateCategories, type Category } from "@/lib/api/categories"
import { toast } from "sonner"
import { Counter } from "@/components/ui/counter"
import { Skeleton } from "@/components/ui/skeleton"
import { useCategory } from "@/contexts/CategoryContext"
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface SortableCardProps {
  id: string;
  children: React.ReactNode;
}

function SortableCard({ id, children }: SortableCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div ref={setNodeRef} style={style} className="relative">
      <button
        {...attributes}
        {...listeners}
        className="absolute -left-2 top-1/2 -translate-y-1/2 p-1 hover:bg-accent rounded cursor-grab active:cursor-grabbing z-10"
      >
        <GripVertical className="h-4 w-4 text-muted-foreground" />
      </button>
      {children}
    </div>
  );
}

export function EmailAnalytics() {
  const router = useRouter();
  const { categories, setCategories, visibleCategories, updateCategoryOrder } = useCategory();
  const [data, setData] = useState<EmailAnalyticsData>({
    volumeOverTime: [],
    categories: [],
    sentiment: [],
    priority: []
  });
  const [error, setError] = useState<string | null>(null);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = categories.findIndex((cat) => cat._id === active.id);
      const newIndex = categories.findIndex((cat) => cat._id === over.id);

      if (oldIndex !== -1 && newIndex !== -1) {
        const newCategories = arrayMove(categories, oldIndex, newIndex);
        await updateCategoryOrder(newCategories);
      }
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        setError(null);
        setIsLoading(true);
        
        // Fetch analytics data only - categories come from CategoryContext
        const analyticsData = await getEmailAnalytics();

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
        console.error('Error fetching data:', error);
        setError('Failed to load data. Please try again later.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  const handleCategoryClick = (category: string) => {
    router.push(`/mail?category=${encodeURIComponent(category)}`);
  };

  const handlePriorityClick = (priority: string) => {
    router.push(`/mail?priority=${encodeURIComponent(priority)}`);
  };

  const handleSentimentClick = (sentiment: string) => {
    router.push(`/mail?sentiment=${encodeURIComponent(sentiment)}`);
  };

  const handleSaveCategories = async (categories: Category[]) => {
    try {
      const updatedCategories = await updateCategories(categories);
      setCategories(updatedCategories);
      toast.success('Categories updated successfully');
    } catch (error) {
      console.error('Error updating categories:', error);
      toast.error('Failed to update categories');
    }
  };

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  const renderSkeleton = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <Card className="h-full">
        <CardHeader className="flex flex-row items-center justify-between">
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-8 w-32" />
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-3">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="flex items-center justify-between p-4 rounded-lg border">
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

      <div className="flex flex-row gap-4">
        {[1, 2].map((section) => (
          <Card key={section}>
            <CardHeader>
              <Skeleton className="h-6 w-32" />
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 gap-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="flex items-center justify-between p-4 rounded-lg border">
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
        ))}
      </div>
    </div>
  );

  if (isLoading) {
    return renderSkeleton();
  }

  const categoryIds = categories
    .map((cat) => cat._id)
    .filter((id): id is string => id !== undefined);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <Card className="h-full">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Email Categories</CardTitle>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsCategoryModalOpen(true)}
          >
            <Plus className="h-4 w-4 mr-2" />
            Manage Categories
          </Button>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={categoryIds}
                strategy={verticalListSortingStrategy}
              >
                <div className="grid grid-cols-1 gap-3">
                  {categories
                    .filter(category => category._id && visibleCategories.includes(category._id))
                    .map((category) => {
                      const analyticsCategory = data.categories.find(c => c.name === category.name);
                      return (
                        <SortableCard key={category._id} id={category._id || ''}>
                          <button
                            onClick={() => handleCategoryClick(category.name)}
                            className="group flex items-center justify-between p-4 rounded-lg border bg-card hover:bg-accent/50 transition-all duration-200 text-left w-full hover:shadow-md"
                          >
                            <div className="flex items-center gap-3">
                              <div 
                                className="w-3 h-3 rounded-full transition-transform duration-200 group-hover:scale-110" 
                                style={{ backgroundColor: category.color }} 
                              />
                              <div className="flex flex-col">
                                <span className="font-medium text-sm">
                                  {category.label}
                                </span>
                                {/* <span className="text-xs text-muted-foreground">
                                  {analyticsCategory?.total ? ((analyticsCategory.value / analyticsCategory.total) * 100).toFixed(1) : '0'}% of total
                                </span> */}
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              {analyticsCategory?.unreadCount && analyticsCategory.unreadCount > 0 && (
                                <Badge variant="destructive" className="font-medium">
                                  <Counter value={analyticsCategory.unreadCount} className="text-white" />
                                </Badge>
                              )}
                              <Badge variant="secondary" className="font-medium">
                                <Counter value={analyticsCategory?.value || 0}  />
                              </Badge>
                            </div>
                          </button>
                        </SortableCard>
                      );
                    })}
                </div>
              </SortableContext>
            </DndContext>
          </div>
        </CardContent>
      </Card>

      <div className="flex flex-col gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Email Priority</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 gap-3">
              {data.priority.map((item) => (
                <button
                  key={item.name}
                  onClick={() => handlePriorityClick(item.name)}
                  className="group flex items-center justify-between p-4 rounded-lg border bg-card hover:bg-accent/50 transition-all duration-200 text-left w-full hover:shadow-md"
                >
                  <div className="flex items-center gap-3">
                    <div 
                      className={`w-3 h-3 rounded-full transition-transform duration-200 group-hover:scale-110 ${
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
                      {/* <span className="text-xs text-muted-foreground">
                        {item.total ? ((item.value / item.total) * 100).toFixed(1) : '0'}% of total
                      </span> */}
                    </div>
                  </div>
                  <Badge variant="secondary" className="font-medium">
                    <Counter value={item.value} />
                  </Badge>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Email Sentiment</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 gap-3">
              {data.sentiment.map((item) => (
                <button
                  key={item.name}
                  onClick={() => handleSentimentClick(item.name)}
                  className="group flex items-center justify-between p-4 rounded-lg border bg-card hover:bg-accent/50 transition-all duration-200 text-left w-full hover:shadow-md"
                >
                  <div className="flex items-center gap-3">
                    <div 
                      className={`w-3 h-3 rounded-full transition-transform duration-200 group-hover:scale-110 ${
                        item.name === 'positive' ? 'bg-green-500' :
                        item.name === 'negative' ? 'bg-red-500' :
                        'bg-blue-500'
                      }`}
                    />
                    <div className="flex flex-col">
                      <span className="font-medium text-sm capitalize">
                        {item.name}
                      </span>
                      {/* <span className="text-xs text-muted-foreground">
                        {item.total ? ((item.value / item.total) * 100).toFixed(1) : '0'}% of total
                      </span> */}
                    </div>
                  </div>
                  <Badge variant="secondary" className="font-medium">
                    <Counter value={item.value} />
                  </Badge>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <CategoryModal
        isOpen={isCategoryModalOpen}
        onClose={() => setIsCategoryModalOpen(false)}
        onSave={handleSaveCategories}
      />
    </div>
  );
} 