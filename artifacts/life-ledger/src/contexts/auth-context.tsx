import React, { createContext, useContext, useEffect, useState } from 'react';
import { apiFetch, setToken, clearToken, getToken } from '@/lib/api';

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

  useEffect(() => {
    const token = getToken();
    if (!token) { setLoading(false); return; }
    apiFetch<User>('/auth/me')
      .then(u => setUser(u))
      .catch(() => clearToken())
      .finally(() => setLoading(false));
  }, []);

  async function login(email: string, password: string): Promise<{ success: boolean; error?: string }> {
    try {
      const res = await apiFetch<{ token: string; user: User }>('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });
      setToken(res.token);
      setUser(res.user);
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message || 'Login failed' };
    }
  }

  async function register(email: string, displayName: string, password: string): Promise<{ success: boolean; error?: string }> {
    try {
      const res = await apiFetch<{ token: string; user: User }>('/auth/register', {
        method: 'POST',
        body: JSON.stringify({ email, displayName, password }),
      });
      setToken(res.token);
      setUser(res.user);
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message || 'Registration failed' };
    }
  }

  function logout() {
    clearToken();
    setUser(null);
  }

  async function updateDisplayName(newName: string): Promise<{ success: boolean; error?: string }> {
    try {
      const updated = await apiFetch<User>('/auth/display-name', {
        method: 'PUT',
        body: JSON.stringify({ displayName: newName }),
      });
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
