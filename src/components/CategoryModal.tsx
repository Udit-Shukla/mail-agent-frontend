'use client'

import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Plus, X, Eye, EyeOff } from 'lucide-react';
import { toast } from 'sonner';
import { type Category } from "@/lib/api/categories"
import { useCategory } from '@/contexts/CategoryContext';

interface CategoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (categories: Category[]) => void;
  initialCategories: Category[];
}

export function CategoryModal({ isOpen, onClose, onSave, initialCategories }: CategoryModalProps) {
  const { visibleCategories, toggleCategoryVisibility } = useCategory();
  const [categories, setCategories] = useState<Category[]>(initialCategories);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [newCategoryColor, setNewCategoryColor] = useState("#8884D8");

  const handleAddCategory = () => {
    if (!newCategoryName.trim()) {
      toast.error('Please enter a category name');
      return;
    }

    const categoryExists = categories.some(
      (cat) => cat.name.toLowerCase() === newCategoryName.toLowerCase()
    );

    if (categoryExists) {
      toast.error('A category with this name already exists');
      return;
    }

    const newCategory: Category = {
      name: newCategoryName.trim(),
      color: newCategoryColor,
      createdAt: new Date(),
    };

    setCategories([...categories, newCategory]);
    setNewCategoryName("");
    setNewCategoryColor("#8884D8");
  };

  const handleRemoveCategory = (index: number) => {
    if (categories.length <= 1) {
      toast.error('You must have at least one category');
      return;
    }
    setCategories(categories.filter((_, i) => i !== index));
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
      <DialogContent className="sm:max-w-[800px]">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold">Manage Categories</DialogTitle>
          <DialogDescription className="text-base">
            Add or remove categories for organizing your emails. Each category will be used by AI to classify your emails.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-6 py-6">
          <div className="grid gap-4">
            <Label htmlFor="category-name" className="text-base">Add New Category</Label>
            <div className="flex gap-3">
              <Input
                id="category-name"
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
                placeholder="Enter category name"
                className="h-11 text-base"
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleAddCategory();
                  }
                }}
              />
              <Input
                type="color"
                value={newCategoryColor}
                onChange={(e) => setNewCategoryColor(e.target.value)}
                className="w-16 h-11 p-1"
              />
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
          <div className="grid gap-4">
            <Label className="text-base">Existing Categories</Label>
            <div className="grid grid-cols-2 gap-3 max-h-[300px] overflow-y-auto p-1">
              {categories.map((category, index) => (
                <div
                  key={index}
                  className="flex items-center gap-3 p-3 rounded-lg border bg-card hover:bg-accent/50 transition-all duration-200"
                >
                  <div
                    className="w-5 h-5 rounded-full"
                    style={{ backgroundColor: category.color }}
                  />
                  <span className="flex-1 text-base">{category.name}</span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => category._id && toggleCategoryVisibility(category._id)}
                    className="h-8 w-8 hover:bg-accent"
                    title={category._id && visibleCategories.includes(category._id) ? "Hide category" : "Show category"}
                  >
                    {category._id && visibleCategories.includes(category._id) ? (
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
                    className="h-8 w-8 hover:bg-destructive/10 hover:text-destructive"
                    title="Remove category"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        </div>
        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={onClose} className="h-11 px-6">
            Cancel
          </Button>
          <Button onClick={handleSave} className="h-11 px-6">
            Save Changes
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
} 