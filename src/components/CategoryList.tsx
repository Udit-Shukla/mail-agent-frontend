'use client';

import React from 'react';
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
import { Eye, EyeOff, GripVertical } from 'lucide-react';
import { EmailCategory } from '@/lib/api/emailCategories';

interface SortableCategoryProps {
  category: EmailCategory;
  isVisible: boolean;
  onToggleVisibility: (categoryName: string) => void;
}

function SortableCategory({ category, isVisible, onToggleVisibility }: SortableCategoryProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
  } = useSortable({ id: category.name });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-2 p-2 bg-card rounded-lg border border-border"
    >
      <button
        {...attributes}
        {...listeners}
        className="p-1 hover:bg-accent rounded cursor-grab active:cursor-grabbing"
      >
        <GripVertical className="h-4 w-4 text-muted-foreground" />
      </button>
      <div
        className="flex-1 px-2 py-1 rounded"
        style={{ backgroundColor: category.color + '20' }}
      >
        {category.label}
      </div>
      <button
        onClick={() => onToggleVisibility(category.name)}
        className="p-1 hover:bg-accent rounded"
      >
        {isVisible ? (
          <Eye className="h-4 w-4 text-muted-foreground" />
        ) : (
          <EyeOff className="h-4 w-4 text-muted-foreground" />
        )}
      </button>
    </div>
  );
}

interface CategoryListProps {
  categories: EmailCategory[];
  onCategoriesChange: (categories: EmailCategory[]) => void;
  visibleCategories: string[];
  onVisibilityChange: (categoryName: string) => void;
}

export function CategoryList({
  categories,
  onCategoriesChange,
  visibleCategories,
  onVisibilityChange,
}: CategoryListProps) {
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = categories.findIndex((cat) => cat.name === active.id);
      const newIndex = categories.findIndex((cat) => cat.name === over.id);

      if (oldIndex !== -1 && newIndex !== -1) {
        const newCategories = arrayMove(categories, oldIndex, newIndex);
        onCategoriesChange(newCategories);
      }
    }
  };

  const categoryNames = categories.map((cat) => cat.name);

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
    >
      <SortableContext
        items={categoryNames}
        strategy={verticalListSortingStrategy}
      >
        <div className="space-y-2">
          {categories.map((category) => (
            <SortableCategory
              key={category.name}
              category={category}
              isVisible={visibleCategories.includes(category.name)}
              onToggleVisibility={onVisibilityChange}
            />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
} 