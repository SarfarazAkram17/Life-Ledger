import React, { createContext, useContext, useEffect, useState } from 'react';
import { api, SESSION_EXPIRED_EVENT } from '@/lib/api';

export interface User {
  id: string;
  email: string;
  displayName: string;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  register: (email: string, displayName: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  updateDisplayName: (newName: string) => Promise<{ success: boolean; error?: string }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // The session is an httpOnly cookie we cannot read, so ask the server who we are.
  useEffect(() => {
    api.get<User>('/auth/me')
      .then(({ data }) => setUser(data))
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
  }, []);

  // If the session expires while the app is open, return to the signed-out state.
  useEffect(() => {
    const onSessionExpired = () => setUser(null);
    window.addEventListener(SESSION_EXPIRED_EVENT, onSessionExpired);
    return () => window.removeEventListener(SESSION_EXPIRED_EVENT, onSessionExpired);
  }, []);

  async function login(email: string, password: string): Promise<{ success: boolean; error?: string }> {
    try {
      const { data: res } = await api.post<{ user: User }>('/auth/login', { email, password });
      setUser(res.user);
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message || 'Login failed' };
    }
  }

  async function register(email: string, displayName: string, password: string): Promise<{ success: boolean; error?: string }> {
    try {
      const { data: res } = await api.post<{ user: User }>('/auth/register', { email, displayName, password });
      setUser(res.user);
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message || 'Registration failed' };
    }
  }

  function logout() {
    setUser(null);
    // Ask the server to clear the session cookie (the page cannot do it itself).
    void api.post('/auth/logout').catch(() => {});
  }

  async function updateDisplayName(newName: string): Promise<{ success: boolean; error?: string }> {
    try {
      const { data: updated } = await api.put<User>('/auth/display-name', { displayName: newName });
      setUser(updated);
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message || 'Update failed' };
    }
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, updateDisplayName }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
