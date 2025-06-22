'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { Category, updateCategories, getCategories } from '@/lib/api/categories';
import { toast } from 'sonner';

interface CategoryContextType {
  categories: Category[];
  setCategories: (categories: Category[]) => void;
  visibleCategories: string[];
  toggleCategoryVisibility: (categoryId: string) => void;
  updateCategoryOrder: (categories: Category[]) => void;
  loadCategories: () => Promise<void>;
}

const CategoryContext = createContext<CategoryContextType | undefined>(undefined);

export function CategoryProvider({ children }: { children: React.ReactNode }) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [visibleCategories, setVisibleCategories] = useState<string[]>([]);

  // Load categories from backend on mount
  useEffect(() => {
    loadCategories();
  }, []);

  // Load saved preferences from localStorage (but don't override default visibility)
  useEffect(() => {
    const savedVisibleCategories = localStorage.getItem('visibleCategories');
    if (savedVisibleCategories && visibleCategories.length === 0) {
      setVisibleCategories(JSON.parse(savedVisibleCategories));
    }
  }, [visibleCategories.length]);

  // Update visible categories when categories change (for new users)
  useEffect(() => {
    if (categories.length > 0 && visibleCategories.length === 0) {
      // If we have categories but no visible categories, make all visible
      const categoryIds = categories
        .map(cat => cat._id)
        .filter((id): id is string => id !== undefined);
      setVisibleCategories(categoryIds);
      localStorage.setItem('visibleCategories', JSON.stringify(categoryIds));
    }
  }, [categories, visibleCategories.length]);

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

  const loadCategories = async () => {
    try {
      // Check if user is authenticated before trying to load categories
      const token = localStorage.getItem('token');
      const appUserId = localStorage.getItem('appUserId');
      
      if (!token || !appUserId) {
        // User is not authenticated, don't try to load categories
        console.log('User not authenticated, skipping category load');
        return;
      }

      const fetchedCategories = await getCategories();
      setCategories(fetchedCategories);
      
      // Set all categories as visible by default
      if (fetchedCategories.length > 0) {
        const categoryIds = fetchedCategories
          .map(cat => cat._id)
          .filter((id): id is string => id !== undefined);
        setVisibleCategories(categoryIds);
        // Save to localStorage immediately
        localStorage.setItem('visibleCategories', JSON.stringify(categoryIds));
      }
    } catch (error) {
      console.error('Error loading categories:', error);
      // Don't show toast error here as it might be too early in the app lifecycle
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
        loadCategories,
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