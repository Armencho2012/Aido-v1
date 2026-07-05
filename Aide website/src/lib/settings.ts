// Settings persistence utility
// Manages language and theme preferences with localStorage

export type Language = 'en' | 'ru' | 'hy' | 'ko';
export type Theme = 'light' | 'dark';

const SETTINGS_KEY = 'aide_user_settings';
const LANGUAGE_QUERY_PARAM = 'lang';

interface UserSettings {
  language: Language;
  theme: Theme;
}

const DEFAULT_SETTINGS: UserSettings = {
  language: 'en',
  theme: 'dark',
};

function detectBrowserLanguage(): Language {
  if (typeof navigator === 'undefined') {
    return DEFAULT_SETTINGS.language;
  }

  const candidates = [navigator.language, ...(navigator.languages || [])]
    .filter(Boolean)
    .map((lang) => lang.toLowerCase());

  if (candidates.some((lang) => lang.startsWith('ru'))) return 'ru';
  if (candidates.some((lang) => lang.startsWith('hy'))) return 'hy';
  if (candidates.some((lang) => lang.startsWith('ko'))) return 'ko';
  return 'en';
}

function detectUrlLanguage(): Language | null {
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    const params = new URLSearchParams(window.location.search);
    const lang = params.get(LANGUAGE_QUERY_PARAM)?.toLowerCase();
    if (isValidLanguage(lang)) {
      return lang;
    }
  } catch (e) {
    console.warn('Failed to read language from URL:', e);
  }

  return null;
}

export function loadSettings(): UserSettings {
  const urlLanguage = detectUrlLanguage();

  try {
    const stored = localStorage.getItem(SETTINGS_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      return {
        language: urlLanguage || (isValidLanguage(parsed.language) ? parsed.language : DEFAULT_SETTINGS.language),
        theme: isValidTheme(parsed.theme) ? parsed.theme : DEFAULT_SETTINGS.theme,
      };
    }
  } catch (e) {
    console.warn('Failed to load settings from localStorage:', e);
  }

  return {
    language: urlLanguage || detectBrowserLanguage(),
    theme: DEFAULT_SETTINGS.theme,
  };
}

export function syncLanguageQueryParam(language: Language): void {
  if (typeof window === 'undefined') {
    return;
  }

  const url = new URL(window.location.href);
  if (url.pathname !== '/') {
    return;
  }

  if (language === 'en') {
    url.searchParams.delete(LANGUAGE_QUERY_PARAM);
  } else {
    url.searchParams.set(LANGUAGE_QUERY_PARAM, language);
  }

  window.history.replaceState({}, '', `${url.pathname}${url.search}${url.hash}`);
}

export function saveSettings(settings: Partial<UserSettings>): void {
  try {
    const current = loadSettings();
    const updated = { ...current, ...settings };
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(updated));
  } catch (e) {
    console.warn('Failed to save settings to localStorage:', e);
  }
}

export function applyTheme(theme: Theme): void {
  document.documentElement.classList.toggle('dark', theme === 'dark');
}

function isValidLanguage(value: unknown): value is Language {
  return typeof value === 'string' && ['en', 'ru', 'hy', 'ko'].includes(value);
}

function isValidTheme(value: unknown): value is Theme {
  return typeof value === 'string' && ['light', 'dark'].includes(value);
}
