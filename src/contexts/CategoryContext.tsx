'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { Category, updateCategories } from '@/lib/api/categories';
import { toast } from 'sonner';

interface CategoryContextType {
  categories: Category[];
  setCategories: (categories: Category[]) => void;
  visibleCategories: string[];
  toggleCategoryVisibility: (categoryId: string) => void;
  updateCategoryOrder: (categories: Category[]) => void;
}

const CategoryContext = createContext<CategoryContextType | undefined>(undefined);

export function CategoryProvider({ children }: { children: React.ReactNode }) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [visibleCategories, setVisibleCategories] = useState<string[]>([]);

  // Load saved preferences from localStorage
  useEffect(() => {
    const savedVisibleCategories = localStorage.getItem('visibleCategories');
    if (savedVisibleCategories) {
      setVisibleCategories(JSON.parse(savedVisibleCategories));
    }
  }, []);

  // Save preferences to localStorage when they change
  useEffect(() => {
    localStorage.setItem('visibleCategories', JSON.stringify(visibleCategories));
  }, [visibleCategories]);

  const toggleCategoryVisibility = (categoryId: string) => {
    setVisibleCategories((prev) => {
      if (prev.includes(categoryId)) {
        return prev.filter((id) => id !== categoryId);
      } else {
        return [...prev, categoryId];
      }
    });
  };

  const updateCategoryOrder = async (newCategories: Category[]) => {
    try {
      // Update local state immediately for responsive UI
      setCategories(newCategories);
      
      // Save to backend
      const updatedCategories = await updateCategories(newCategories);
      
      // Update local state with the server response to ensure consistency
      setCategories(updatedCategories);
      
      toast.success('Category order updated successfully');
    } catch (error) {
      console.error('Error updating category order:', error);
      toast.error('Failed to update category order');
      
      // Revert to previous state on error
      const currentCategories = await updateCategories(categories);
      setCategories(currentCategories);
    }
  };

  return (
    <CategoryContext.Provider
      value={{
        categories,
        setCategories,
        visibleCategories,
        toggleCategoryVisibility,
        updateCategoryOrder,
      }}
    >
      {children}
    </CategoryContext.Provider>
  );
}

export function useCategory() {
  const context = useContext(CategoryContext);
  if (context === undefined) {
    throw new Error('useCategory must be used within a CategoryProvider');
  }
  return context;
} 