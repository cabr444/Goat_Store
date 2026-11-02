"use client";
import { useEffect, useState } from 'react';
import { Moon, Sun } from 'lucide-react';
const storageKey = 'goats-theme';
export default function ThemeToggle() {
  const [dark, setDark] = useState(false);
  useEffect(() => {
    const sync = () => setDark(document.documentElement.dataset.theme === 'dark');
    sync();
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const system = () => {
      let saved: string | null = null;
      try { saved = localStorage.getItem(storageKey); } catch {}
      if (saved !== 'light' && saved !== 'dark') document.documentElement.dataset.theme = media.matches ? 'dark' : 'light';
      sync();
    };
    const storage = (event: StorageEvent) => { if (event.key === storageKey || event.key === null) {
      const value = event.newValue;
      document.documentElement.dataset.theme = value === 'dark' || value === 'light' ? value : media.matches ? 'dark' : 'light';
      sync();
    } };
    media.addEventListener('change', system);
    window.addEventListener('storage', storage);
    return () => { media.removeEventListener('change', system); window.removeEventListener('storage', storage); };
  }, []);
  function toggle() {
    const next = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
    document.documentElement.dataset.theme = next;
    setDark(next === 'dark');
    try { localStorage.setItem(storageKey, next); } catch {}
  }
  return <button type="button" className="theme-toggle" onClick={toggle} aria-label={dark ? 'Activar modo claro' : 'Activar modo oscuro'} title={dark ? 'Activar modo claro' : 'Activar modo oscuro'}>{dark ? <Sun size={19} aria-hidden="true"/> : <Moon size={19} aria-hidden="true"/>}<span>{dark ? 'Modo claro' : 'Modo oscuro'}</span></button>;
}
