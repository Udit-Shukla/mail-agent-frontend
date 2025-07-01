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
    const activeEmail = localStorage.getItem('activeEmail');
    
    if (!appUserId) {
      throw new Error('appUserId not found');
    }

    if (!activeEmail) {
      throw new Error('activeEmail not found');
    }

    console.log('Making request to:', getApiUrl('email-categories'));
    const response = await axios.get(getApiUrl('email-categories'), {
      params: { 
        appUserId,
        email: activeEmail
      },
      withCredentials: true
    });
    console.log('Email categories API response:', response.data);
    
    return response.data || [];
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
    const activeEmail = localStorage.getItem('activeEmail');
    
    if (!appUserId) {
      throw new Error('appUserId not found');
    }

    if (!activeEmail) {
      throw new Error('activeEmail not found');
    }

    console.log('Making request to:', getApiUrl('email-categories'));
    const response = await axios.put(getApiUrl('email-categories'), 
      { 
        categories,
        appUserId,
        email: activeEmail
      },
      {
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