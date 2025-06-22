import axios from 'axios';
import { getApiUrl } from '../api';

export interface Category {
  _id?: string;
  name: string;
  label: string;
  description: string;
  color: string;
  createdAt?: Date;
}

export interface UserProfile {
  user: {
    email: string;
    appUserId: string;
    createdAt: string;
    updatedAt: string;
    categories: Category[];
  };
  accounts: {
    total: number;
    outlook: number;
    gmail: number;
    linkedAccounts: Array<{
      email: string;
      provider: 'outlook' | 'gmail';
      createdAt: string;
    }>;
  };
}

export const getUserProfile = async (): Promise<UserProfile> => {
  try {
    const appUserId = localStorage.getItem('appUserId');
    if (!appUserId) {
      throw new Error('appUserId not found');
    }

    const response = await axios.get(getApiUrl('user/profile'), {
      params: { appUserId },
      withCredentials: true
    });
    
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      console.error('API Error:', {
        status: error.response?.status,
        message: error.response?.data?.message || error.message,
        endpoint: error.config?.url
      });
    }
    throw error;
  }
};

export const getCategories = async (): Promise<Category[]> => {
  try {
    const appUserId = localStorage.getItem('appUserId');
    if (!appUserId) {
      throw new Error('appUserId not found');
    }

    console.log('Making request to:', getApiUrl('user/categories'));
    const response = await axios.get(getApiUrl('user/categories'), {
      params: { appUserId },
      withCredentials: true
    });
    console.log('Categories API response:', response.data);
    
    return response.data.categories || [];
  } catch (error) {
    if (axios.isAxiosError(error)) {
      console.error('API Error:', {
        status: error.response?.status,
        message: error.response?.data?.message || error.message,
        endpoint: error.config?.url
      });
    }
    throw error;
  }
};

export const updateCategories = async (categories: Category[]): Promise<Category[]> => {
  try {
    const appUserId = localStorage.getItem('appUserId');
    if (!appUserId) {
      throw new Error('appUserId not found');
    }

    console.log('Making request to:', getApiUrl('user/categories'));
    const response = await axios.put(getApiUrl('user/categories'), 
      { categories },
      {
        params: { appUserId },
        withCredentials: true
      }
    );
    return response.data.categories;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      console.error('API Error:', {
        status: error.response?.status,
        message: error.response?.data?.message || error.message,
        endpoint: error.config?.url
      });
    }
    throw error;
  }
}; 