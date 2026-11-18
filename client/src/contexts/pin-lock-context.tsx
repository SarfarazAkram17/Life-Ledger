import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { api, API_BASE_URL, PIN_REQUIRED_EVENT } from '@/lib/api';
import type { PinLength } from '@/lib/pin-types';
import {
  clearLegacyPinRecord,
  matchesLegacyPin,
  readLegacyPinRecord,
  type LegacyPinRecord,
} from '@/lib/legacy-pin-migration';

interface PinStatus {
  enabled: boolean;
  length: PinLength | null;
}

interface PinLockContextValue {
  ready: boolean;
  hasPin: boolean;
  isLocked: boolean;
  pinLength: PinLength | null;
  statusError: string;
  verifyAndUnlock: (pin: string) => Promise<boolean>;
  setPin: (pin: string, length: PinLength) => Promise<void>;
  updatePin: (currentPin: string, nextPin: string, length: PinLength) => Promise<boolean>;
  removePin: (currentPin: string) => Promise<boolean>;
  recoverWithPassword: (password: string) => Promise<{ success: boolean; error?: string }>;
}

const PinLockContext = createContext<PinLockContextValue | undefined>(undefined);
const TAB_UNLOCK_KEY = 'll_pin_unlocked_user';

function isUnlockedInThisTab(userId: string): boolean {
  try {
    return sessionStorage.getItem(TAB_UNLOCK_KEY) === userId;
  } catch {
    return false;
  }
}

function markUnlockedInThisTab(userId: string): void {
  try {
    sessionStorage.setItem(TAB_UNLOCK_KEY, userId);
  } catch {
    // If tab storage is unavailable, the in-memory unlock still works until reload.
  }
}

function clearTabUnlock(): void {
  try {
    sessionStorage.removeItem(TAB_UNLOCK_KEY);
  } catch {
    // Ignore storage cleanup failures; authentication and PIN state remain authoritative.
  }
}

export function PinLockProvider({ children }: { children: React.ReactNode }) {
  const { user, loading: authLoading } = useAuth();
  const [pinLength, setPinLength] = useState<PinLength | null>(null);
  const [legacyRecord, setLegacyRecord] = useState<LegacyPinRecord | null>(null);
  const [loadedForUserId, setLoadedForUserId] = useState<string | null>(null);
  const [unlockedForUserId, setUnlockedForUserId] = useState<string | null>(null);
  const [statusError, setStatusError] = useState('');

  useEffect(() => {
    if (!authLoading && !user) clearTabUnlock();
  }, [authLoading, user?.id]);

  useEffect(() => {
    if (!user) {
      setPinLength(null);
      setLegacyRecord(null);
      setLoadedForUserId(null);
      setUnlockedForUserId(null);
      setStatusError('');
      return;
    }

    let active = true;
    setPinLength(null);
    setLegacyRecord(null);
    setLoadedForUserId(null);
    setUnlockedForUserId(null);
    setStatusError('');

    const loadStatus = async () => {
      try {
        const { data: status } = await api.get<PinStatus>('/pin');
        if (!active) return;
        if (status.enabled) {
          clearLegacyPinRecord(user.id);
          setLegacyRecord(null);
          setPinLength(status.length);
          setUnlockedForUserId(isUnlockedInThisTab(user.id) ? user.id : null);
        } else {
          clearTabUnlock();
          const legacy = readLegacyPinRecord(user.id);
          setLegacyRecord(legacy);
          setPinLength(legacy?.length ?? null);
          setUnlockedForUserId(null);
        }
        setStatusError('');
      } catch (error) {
        if (!active) return;
        setPinLength(null);
        setLegacyRecord(null);
        setStatusError(error instanceof Error ? error.message : 'Unable to load your account PIN.');
        setUnlockedForUserId(null);
      } finally {
        if (active) setLoadedForUserId(user.id);
      }
    };
    void loadStatus();

    return () => { active = false; };
  }, [user?.id]);

  const ready = !user || loadedForUserId === user.id;
  const hasPin = ready && !!user && (!!pinLength || !!statusError);
  const isLocked = !!user && hasPin && unlockedForUserId !== user.id;

  const lockLocally = useCallback(() => {
    clearTabUnlock();
    setUnlockedForUserId(null);
  }, []);

  const lock = useCallback(() => {
    lockLocally();
    // Best effort: also tell the server, so it stops serving data right away.
    // keepalive lets the request finish even while the page is being hidden.
    try {
      void fetch(`${API_BASE_URL}/pin/lock`, {
        method: 'POST',
        credentials: 'include',
        keepalive: true,
      }).catch(() => {});
    } catch {
      // The server also expires an idle unlock on its own.
    }
  }, [lockLocally]);

  // The server is the authority: if it asks for the PIN, show the lock screen.
  const hasPinRef = useRef(false);
  hasPinRef.current = hasPin;
  useEffect(() => {
    const onPinRequired = () => {
      if (hasPinRef.current) {
        lockLocally();
      } else {
        // A PIN was set elsewhere (another device or tab). Reload to pick it up.
        window.location.reload();
      }
    };
    window.addEventListener(PIN_REQUIRED_EVENT, onPinRequired);
    return () => window.removeEventListener(PIN_REQUIRED_EVENT, onPinRequired);
  }, [lockLocally]);

  // Auto-lock is always immediate: as soon as the app is left (tab switched,
  // window minimised, phone locked...) the PIN is required again.
  useEffect(() => {
    if (!hasPin || isLocked) return;
    const onVisibilityChange = () => {
      if (document.visibilityState === 'hidden') lock();
    };
    document.addEventListener('visibilitychange', onVisibilityChange);
    return () => document.removeEventListener('visibilitychange', onVisibilityChange);
  }, [hasPin, isLocked, lock]);

  const persistPin = async (pin: string, length: PinLength) => {
    if (!user) throw new Error('Sign in before setting a PIN.');
    const { data: result } = await api.put<{ updated: boolean; enabled: boolean; length: PinLength | null }>('/pin', { newPin: pin, length });
    if (!result.updated) throw new Error('Unable to set your PIN. Please try again.');
    clearLegacyPinRecord(user.id);
    setLegacyRecord(null);
    setPinLength(length);
    setStatusError('');
    setLoadedForUserId(user.id);
    markUnlockedInThisTab(user.id);
    setUnlockedForUserId(user.id);
  };

  const verifyAndUnlock = async (pin: string) => {
    if (!user || !pinLength || statusError) return false;
    if (legacyRecord) {
      if (!(await matchesLegacyPin(pin, legacyRecord))) return false;
      await persistPin(pin, legacyRecord.length);
      return true;
    }
    const { data: result } = await api.post<{ verified: boolean }>('/pin/verify', { pin });
    if (!result.verified) return false;
    markUnlockedInThisTab(user.id);
    setUnlockedForUserId(user.id);
    return true;
  };

  const updatePin = async (currentPin: string, nextPin: string, length: PinLength) => {
    if (!user || !pinLength || statusError) return false;
    const { data: result } = await api.put<{ updated: boolean; enabled: boolean; length: PinLength | null }>('/pin', { currentPin, newPin: nextPin, length });
    if (!result.updated) return false;
    clearLegacyPinRecord(user.id);
    setLegacyRecord(null);
    setPinLength(length);
    setStatusError('');
    markUnlockedInThisTab(user.id);
    setUnlockedForUserId(user.id);
    return true;
  };

  const removePin = async (currentPin: string) => {
    if (!user || !pinLength || statusError) return false;
    const { data: result } = await api.delete<{ removed: boolean }>('/pin', { data: { currentPin } });
    if (!result.removed) return false;
    clearLegacyPinRecord(user.id);
    setLegacyRecord(null);
    setPinLength(null);
    setStatusError('');
    clearTabUnlock();
    setUnlockedForUserId(null);
    return true;
  };

  const recoverWithPassword = async (password: string) => {
    if (!user) return { success: false, error: 'Sign in to recover your PIN.' };
    try {
      const { data: result } = await api.post<{ recovered: boolean }>('/pin/recover', { password });
      if (!result.recovered) return { success: false, error: 'Unable to recover your PIN.' };
      clearLegacyPinRecord(user.id);
      setLegacyRecord(null);
      setPinLength(null);
      setStatusError('');
      setLoadedForUserId(user.id);
      clearTabUnlock();
      setUnlockedForUserId(user.id);
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unable to verify your account password.',
      };
    }
  };

  const value = useMemo<PinLockContextValue>(() => ({
    ready,
    hasPin,
    isLocked,
    pinLength: ready ? pinLength : null,
    statusError,
    verifyAndUnlock,
    setPin: persistPin,
    updatePin,
    removePin,
    recoverWithPassword,
  }), [ready, hasPin, isLocked, pinLength, statusError, user?.id]);

  return <PinLockContext.Provider value={value}>{children}</PinLockContext.Provider>;
}

export function usePinLock() {
  const context = useContext(PinLockContext);
  if (!context) throw new Error('usePinLock must be used within PinLockProvider');
  return context;
}