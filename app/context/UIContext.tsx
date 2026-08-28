'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { dictionary, Dict, Lang } from '../lib/dictionary';

type Theme = 'light' | 'dark';

interface UIContextType {
  theme: Theme;
  toggleTheme: () => void;
  lang: Lang;
  setLang: (lang: Lang) => void;
  toggleLang: () => void;
  t: Dict;
  mobileMenuOpen: boolean;
  setMobileMenuOpen: (open: boolean) => void;
  toggleMobileMenu: () => void;
  closeMobileMenu: () => void;
}

const UIContext = createContext<UIContextType | undefined>(undefined);

export function UIProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>('light');
  const [lang, setLang] = useState<Lang>('id');
  const [mobileMenuOpen, setMobileMenuOpen] = useState<boolean>(false);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
  }, [theme]);

  const toggleTheme = () => setTheme((t) => (t === 'light' ? 'dark' : 'light'));
  const toggleLang = () => setLang((l) => (l === 'id' ? 'en' : 'id'));
  const toggleMobileMenu = () => setMobileMenuOpen((o) => !o);
  const closeMobileMenu = () => setMobileMenuOpen(false);

  return (
    <UIContext.Provider
      value={{
        theme,
        toggleTheme,
        lang,
        setLang,
        toggleLang,
        t: dictionary[lang],
        mobileMenuOpen,
        setMobileMenuOpen,
        toggleMobileMenu,
        closeMobileMenu,
      }}
    >
      {children}
    </UIContext.Provider>
  );
}

export function useUI() {
  const context = useContext(UIContext);
  if (!context) {
    throw new Error('useUI must be used within a UIProvider');
  }
  return context;
}
