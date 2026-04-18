import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import { useAuth } from './auth-context';
import { apiFetch } from '@/lib/api';

type Theme = 'emerald' | 'ocean' | 'violet';

interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  currency: string;
  setCurrency: (currency: string) => void;
  avatar: string | null;
  setAvatar: (avatar: string | null) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [theme, setThemeState] = useState<Theme>('emerald');
  const [currency, setCurrencyState] = useState<string>('USD');
  const [avatar, setAvatarState] = useState<string | null>(null);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const initialized = useRef(false);

  useEffect(() => {
    if (!user) {
      initialized.current = false;
      return;
    }
    apiFetch<{ theme: string; currency: string; avatar: string | null }>('/prefs')
      .then(prefs => {
        setThemeState((prefs.theme as Theme) || 'emerald');
        setCurrencyState(prefs.currency || 'USD');
        setAvatarState(prefs.avatar);
        initialized.current = true;
      })
      .catch(err => {
        console.error('Failed to load prefs:', err);
        initialized.current = true;
      });
  }, [user]);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  function savePrefs(newTheme: Theme, newCurrency: string, newAvatar: string | null) {
    if (!user || !initialized.current) return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      apiFetch('/prefs', {
        method: 'PUT',
        body: JSON.stringify({ theme: newTheme, currency: newCurrency, avatar: newAvatar }),
      }).catch(err => console.error('Failed to save prefs:', err));
    }, 500);
  }

  function setTheme(t: Theme) {
    setThemeState(t);
    savePrefs(t, currency, avatar);
  }

  function setCurrency(c: string) {
    setCurrencyState(c);
    savePrefs(theme, c, avatar);
  }

  function setAvatar(a: string | null) {
    setAvatarState(a);
    savePrefs(theme, currency, a);
  }

  return (
    <ThemeContext.Provider value={{ theme, setTheme, currency, setCurrency, avatar, setAvatar }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
}
