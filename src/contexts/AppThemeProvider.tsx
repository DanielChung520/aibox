import { createContext, useState, useEffect, useContext, ReactNode } from 'react';
import { lightColors, darkColors } from '../styles/theme/tokens';

type ThemeMode = 'light' | 'dark' | 'system';
type EffectiveTheme = 'light' | 'dark';

interface ThemeContextValue {
  themeMode: ThemeMode;
  setThemeMode: (mode: ThemeMode) => void;
  effectiveTheme: EffectiveTheme;
  colors: typeof lightColors;
}

export const ThemeContext = createContext<ThemeContextValue>({
  themeMode: 'system',
  setThemeMode: () => {},
  effectiveTheme: 'dark',
  colors: lightColors,
});

function getEffective(mode: ThemeMode): EffectiveTheme {
  if (mode === 'system') {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
  return mode;
}

export function AppThemeProvider({ children }: { children: ReactNode }) {
  const [themeMode, setThemeMode] = useState<ThemeMode>(() => {
    const stored = localStorage.getItem('theme-mode');
    return (stored as ThemeMode) || 'system';
  });
  const [effectiveTheme, setEffectiveTheme] = useState<EffectiveTheme>(() => getEffective(themeMode));
  const colors = effectiveTheme === 'dark' ? darkColors : lightColors;

  useEffect(() => {
    setEffectiveTheme(getEffective(themeMode));
    localStorage.setItem('theme-mode', themeMode);
  }, [themeMode]);

  useEffect(() => {
    if (themeMode !== 'system') return;
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = (e: MediaQueryListEvent) => setEffectiveTheme(e.matches ? 'dark' : 'light');
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, [themeMode]);

  return (
    <ThemeContext.Provider value={{ themeMode, setThemeMode, effectiveTheme, colors }}>
      <div
        data-theme={effectiveTheme}
        style={{
          minHeight: '100vh',
          backgroundColor: colors.bgBase,
          color: colors.textBase,
          '--color-primary': colors.primary,
          '--color-success': colors.success,
          '--color-warning': colors.warning,
          '--color-error': colors.error,
          '--color-bg-base': colors.bgBase,
          '--color-text-base': colors.textBase,
          '--color-sider-bg': colors.siderBg,
          '--color-header-bg': colors.headerBg,
          '--shadow-header': colors.headerShadow,
          '--shadow-sider': colors.siderShadow,
          '--shadow-card': colors.cardShadow,
          '--shadow-card-hover': colors.cardShadowHover,
          '--shadow-card-secondary': colors.cardShadowSecondary,
          '--color-table-expanded-row-bg': colors.tableExpandedRowBg,
          '--expanded-row-bg': colors.tableExpandedRowBg,
          '--color-table-header-bg': colors.tableHeaderBg,
          '--color-chat-input-bg': colors.chatInputBg,
          '--color-chat-user-bubble': colors.chatUserBubble,
          '--color-chat-assistant-bubble': colors.chatAssistantBubble,
        } as React.CSSProperties}
      >
        {children}
      </div>
    </ThemeContext.Provider>
  );
}

export function useEffectiveTheme(): EffectiveTheme {
  return useContext(ThemeContext).effectiveTheme;
}

export function useThemeMode(): [ThemeMode, (mode: ThemeMode) => void] {
  const ctx = useContext(ThemeContext);
  return [ctx.themeMode, ctx.setThemeMode];
}

export function useColors(): typeof lightColors {
  return useContext(ThemeContext).colors;
}
