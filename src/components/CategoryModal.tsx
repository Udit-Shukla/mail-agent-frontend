'use client'

import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Plus, X, Eye, EyeOff } from 'lucide-react';
import { toast } from 'sonner';
import { type EmailCategory } from "@/lib/api/emailCategories"
import { useCategory } from '@/contexts/CategoryContext';

interface CategoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (categories: EmailCategory[]) => void;
}

export function CategoryModal({ isOpen, onClose, onSave }: CategoryModalProps) {
  const { categories: contextCategories, visibleCategories, toggleCategoryVisibility } = useCategory();
  const [categories, setLocalCategories] = useState<EmailCategory[]>(contextCategories);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [newCategoryLabel, setNewCategoryLabel] = useState("");
  const [newCategoryDescription, setNewCategoryDescription] = useState("");
  const [newCategoryColor, setNewCategoryColor] = useState("#8884D8");

  // Use categories from context when modal opens
  useEffect(() => {
    if (isOpen) {
      setLocalCategories(contextCategories);
    }
  }, [isOpen, contextCategories]);

  // Ensure all categories are visible by default when modal opens
  useEffect(() => {
    if (isOpen && contextCategories.length > 0) {
      const categoryNames = contextCategories.map(cat => cat.name);
      
      // Make all categories visible if none are currently visible
      if (visibleCategories.length === 0) {
        categoryNames.forEach(name => {
          if (!visibleCategories.includes(name)) {
            toggleCategoryVisibility(name);
          }
        });
      }
    }
  }, [isOpen, contextCategories, visibleCategories, toggleCategoryVisibility]);

  const handleAddCategory = () => {
    if (!newCategoryName.trim() || !newCategoryLabel.trim()) {
      toast.error('Please enter both a category name and label');
      return;
    }

    const categoryExists = categories.some(
      (cat) => cat.name.toLowerCase() === newCategoryName.toLowerCase()
    );

    if (categoryExists) {
      toast.error('A category with this name already exists');
      return;
    }

    const newCategory: EmailCategory = {
      name: newCategoryName.trim(),
      label: newCategoryLabel.trim(),
      description: newCategoryDescription.trim() || 'No description provided',
      color: newCategoryColor,
      createdAt: new Date().toISOString(),
    };

    setLocalCategories([...categories, newCategory]);
    setNewCategoryName("");
    setNewCategoryLabel("");
    setNewCategoryDescription("");
    setNewCategoryColor("#8884D8");
  };

  const handleRemoveCategory = (index: number) => {
    if (categories.length <= 1) {
      toast.error('You must have at least one category');
      return;
    }
    setLocalCategories(categories.filter((_, i) => i !== index));
  };

  const handleSave = () => {
    if (categories.length === 0) {
      toast.error('You must have at least one category');
      return;
    }
    onSave(categories);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[800px] max-h-[95vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold">Manage Categories</DialogTitle>
          <DialogDescription className="text-base">
            Add or remove categories for organizing your emails. Each category will be used by AI to classify your emails.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-6 py-2 overflow-y-auto max-h-[calc(90vh-200px)]">
          <div className="grid gap-4">
            <Label htmlFor="category-name" className="text-base">Add New Category</Label>
            <div className="flex flex-col gap-3">
              <div className="flex flex-row gap-3 justify-between">
                <div className="w-full">
                  <Label htmlFor="category-name" className="text-sm mb-2  ">Name (Internal)</Label>
                  <Input
                    id="category-name"
                    value={newCategoryName}
                    onChange={(e) => setNewCategoryName(e.target.value)}
                    placeholder="e.g., urgent_high_priority"
                    className="h-11 text-base"
                  />
                </div>
                <div className="w-full">
                  <Label htmlFor="category-label" className="text-sm mb-2">Label (Display)</Label>
                  <Input
                    id="category-label"
                    value={newCategoryLabel}
                    onChange={(e) => setNewCategoryLabel(e.target.value)}
                    placeholder="e.g., 🚨 Urgent & High-Priority"
                    className="h-11 text-base"
                  />
                </div>
                <div className="gap-3 flex flex-row items-end">
                <div>
                  <Label htmlFor="category-color" className="text-sm mb-2">Color</Label>
                  <Input
                    id="category-color"
                    type="color"
                    value={newCategoryColor}
                    onChange={(e) => setNewCategoryColor(e.target.value)}
                    className="w-16 h-11 p-1"
                  />
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={handleAddCategory}
                  className="h-11 w-11"
                >
                  <Plus className="h-5 w-5" />
                </Button>
              </div>
              </div>
              <div>
                <Label htmlFor="category-description" className="text-sm mb-2">Description</Label>
                <Textarea
                  id="category-description"
                  value={newCategoryDescription}
                  onChange={(e) => setNewCategoryDescription(e.target.value)}
                  placeholder="Describe what types of emails belong to this category..."
                  className="min-h-[80px] text-base"
                />
              </div>
              
            </div>
          </div>
          <div className="grid gap-4">
            <Label className="text-base mb-2">Existing Categories</Label>
            <div className="grid grid-cols-1 gap-3 max-h-[400px] overflow-y-auto p-1">
              {categories.map((category, index) => (
                <div
                  key={index}
                  className="flex items-center gap-3 p-4 rounded-lg border bg-card hover:bg-accent/50 transition-all duration-200"
                >
                  <div
                    className="w-5 h-5 rounded-full flex-shrink-0"
                    style={{ backgroundColor: category.color }}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-base">{category.label}</div>
                    <div className="text-sm text-muted-foreground truncate">{category.description}</div>
              
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => toggleCategoryVisibility(category.name)}
                    className="h-8 w-8 hover:bg-accent flex-shrink-0"
                    title={visibleCategories.includes(category.name) ? "Hide category" : "Show category"}
                  >
                    {visibleCategories.includes(category.name) ? (
                      <Eye className="h-4 w-4" />
                    ) : (
                      <EyeOff className="h-4 w-4" />
                    )}
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => handleRemoveCategory(index)}
                    className="h-8 w-8 hover:bg-destructive/10 text-destructive flex-shrink-0"
                    title="Remove category"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        </div>
        <div className="flex justify-end gap-3 pt-4 border-t">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSave}>
            Save Changes
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
} 