/* (chemin : /frontend/src/hooks/usePersistent.ts) */
"use client";
import { useEffect, useState } from "react";
export function usePersistentState<T>(key: string, initial: T){
  const [val, setVal] = useState<T>(()=>{
    if(typeof window === "undefined") return initial;
    const raw = localStorage.getItem(key); if(!raw) return initial;
    try { return JSON.parse(raw); } catch { return initial; }
  });
  useEffect(()=>{ localStorage.setItem(key, JSON.stringify(val)); }, [key, val]);
  return [val, setVal] as const;
}
export function useScrollRestoration(key: string){
  useEffect(()=>{
    try { const y = Number(localStorage.getItem(key) || "0"); if(!isNaN(y)) window.scrollTo(0, y); } catch {}
    const onSave = () => { try { localStorage.setItem(key, String(window.scrollY)); } catch {} };
    window.addEventListener("beforeunload", onSave);
    document.addEventListener("visibilitychange", onSave);
    return () => { onSave(); window.removeEventListener("beforeunload", onSave); document.removeEventListener("visibilitychange", onSave); };
  }, [key]);
}
