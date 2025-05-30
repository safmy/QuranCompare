import React, { createContext, useContext, useState, useEffect } from 'react';
import { DEFAULT_LANGUAGE } from '../config/languages';

const LanguageContext = createContext();

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};

export const LanguageProvider = ({ children }) => {
  // Load language preference from localStorage or use default
  const [currentLanguage, setCurrentLanguage] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('quran-language') || DEFAULT_LANGUAGE;
    }
    return DEFAULT_LANGUAGE;
  });

  // Save language preference to localStorage when it changes
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('quran-language', currentLanguage);
    }
  }, [currentLanguage]);

  const changeLanguage = (newLanguage) => {
    console.log(`🔄 Language changed from ${currentLanguage} to ${newLanguage}`);
    setCurrentLanguage(newLanguage);
  };

  const value = {
    currentLanguage,
    changeLanguage
  };

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
};