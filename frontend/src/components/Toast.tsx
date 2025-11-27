/* (chemin : /frontend/src/components/Toast.tsx) */
"use client";
import { useEffect, useState } from "react";
export function useToast(){
  const [msg, setMsg] = useState<string|null>(null);
  useEffect(()=>{ if(!msg) return; const t=setTimeout(()=>setMsg(null), 3500); return ()=>clearTimeout(t); },[msg]);
  return { msg, setMsg };
}
export function Toast({ msg }:{ msg:string|null }){
  if(!msg) return null;
  return <div className="fixed bottom-4 right-4 bg-black text-white px-4 py-2 rounded-none shadow">{msg}</div>;
}
