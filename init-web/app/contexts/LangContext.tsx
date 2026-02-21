"use client";

import { createContext, useContext, useState, ReactNode } from "react";

import fr from "../locales/fr";
import en from "../locales/en";
import es from "../locales/es";

const dictionaries = { FR: fr, EN: en, ES: es } as const;

export type Lang = keyof typeof dictionaries;
export type Dictionary = typeof fr;

interface LangContextType {
  lang: Lang;
  setLang: (lang: Lang) => void;
  t: Dictionary;
}

const LangContext = createContext<LangContextType>({
  lang: "FR",
  setLang: () => {},
  t: fr,
});

export function LangProvider({ children }: { children: ReactNode }) {
  const [lang, setLang] = useState<Lang>("FR");

  return (
    <LangContext.Provider value={{ lang, setLang, t: dictionaries[lang] }}>
      {children}
    </LangContext.Provider>
  );
}

export function useLang() {
  return useContext(LangContext);
}
