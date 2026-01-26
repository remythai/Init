import React, { createContext, useState, useContext, useEffect, useRef, useMemo } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { lightTheme, darkTheme } from '../constants/theme';

type Theme = typeof lightTheme;

interface ThemeContextType {
  theme: Theme;
  isDark: boolean;
  toggleTheme: () => void;
  isLoading: boolean;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isDark, setIsDark] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const hasLoaded = useRef(false);

  useEffect(() => {
    if (hasLoaded.current) return;

    const loadTheme = async () => {
      try {
        const savedTheme = await AsyncStorage.getItem('theme');
        if (savedTheme !== null) {
          setIsDark(savedTheme === 'dark');
        }
      } catch (error) {
        console.error('Erreur lors du chargement du thème:', error);
      } finally {
        setIsLoading(false);
        hasLoaded.current = true;
      }
    };

    loadTheme();
  }, []);

  const toggleTheme = async () => {
    try {
      const newIsDark = !isDark;
      setIsDark(newIsDark);
      await AsyncStorage.setItem('theme', newIsDark ? 'dark' : 'light');
    } catch (error) {
      console.error('Erreur lors de la sauvegarde du thème:', error);
    }
  };

  const contextValue = useMemo(() => ({
    theme: isDark ? darkTheme : lightTheme,
    isDark,
    toggleTheme,
    isLoading,
  }), [isDark, isLoading]);

  return (
    <ThemeContext.Provider value={contextValue}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = (): ThemeContextType => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme doit être utilisé avec ThemeProvider');
  }
  return context;
};