/**
 * @file        主題上下文
 * @description 提供當前有效主題（light/dark）給全應用使用
 * @lastUpdate  2026-03-19 11:00:00
 * @author      Daniel Chung
 * @version     1.0.0
 */

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

type ThemeMode = 'light' | 'dark' | 'system';
type EffectiveTheme = 'light' | 'dark';

interface ThemeContextValue {
  themeMode: ThemeMode;
  setThemeMode: (mode: ThemeMode) => void;
  effectiveTheme: EffectiveTheme;
}

const ThemeContext = createContext<ThemeContextValue>({
  themeMode: 'system',
  setThemeMode: () => {},
  effectiveTheme: 'dark',
});

export function ThemeProvider({ children, initialMode = 'system' }: { children: ReactNode; initialMode?: ThemeMode }) {
  const [themeMode, setThemeMode] = useState<ThemeMode>(initialMode);

  const getEffective = (mode: ThemeMode): EffectiveTheme => {
    if (mode === 'system') {
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    return mode;
  };

  const [effectiveTheme, setEffectiveTheme] = useState<EffectiveTheme>(() => getEffective(initialMode));

  useEffect(() => {
    setEffectiveTheme(getEffective(themeMode));
  }, [themeMode]);

  useEffect(() => {
    if (themeMode !== 'system') return;
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = (e: MediaQueryListEvent) => {
      setEffectiveTheme(e.matches ? 'dark' : 'light');
    };
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, [themeMode]);

  return (
    <ThemeContext.Provider value={{ themeMode, setThemeMode, effectiveTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useEffectiveTheme(): EffectiveTheme {
  const { effectiveTheme } = useContext(ThemeContext);
  return effectiveTheme;
}

export function useThemeMode(): [ThemeMode, (mode: ThemeMode) => void] {
  const ctx = useContext(ThemeContext);
  return [ctx.themeMode, ctx.setThemeMode];
}
