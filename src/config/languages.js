// Language configuration for Quran translations
export const AVAILABLE_LANGUAGES = {
  english: {
    name: 'English',
    field: 'english',
    footnoteField: 'footnote',
    flag: '🇺🇸',
    direction: 'ltr'
  },
  turkish: {
    name: 'Türkçe',
    field: 'tquran',
    footnoteField: 'tquran_footnote',
    flag: '🇹🇷',
    direction: 'ltr'
  },
  tamil: {
    name: 'தமிழ்',
    field: 'tmquran',
    footnoteField: 'tmquran_footnote',
    flag: '🇮🇳',
    direction: 'ltr'
  },
  swedish: {
    name: 'Svenska',
    field: 'squran',
    footnoteField: 'squran_footnote',
    flag: '🇸🇪',
    direction: 'ltr'
  },
  russian: {
    name: 'Русский',
    field: 'rquran',
    footnoteField: 'rquran_footnote',
    flag: '🇷🇺',
    direction: 'ltr'
  },
  persian: {
    name: 'فارسی',
    field: 'pquran',
    footnoteField: 'pquran_footnote',
    flag: '🇮🇷',
    direction: 'rtl'
  },
  german: {
    name: 'Deutsch',
    field: 'gquran',
    footnoteField: 'gquran_footnote',
    flag: '🇩🇪',
    direction: 'ltr'
  },
  french: {
    name: 'Français',
    field: 'fquran',
    footnoteField: 'fquran_footnote',
    flag: '🇫🇷',
    direction: 'ltr'
  },
  bahasa: {
    name: 'Bahasa Indonesia',
    field: 'bquran',
    footnoteField: 'bquran_footnote',
    flag: '🇮🇩',
    direction: 'ltr'
  },
  malay: {
    name: 'Bahasa Melayu',
    field: 'myquran',
    footnoteField: 'myquran_footnote',
    flag: '🇲🇾',
    direction: 'ltr'
  },
  arabic: {
    name: 'العربية',
    field: 'arabic',
    footnoteField: 'footnote', // Arabic uses English footnotes
    flag: '🇸🇦',
    direction: 'rtl'
  }
};

export const DEFAULT_LANGUAGE = 'english';

// Language groups for organized display
export const LANGUAGE_GROUPS = {
  'Primary': ['english', 'arabic'],
  'European': ['german', 'french', 'swedish', 'russian'],
  'Middle Eastern': ['turkish', 'persian'],
  'South Asian': ['tamil'],
  'Southeast Asian': ['bahasa', 'malay']
};

export const getLanguageConfig = (langCode) => {
  return AVAILABLE_LANGUAGES[langCode] || AVAILABLE_LANGUAGES[DEFAULT_LANGUAGE];
};

export const getTranslationText = (verse, langCode) => {
  const config = getLanguageConfig(langCode);
  const translationText = verse[config.field];
  
  // Enhanced debug logging
  console.log(`🌐 Language: ${langCode}, Field: ${config.field}, Translation: ${translationText ? translationText.substring(0, 50) + '...' : 'NOT FOUND'}`);
  
  if (!translationText && langCode !== DEFAULT_LANGUAGE) {
    console.log(`❌ Translation not found for language ${langCode} (field: ${config.field}), falling back to ${DEFAULT_LANGUAGE}`);
    console.log(`📋 Available fields in verse:`, Object.keys(verse));
  }
  
  return translationText || verse[AVAILABLE_LANGUAGES[DEFAULT_LANGUAGE].field] || '';
};

export const getFootnoteText = (verse, langCode) => {
  const config = getLanguageConfig(langCode);
  return verse[config.footnoteField] || verse[AVAILABLE_LANGUAGES[DEFAULT_LANGUAGE].footnoteField] || '';
};