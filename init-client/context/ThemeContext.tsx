import React, { createContext, useState, useContext, useEffect, useRef, useMemo } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useColorScheme } from 'react-native';
import { lightTheme, darkTheme, shared, type Theme } from '../constants/theme';

export type ThemeMode = 'light' | 'dark' | 'system';

interface ThemeContextType {
  theme: Theme;
  isDark: boolean;
  themeMode: ThemeMode;
  setThemeMode: (mode: ThemeMode) => void;
  toggleTheme: () => void;
  isLoading: boolean;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const systemColorScheme = useColorScheme();
  const [themeMode, setThemeModeState] = useState<ThemeMode>('system');
  const [isLoading, setIsLoading] = useState(true);
  const hasLoaded = useRef(false);

  useEffect(() => {
    if (hasLoaded.current) return;

    const loadTheme = async () => {
      try {
        const saved = await AsyncStorage.getItem('themeMode');
        if (saved === 'light' || saved === 'dark' || saved === 'system') {
          setThemeModeState(saved);
        } else {
          // Migration from old 'theme' key
          const oldTheme = await AsyncStorage.getItem('theme');
          if (oldTheme === 'dark') setThemeModeState('dark');
          else if (oldTheme === 'light') setThemeModeState('light');
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

  const isDark = themeMode === 'system'
    ? systemColorScheme === 'dark'
    : themeMode === 'dark';

  const setThemeMode = async (mode: ThemeMode) => {
    try {
      setThemeModeState(mode);
      await AsyncStorage.setItem('themeMode', mode);
    } catch (error) {
      console.error('Erreur lors de la sauvegarde du thème:', error);
    }
  };

  const toggleTheme = () => {
    setThemeMode(isDark ? 'light' : 'dark');
  };

  const contextValue = useMemo(() => ({
    theme: isDark ? darkTheme : lightTheme,
    isDark,
    themeMode,
    setThemeMode,
    toggleTheme,
    isLoading,
  }), [isDark, themeMode, isLoading]);

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

// Re-export shared tokens for direct import (mode-independent values)
export { shared };
