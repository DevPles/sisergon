import { useState, useEffect, useCallback, useRef } from 'react';

interface UseAutoSaveOptions<T> {
  key: string;
  data: T;
  debounceMs?: number;
  enabled?: boolean;
}

export function useAutoSave<T>({ key, data, debounceMs = 10000, enabled = true }: UseAutoSaveOptions<T>) {
  const [recovered, setRecovered] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const storageKey = `autosave:${key}`;

  // Save to localStorage
  const save = useCallback(() => {
    if (!enabled) return;
    try {
      localStorage.setItem(storageKey, JSON.stringify({ data, savedAt: new Date().toISOString() }));
      setLastSaved(new Date());
    } catch { /* storage full — ignore */ }
  }, [storageKey, data, enabled]);

  // Debounced auto-save
  useEffect(() => {
    if (!enabled) return;
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(save, debounceMs);
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [data, save, debounceMs, enabled]);

  // Recover from localStorage
  const recover = useCallback((): T | null => {
    try {
      const raw = localStorage.getItem(storageKey);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      setRecovered(true);
      return parsed.data as T;
    } catch { return null; }
  }, [storageKey]);

  // Clear saved data
  const clear = useCallback(() => {
    localStorage.removeItem(storageKey);
    setRecovered(false);
    setLastSaved(null);
  }, [storageKey]);

  // Check if there's saved data
  const hasSavedData = useCallback((): boolean => {
    return localStorage.getItem(storageKey) !== null;
  }, [storageKey]);

  return { save, recover, clear, hasSavedData, recovered, lastSaved };
}
