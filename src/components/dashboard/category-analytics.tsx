"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useCategory } from "@/contexts/CategoryContext"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { AlertCircle, FolderOpen, GripVertical, Plus } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { useRouter } from "next/navigation"
import { Counter } from "@/components/ui/counter"
import { Skeleton } from "@/components/ui/skeleton"
import { Button } from "@/components/ui/button"
import { CategoryModal } from "@/components/CategoryModal"
import { useState, useEffect } from "react"
import { useAnalytics } from "@/contexts/AnalyticsContext"
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
import { useSocket } from "@/contexts/SocketContext"
import { type EmailCategory } from "@/lib/api/emailCategories"

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

export function CategoryAnalytics() {
  const router = useRouter();
  const { categories, visibleCategories, updateCategoryOrder } = useCategory();
  const { analyticsData, isLoading, error } = useAnalytics();
  const { socket, isConnected, addEventHandler, removeEventHandler } = useSocket();
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);

  // Debug logging
  useEffect(() => {
    console.log('🔍 CategoryAnalytics Debug:', {
      categoriesCount: categories.length,
      categories: categories,
      visibleCategoriesCount: visibleCategories.length,
      visibleCategories: visibleCategories,
      analyticsData: analyticsData,
      isLoading,
      error
    });
    
    // Log the actual analytics data structure
    if (analyticsData) {
      console.log('📊 CategoryAnalytics - Full analytics data:', analyticsData);
      console.log('📊 CategoryAnalytics - Categories from analytics:', analyticsData.categories);
      console.log('📊 CategoryAnalytics - Categories from context:', categories);
    }
  }, [categories, visibleCategories, analyticsData, isLoading, error]);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (active.id !== over?.id) {
      const oldIndex = categories.findIndex(cat => cat.name === active.id);
      const newIndex = categories.findIndex(cat => cat.name === over?.id);

      const newCategories = arrayMove(categories, oldIndex, newIndex);
      updateCategoryOrder(newCategories);
    }
  };

  const handleCategoryClick = (categoryName: string) => {
    router.push(`/mail?category=${encodeURIComponent(categoryName)}`);
  };

  const handleSaveCategories = async (newCategories: EmailCategory[]) => {
    try {
      await updateCategoryOrder(newCategories);
      setIsCategoryModalOpen(false);
    } catch (error) {
      console.error('Error saving categories:', error);
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

  if (isLoading || !analyticsData) {
    return (
      <Card className="h-full bg-card/50 backdrop-blur-sm border-border/50 shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between pb-4">
          <div className="flex items-center gap-3">
            <Skeleton className="h-10 w-10 rounded-lg" />
            <div className="space-y-1">
              <Skeleton className="h-5 w-32" />
              <Skeleton className="h-4 w-24" />
            </div>
          </div>
          <Skeleton className="h-8 w-20" />
        </CardHeader>
        <CardContent className="space-y-4 h-[calc(100vh-16rem)] overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100 dark:scrollbar-thumb-gray-700 dark:scrollbar-track-gray-900">
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

  const categoryIds = categories
    .map((cat) => cat.name)
    .filter((id): id is string => id !== undefined);

  return (
    <>
      <Card className="h-full bg-card/50 backdrop-blur-sm border-border/50 shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between pb-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-blue-500/10 to-purple-500/10 flex items-center justify-center">
              <FolderOpen className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <CardTitle className="text-lg font-semibold">Email Categories</CardTitle>
              <p className="text-sm text-muted-foreground">Organized by AI analysis</p>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsCategoryModalOpen(true)}
            className="hover:bg-primary/5"
          >
            <Plus className="h-4 w-4 mr-2" />
            Manage
          </Button>
        </CardHeader>
        <CardContent className="space-y-4 h-[calc(100vh-16rem)] overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100 dark:scrollbar-thumb-gray-700 dark:scrollbar-track-gray-900">
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
                  .filter(category => category.name && visibleCategories.includes(category.name))
                  .map((category) => {
                    const analyticsCategory = analyticsData.categories.find(c => c.name === category.name);
                    return (
                      <SortableCard key={category.name} id={category.name || ''}>
                        <button
                          onClick={() => handleCategoryClick(category.name)}
                          className="group flex items-center justify-between p-4 rounded-xl border bg-card/30 hover:bg-card/60 transition-all duration-200 text-left w-full hover:shadow-md hover:scale-[1.01]"
                        >
                          <div className="flex items-center gap-3">
                            <div 
                              className="w-3 h-3 rounded-full transition-transform duration-200 group-hover:scale-110 shadow-sm" 
                              style={{ backgroundColor: category.color }} 
                            />
                            <div className="flex flex-col">
                              <span className="font-medium text-sm">
                                {category.label}
                              </span>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {analyticsCategory?.unreadCount && analyticsCategory.unreadCount > 0 && (
                              <Badge variant="destructive" className="font-medium text-xs">
                                <Counter value={analyticsCategory.unreadCount} className="text-white" />
                              </Badge>
                            )}
                            <Badge variant="secondary" className="font-medium text-xs">
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
        </CardContent>
      </Card>

      <CategoryModal
        isOpen={isCategoryModalOpen}
        onClose={() => setIsCategoryModalOpen(false)}
        onSave={handleSaveCategories}
      />
    </>
  );
} 