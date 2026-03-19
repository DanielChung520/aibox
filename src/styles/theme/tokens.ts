/**
 * @file        設計令牌
 * @description 全域設計令牌，定義亮色/暗色主題的顏色、陰影、字體等
 */

export const lightColors = {
  primary: '#1e40af',
  success: '#22c55e',
  warning: '#f59e0b',
  error: '#dc2626',
  info: '#1e40af',
  bgBase: '#ffffff',
  textBase: '#030213',
  tableExpandedRowBg: '#f0f4ff',
  tableHeaderBg: '#f0f4ff',
  siderBg: '#f8fafc',
  headerBg: '#ffffff',
  headerShadow: '0 2px 8px rgba(0, 0, 0, 0.08)',
  siderShadow: '2px 0 8px rgba(0, 0, 0, 0.06)',
  cardShadow: '0 4px 16px rgba(30, 64, 175, 0.12)',
  cardShadowHover: '0 8px 32px rgba(30, 64, 175, 0.20)',
  cardShadowSecondary: '0 8px 32px rgba(30, 64, 175, 0.20)',
  siderBorder: '#e2e8f0',
  chatInputBg: '#f1f5f9',
  chatUserBubble: '#dbeafe',
  chatAssistantBubble: '#e2e8f0',
  textSecondary: '#64748b',
  iconDefault: '#64748b',
  iconHover: '#1e40af',
  btnClear: '#f59e0b',
  btnClearHover: '#d97706',
  btnSend: '#1e40af',
  btnSendHover: '#1e3a8a',
  btnText: '#030213',
};

export const darkColors = {
  primary: '#3b82f6',
  success: '#22c55e',
  warning: '#f59e0b',
  error: '#ef4444',
  info: '#3b82f6',
  bgBase: '#0f172a',
  textBase: '#f1f5f9',
  tableExpandedRowBg: '#0a1120',
  tableHeaderBg: '#1a2235',
  siderBg: '#0c1425',
  headerBg: '#0c1425',
  headerShadow: '0 2px 8px rgba(0, 0, 0, 0.4)',
  siderShadow: '2px 0 8px rgba(0, 0, 0, 0.3)',
  cardShadow: '0 4px 16px rgba(100, 80, 220, 0.25)',
  cardShadowHover: '0 8px 32px rgba(100, 80, 220, 0.40)',
  cardShadowSecondary: '0 8px 32px rgba(100, 80, 220, 0.40)',
  siderBorder: '#334155',
  chatInputBg: '#1e293b',
  chatUserBubble: '#1e3a8a',
  chatAssistantBubble: '#1e293b',
  textSecondary: '#8892a0',
  iconDefault: '#8892a0',
  iconHover: '#ffffff',
  btnClear: '#f59e0b',
  btnClearHover: '#d97706',
  btnSend: '#3b82f6',
  btnSendHover: '#2563eb',
  btnText: '#ffffff',
};

export const lightTokens = {
  colorPrimary: lightColors.primary,
  colorSuccess: lightColors.success,
  colorWarning: lightColors.warning,
  colorError: lightColors.error,
  colorInfo: lightColors.info,
  colorBgBase: lightColors.bgBase,
  colorTextBase: lightColors.textBase,
  borderRadius: 10,
  fontFamily:
    "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif",
  boxShadow: lightColors.cardShadow,
  boxShadowSecondary: lightColors.cardShadowSecondary,
};

export const darkTokens = {
  colorPrimary: darkColors.primary,
  colorSuccess: darkColors.success,
  colorWarning: darkColors.warning,
  colorError: darkColors.error,
  colorInfo: darkColors.info,
  colorBgBase: darkColors.bgBase,
  colorTextBase: darkColors.textBase,
  borderRadius: 10,
  fontFamily:
    "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif",
  boxShadow: darkColors.cardShadow,
  boxShadowSecondary: darkColors.cardShadowSecondary,
};

export type ThemeColors = typeof lightColors;
export type ThemeTokens = typeof lightTokens;
