// constants/theme.ts — Design system aligned with web (globals.css)

// ── Shared tokens (mode-independent) ──────────────────────────────────
export const shared = {
  // Brand
  blue: '#1271FF',
  blueHover: '#0d5dd8',

  // Semantic status
  success: '#22c55e',
  successLight: '#d1fae5',
  error: '#dc2626',
  errorLight: '#fee2e2',
  warning: '#f97316',
  warningLight: '#fff7ed',
  info: '#3b82f6',
  infoLight: '#dbeafe',

  // Event theme badges
  eventTheme: {
    musique: '#a855f7',
    professionnel: '#3b82f6',
    étudiant: '#22c55e',
    sport: '#f97316',
    café: '#f59e0b',
    fête: '#ec4899',
    général: '#6b7280',
  } as Record<string, string>,

  // Typography
  fonts: {
    primary: 'Roboto',
    heading: 'Poppins',
  },
  fontWeights: {
    normal: '400' as const,
    medium: '500' as const,
    semibold: '600' as const,
    bold: '700' as const,
  },
  fontSizes: {
    xs: 12,
    sm: 14,
    base: 16,
    lg: 18,
    xl: 20,
    '2xl': 24,
    '3xl': 30,
  },

  // Spacing (4px base unit)
  spacing: {
    xs: 4,
    sm: 8,
    md: 12,
    lg: 16,
    xl: 20,
    '2xl': 24,
    '3xl': 32,
  },

  // Border radius
  borderRadius: {
    sm: 6,
    md: 8,
    lg: 12,
    xl: 16,
    full: 999,
  },
};

// ── Light theme ───────────────────────────────────────────────────────
export const lightTheme = {
  colors: {
    // Page
    background: '#F5F5F5',
    foreground: '#303030',

    // Cards
    card: '#ffffff',
    cardForeground: '#303030',

    // Brand
    primary: '#1271FF',
    primaryForeground: '#ffffff',

    // Secondary
    secondary: '#f3f4f6',
    secondaryForeground: '#303030',

    // Text hierarchy
    textPrimary: '#303030',
    textSecondary: 'rgba(48, 48, 48, 0.6)',
    textMuted: 'rgba(48, 48, 48, 0.8)',

    // Muted
    muted: '#f3f4f6',
    mutedForeground: '#6b7280',

    // Accent
    accent: '#E0E7FF',
    accentForeground: '#303030',
    accentSolid: '#303030',
    accentSolidText: '#ffffff',

    // Destructive
    destructive: '#dc2626',
    destructiveForeground: '#ffffff',

    // Input
    input: '#f0f0f0',
    inputBackground: '#f0f0f0',
    placeholder: '#9ca3af',

    // Border
    border: '#e5e5e5',

    // Navigation
    nav: '#F5F5F5',
    tabActive: '#303030',
    tabInactive: 'rgba(48, 48, 48, 0.6)',

    // Overlays
    overlay: 'rgba(0, 0, 0, 0.5)',
    hover: 'rgba(0, 0, 0, 0.05)',

    // Badge
    badge: '#e8e8e8',

    // Shadow
    shadow: 'rgba(0, 0, 0, 0.08)',

    // Chat
    receivedMsg: '#ffffff',
    sentMsg: '#303030',
    sentMsgText: '#ffffff',
  },
  ...shared,
};

// ── Dark theme ────────────────────────────────────────────────────────
export const darkTheme = {
  colors: {
    // Page
    background: '#303030',
    foreground: '#ededed',

    // Cards
    card: '#3a3a3a',
    cardForeground: '#ededed',

    // Brand
    primary: '#1271FF',
    primaryForeground: '#ffffff',

    // Secondary
    secondary: '#444444',
    secondaryForeground: '#ededed',

    // Text hierarchy
    textPrimary: '#ededed',
    textSecondary: 'rgba(237, 237, 237, 0.6)',
    textMuted: 'rgba(237, 237, 237, 0.8)',

    // Muted
    muted: '#444444',
    mutedForeground: '#9ca3af',

    // Accent
    accent: '#444444',
    accentForeground: '#ededed',
    accentSolid: '#ededed',
    accentSolidText: '#303030',

    // Destructive
    destructive: '#dc2626',
    destructiveForeground: '#fee2e2',

    // Input
    input: '#444444',
    inputBackground: '#444444',
    placeholder: '#6b7280',

    // Border
    border: '#4a4a4a',

    // Navigation
    nav: '#303030',
    tabActive: '#ededed',
    tabInactive: 'rgba(237, 237, 237, 0.6)',

    // Overlays
    overlay: 'rgba(0, 0, 0, 0.7)',
    hover: 'rgba(255, 255, 255, 0.08)',

    // Badge
    badge: '#484848',

    // Shadow
    shadow: 'rgba(0, 0, 0, 0.3)',

    // Chat
    receivedMsg: '#444444',
    sentMsg: '#1271FF',
    sentMsgText: '#ffffff',
  },
  ...shared,
};

// ── Type exports ──────────────────────────────────────────────────────
export type Theme = typeof lightTheme;
export type ThemeColors = typeof lightTheme.colors;

export const getTheme = (isDark = false): Theme => isDark ? darkTheme : lightTheme;
