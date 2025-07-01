import axios from 'axios';

const isProduction = process.env.NODE_ENV === 'production';
const API_URL = isProduction
  ? (process.env.NEXT_PUBLIC_API_URL || 'https://mails.worxstream.io')
  : '/api';

export interface EmailCategory {
  name: string;
  label: string;
  description: string;
  color: string;
  createdAt?: string;
}

export interface EmailAccount {
  _id: string;
  userId: string;
  email: string;
  provider: 'outlook' | 'gmail';
  categories: EmailCategory[];
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

// Get categories for the active email account
export const getEmailCategories = async (): Promise<EmailCategory[]> => {
  try {
    const activeEmail = localStorage.getItem('activeEmail');
    if (!activeEmail) {
      throw new Error('Active email not found');
    }
    console.log('🔍 getEmailCategories called with:', { activeEmail });
    console.log('📡 Making API call to get email categories...');
    const response = await axios.get(`${API_URL}/email-categories`, {
      params: { email: activeEmail },
      withCredentials: true
    });
    console.log('✅ Email categories API response:', response.data);
    return response.data;
  } catch (error) {
    console.error('❌ Error fetching email categories:', error);
    throw error;
  }
};

// Update categories for the active email account
export const updateEmailCategories = async (categories: EmailCategory[]): Promise<{ message: string; categories: EmailCategory[] }> => {
  try {
    const activeEmail = localStorage.getItem('activeEmail');
    if (!activeEmail) {
      throw new Error('Active email not found');
    }
    const response = await axios.put(`${API_URL}/email-categories`, {
      email: activeEmail,
      categories
    }, {
      withCredentials: true
    });
    return response.data;
  } catch (error) {
    console.error('Error updating email categories:', error);
    throw error;
  }
};

// Add a new category to the active email account
export const addEmailCategory = async (category: EmailCategory): Promise<{ message: string; categories: EmailCategory[] }> => {
  try {
    const activeEmail = localStorage.getItem('activeEmail');
    if (!activeEmail) {
      throw new Error('Active email not found');
    }
    const response = await axios.post(`${API_URL}/email-categories/add`, {
      email: activeEmail,
      category
    }, {
      withCredentials: true
    });
    return response.data;
  } catch (error) {
    console.error('Error adding email category:', error);
    throw error;
  }
};

// Delete a category from the active email account
export const deleteEmailCategory = async (categoryName: string): Promise<{ message: string; categories: EmailCategory[] }> => {
  try {
    const activeEmail = localStorage.getItem('activeEmail');
    if (!activeEmail) {
      throw new Error('Active email not found');
    }
    const response = await axios.delete(`${API_URL}/email-categories/${categoryName}`, {
      params: { email: activeEmail },
      withCredentials: true
    });
    return response.data;
  } catch (error) {
    console.error('Error deleting email category:', error);
    throw error;
  }
};

// Get all email accounts for the current user
export const getUserEmailAccounts = async (): Promise<EmailAccount[]> => {
  try {
    const appUserId = localStorage.getItem('appUserId');
    if (!appUserId) {
      throw new Error('appUserId not found');
    }
    const response = await axios.get(`${API_URL}/email-categories/accounts/${appUserId}`, {
      withCredentials: true
    });
    return response.data;
  } catch (error) {
    console.error('Error fetching user email accounts:', error);
    throw error;
  }
}; 