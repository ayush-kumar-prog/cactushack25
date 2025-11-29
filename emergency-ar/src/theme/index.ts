// EmergencyAR Design System
// Nothing OS inspired theme (Monochrome + Red)

export const Colors = {
  // Backgrounds
  background: '#000000',
  surface: '#1A1A1A',
  surfaceElevated: '#262626',
  surfaceOverlay: 'rgba(0, 0, 0, 0.9)',

  // Text
  textPrimary: '#FFFFFF',
  textSecondary: '#C6C6C6',
  textTertiary: '#808080',

  // Semantic Colors
  emergency: '#D71921', // Nothing Red
  emergencyDark: '#A61218',
  success: '#FFFFFF', // Nothing often uses white for success or monochrome
  successDark: '#CCCCCC',
  warning: '#D71921', // Use Red for warning too
  info: '#FFFFFF',

  // Interactive
  accent: '#D71921',
  accentSecondary: '#FFFFFF',

  // Borders & Dividers
  border: '#FFFFFF',
  borderLight: 'rgba(255, 255, 255, 0.3)',

  // Shadows & Glows
  shadowDark: 'rgba(0, 0, 0, 0.8)',
  glowEmergency: 'rgba(215, 25, 33, 0.4)',
  glowSuccess: 'rgba(255, 255, 255, 0.4)',
  glowInfo: 'rgba(255, 255, 255, 0.4)',
};

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
  xxxl: 64,
};

export const BorderRadius = {
  sm: 2,
  md: 4,
  lg: 12,
  xl: 24,
  full: 999,
};

// We'll use a dotted font if we can load it, otherwise monospace
const FONT_FAMILY = 'monospace';

export const Typography = {
  largeTitle: {
    fontSize: 32,
    fontWeight: '700' as const,
    fontFamily: FONT_FAMILY,
    letterSpacing: 1,
    textTransform: 'uppercase' as const,
  },
  title: {
    fontSize: 24,
    fontWeight: '700' as const,
    fontFamily: FONT_FAMILY,
    letterSpacing: 0.5,
    textTransform: 'uppercase' as const,
  },
  headline: {
    fontSize: 18,
    fontWeight: '600' as const,
    fontFamily: FONT_FAMILY,
    letterSpacing: 0.5,
  },
  body: {
    fontSize: 16,
    fontWeight: '400' as const,
    fontFamily: FONT_FAMILY,
    lineHeight: 24,
  },
  callout: {
    fontSize: 14,
    fontWeight: '400' as const,
    fontFamily: FONT_FAMILY,
    letterSpacing: 0.5,
  },
  subhead: {
    fontSize: 14,
    fontWeight: '400' as const,
    fontFamily: FONT_FAMILY,
    textTransform: 'uppercase' as const,
  },
  footnote: {
    fontSize: 12,
    fontWeight: '400' as const,
    fontFamily: FONT_FAMILY,
  },
  caption: {
    fontSize: 10,
    fontWeight: '400' as const,
    fontFamily: FONT_FAMILY,
    textTransform: 'uppercase' as const,
  },
};

export const Shadows = {
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.5,
    shadowRadius: 2,
    elevation: 2,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 2, height: 2 },
    shadowOpacity: 0.8,
    shadowRadius: 0, // Sharp shadows
    elevation: 4,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 4, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 0, // Sharp shadows
    elevation: 8,
  },
  glow: (color: string) => ({
    shadowColor: color,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 12,
    elevation: 8,
  }),
};

export const Animation = {
  fast: 150,
  normal: 300,
  slow: 500,
  pulse: 1000,
  ripple: 1500,
};
