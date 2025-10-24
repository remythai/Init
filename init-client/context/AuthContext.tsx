import React, { createContext, useContext, useEffect, useState } from 'react';
import { router } from 'expo-router';
import { api } from '@/lib/api';
import { tokenStorage } from '@/lib/auth';
import type { User } from '@/lib/types';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const token = await tokenStorage.getToken();
      
      if (token) {
        const data = await api.get('/auth/me');
        setUser(data);
      }
    } catch (error) {
      console.error('Auth check failed:', error);
      await tokenStorage.removeTokens();
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (email: string, password: string) => {
    const data = await api.post('/auth/login', { email, password });
    
    await tokenStorage.setToken(data.accessToken);
    if (data.refreshToken) {
      await tokenStorage.setRefreshToken(data.refreshToken);
    }
    
    setUser(data.user);
  };

  const register = async (email: string, password: string, name: string) => {
    const data = await api.post('/auth/register', { 
      email, 
      password, 
      name 
    });
    
    await tokenStorage.setToken(data.accessToken);
    if (data.refreshToken) {
      await tokenStorage.setRefreshToken(data.refreshToken);
    }
    
    setUser(data.user);
  };

  const logout = async () => {
    try {
      await api.post('/auth/logout');
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      await tokenStorage.removeTokens();
      setUser(null);
      router.replace('/(auth)/login');
    }
  };

  const refreshUser = async () => {
    try {
      const data = await api.get('/auth/me');
      setUser(data);
    } catch (error) {
      console.error('Refresh user failed:', error);
    }
  };

  return (
    <AuthContext.Provider 
      value={{ 
        user, 
        isLoading, 
        isAuthenticated: !!user,
        login, 
        register, 
        logout,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};