/* chemin : /frontend/src/hooks/usePersistent.ts */
"use client";

import { useEffect, useState } from "react";

export function usePersistentState<T>(key: string, initial: T) {
  const [val, setVal] = useState<T>(() => {
    if (typeof window === "undefined") {
      return initial;
    }
    try {
      const raw = window.localStorage.getItem(key);
      if (!raw) return initial;
      return JSON.parse(raw) as T;
    } catch {
      return initial;
    }
  });

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.setItem(key, JSON.stringify(val));
    } catch {}
  }, [key, val]);

  return [val, setVal] as const;
}


/**
 * Restaure / sauvegarde la position de scroll
 */
export function useScrollRestoration(key: string) {
  // ✅ un seul useEffect, jamais conditionnel
  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    // restauration au montage
    try {
      const stored = window.localStorage.getItem(key);
      const y = stored ? Number(stored) : 0;
      if (!Number.isNaN(y)) {
        window.scrollTo(0, y);
      }
    } catch {
      // ignore
    }

    const onSave = () => {
      try {
        window.localStorage.setItem(key, String(window.scrollY));
      } catch {
        // ignore
      }
    };

    window.addEventListener("beforeunload", onSave);
    document.addEventListener("visibilitychange", onSave);

    return () => {
      onSave();
      window.removeEventListener("beforeunload", onSave);
      document.removeEventListener("visibilitychange", onSave);
    };
  }, [key]);
}
