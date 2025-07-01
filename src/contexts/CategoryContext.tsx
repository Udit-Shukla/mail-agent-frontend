'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { EmailCategory, getEmailCategories, updateEmailCategories } from '@/lib/api/emailCategories';
import { toast } from 'sonner';

interface CategoryContextType {
  categories: EmailCategory[];
  setCategories: (categories: EmailCategory[]) => void;
  visibleCategories: string[];
  toggleCategoryVisibility: (categoryId: string) => void;
  updateCategoryOrder: (categories: EmailCategory[]) => void;
  loadCategories: () => Promise<void>;
}

const CategoryContext = createContext<CategoryContextType | undefined>(undefined);

export function CategoryProvider({ children }: { children: React.ReactNode }) {
  const [categories, setCategories] = useState<EmailCategory[]>([]);
  const [visibleCategories, setVisibleCategories] = useState<string[]>([]);
  const [currentActiveEmail, setCurrentActiveEmail] = useState<string | null>(null);

  const loadCategories = useCallback(async () => {
    try {
      console.log('🔄 loadCategories called');
      // Check if user is authenticated and has an active email
      const appUserId = localStorage.getItem('appUserId');
      const activeEmail = localStorage.getItem('activeEmail');
      
      console.log('🔍 loadCategories auth check:', { 
        hasAppUserId: !!appUserId, 
        activeEmail 
      });
      if (!appUserId || !activeEmail) {
        // User is not authenticated or no active email, don't try to load categories
        console.log('❌ User not authenticated or no active email, skipping category load');
        return;
      }

      console.log('🔄 Loading categories for email:', activeEmail);
      
      // Test the API endpoint manually
      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
      console.log('🌐 Testing API endpoint:', `${API_URL}/email-categories`);
      
      const fetchedCategories = await getEmailCategories();
      console.log('📋 Fetched categories:', fetchedCategories);
      setCategories(fetchedCategories);
      
      // Set all categories as visible by default
      if (fetchedCategories.length > 0) {
        const categoryNames = fetchedCategories.map(cat => cat.name);
        console.log('👁️ Setting visible categories:', categoryNames);
        setVisibleCategories(categoryNames);
        // Save to localStorage immediately
        localStorage.setItem('visibleCategories', JSON.stringify(categoryNames));
      } else {
        console.log('⚠️ No categories fetched, keeping existing visible categories');
      }
    } catch (error) {
      console.error('❌ Error loading categories:', error);
      // Don't show toast error here as it might be too early in the app lifecycle
    }
  }, []);

  // Watch for changes in activeEmail from localStorage
  useEffect(() => {
    const checkActiveEmail = () => {
      const activeEmail = localStorage.getItem('activeEmail');
      if (activeEmail !== currentActiveEmail) {
        setCurrentActiveEmail(activeEmail);
        // Trigger category refresh when account changes
        if (activeEmail) {
          loadCategories();
        }
      }
    };

    // Check immediately
    checkActiveEmail();

    // Set up interval to check for changes
    const interval = setInterval(checkActiveEmail, 1000);

    return () => clearInterval(interval);
  }, [currentActiveEmail, loadCategories]);

  // Load categories from backend on mount
  useEffect(() => {
    loadCategories();
  }, [loadCategories]);

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
      const categoryNames = categories.map(cat => cat.name);
      setVisibleCategories(categoryNames);
      localStorage.setItem('visibleCategories', JSON.stringify(categoryNames));
    }
  }, [categories, visibleCategories.length]);

  // Save preferences to localStorage when they change
  useEffect(() => {
    localStorage.setItem('visibleCategories', JSON.stringify(visibleCategories));
  }, [visibleCategories]);

  const toggleCategoryVisibility = (categoryName: string) => {
    setVisibleCategories((prev) => {
      if (prev.includes(categoryName)) {
        return prev.filter((name) => name !== categoryName);
      } else {
        return [...prev, categoryName];
      }
    });
  };

  const updateCategoryOrder = async (newCategories: EmailCategory[]) => {
    try {
      // Update local state immediately for responsive UI
      setCategories(newCategories);
      
      // Save to backend
      const result = await updateEmailCategories(newCategories);
      
      // Update local state with the server response to ensure consistency
      setCategories(result.categories);
      
      toast.success('Category order updated successfully');
    } catch (error) {
      console.error('Error updating category order:', error);
      toast.error('Failed to update category order');
      
      // Revert to previous state on error
      try {
        const currentCategories = await getEmailCategories();
        setCategories(currentCategories);
      } catch (revertError) {
        console.error('Error reverting categories:', revertError);
      }
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