import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import { useAuth } from './auth-context';
import { toast } from 'sonner';
import { api } from '@/lib/api';

type Theme = 'emerald' | 'ocean' | 'violet';

interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  currency: string;
  setCurrency: (currency: string) => void;
  avatar: string | null;
  setAvatar: (avatar: string | null) => void;
}

interface PrefsPayload {
  theme?: string;
  currency?: string;
  avatar?: string | null;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [theme, setThemeState] = useState<Theme>('emerald');
  const [currency, setCurrencyState] = useState<string>('USD');
  const [avatar, setAvatarState] = useState<string | null>(null);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingPrefs = useRef<PrefsPayload>({});
  const initialized = useRef(false);

  useEffect(() => {
    if (!user) {
      initialized.current = false;
      return;
    }
    api.get<PrefsPayload>('/prefs')
      .then(({ data: prefs }) => {
        setThemeState((prefs.theme as Theme) || 'emerald');
        setCurrencyState(prefs.currency || 'USD');
        setAvatarState(prefs.avatar ?? null);
        initialized.current = true;
      })
      .catch(err => {
        console.error('Failed to load prefs:', err);
        toast.error("Couldn't load your settings", {
          description: err instanceof Error ? err.message : 'Please refresh and try again.',
        });
        initialized.current = true;
      });
  }, [user]);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  // Sends whatever has changed since the last save (only the changed fields).
  function sendPrefs() {
    const payload = pendingPrefs.current;
    if (Object.keys(payload).length === 0) return;
    pendingPrefs.current = {};
    api.put('/prefs', payload).catch(err => {
      console.error('Failed to save prefs:', err);
      toast.error("Couldn't save your settings", {
        description: err instanceof Error ? err.message : 'Please try again.',
      });
    });
  }

  // Changes are batched for a moment, then saved.
  function savePrefs(patch: PrefsPayload) {
    if (!user || !initialized.current) return;
    pendingPrefs.current = { ...pendingPrefs.current, ...patch };
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      saveTimer.current = null;
      sendPrefs();
    }, 300);
  }

  // Don't lose a change made just before the tab is hidden, refreshed or closed.
  useEffect(() => {
    const flush = () => {
      if (saveTimer.current) {
        clearTimeout(saveTimer.current);
        saveTimer.current = null;
      }
      sendPrefs();
    };
    const onVisibilityChange = () => {
      if (document.visibilityState === 'hidden') flush();
    };
    document.addEventListener('visibilitychange', onVisibilityChange);
    window.addEventListener('pagehide', flush);
    return () => {
      document.removeEventListener('visibilitychange', onVisibilityChange);
      window.removeEventListener('pagehide', flush);
    };
  }, []);

  function setTheme(t: Theme) {
    setThemeState(t);
    savePrefs({ theme: t });
  }

  function setCurrency(c: string) {
    setCurrencyState(c);
    savePrefs({ currency: c });
  }

  function setAvatar(a: string | null) {
    setAvatarState(a);
    savePrefs({ avatar: a });
  }

  return (
    <ThemeContext.Provider value={{
      theme, setTheme, currency, setCurrency, avatar, setAvatar,
    }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
}
