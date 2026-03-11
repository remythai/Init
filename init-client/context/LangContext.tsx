import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import fr from '@/locales/fr';
import en from '@/locales/en';
import es from '@/locales/es';

export type Lang = 'fr' | 'en' | 'es';
export type Dictionary = typeof fr;

const dictionaries: Record<Lang, Dictionary> = { fr, en, es };

interface LangContextType {
  lang: Lang;
  setLang: (lang: Lang) => void;
  t: Dictionary;
}

const LangContext = createContext<LangContextType | undefined>(undefined);

export const LangProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [lang, setLangState] = useState<Lang>('fr');
  const hasLoaded = useRef(false);

  useEffect(() => {
    if (hasLoaded.current) return;
    const load = async () => {
      try {
        const saved = await AsyncStorage.getItem('lang');
        if (saved === 'fr' || saved === 'en' || saved === 'es') {
          setLangState(saved);
        }
      } catch (e) {
        console.error('Error loading lang:', e);
      } finally {
        hasLoaded.current = true;
      }
    };
    load();
  }, []);

  const setLang = async (newLang: Lang) => {
    setLangState(newLang);
    try {
      await AsyncStorage.setItem('lang', newLang);
    } catch (e) {
      console.error('Error saving lang:', e);
    }
  };

  const contextValue = useMemo(() => ({
    lang,
    setLang,
    t: dictionaries[lang],
  }), [lang]);

  return (
    <LangContext.Provider value={contextValue}>
      {children}
    </LangContext.Provider>
  );
};

export const useLang = (): LangContextType => {
  const context = useContext(LangContext);
  if (!context) {
    throw new Error('useLang must be used within LangProvider');
  }
  return context;
};
