/**
 * SleepSync Design System
 * Minimalistic, peaceful color palette and typography
 * Designed to evoke calm and tranquility
 */

export const colors = {
  // Deep, peaceful night colors
  background: {
    primary: '#0A0E27', // Deep space blue
    secondary: '#131729', // Slightly lighter
    tertiary: '#1A1F3A', // Card background
    elevated: '#242943', // Elevated surfaces
  },

  // Soothing purple-blue accents
  primary: {
    main: '#6B4CE6', // Soft purple
    light: '#8B6EF0', // Lighter purple
    dark: '#5438C5', // Deeper purple
    glow: 'rgba(107, 76, 230, 0.3)', // Glow effect
  },

  // Calm secondary colors
  secondary: {
    main: '#4ECDC4', // Tranquil teal
    light: '#7ED9D2', // Lighter teal
    dark: '#3BAAA3', // Deeper teal
  },

  // Status colors (muted for peace)
  success: '#5FD19A', // Soft green
  warning: '#F9C74F', // Warm amber
  error: '#F87171', // Soft red
  info: '#60A5FA', // Calm blue

  // Text colors
  text: {
    primary: '#FFFFFF', // Pure white
    secondary: '#B8BFDB', // Muted lavender
    tertiary: '#7A82A8', // Subdued gray-purple
    disabled: '#4A5168', // Very muted
  },

  // Neutrals
  gray: {
    50: '#F9FAFB',
    100: '#F3F4F6',
    200: '#E5E7EB',
    300: '#D1D5DB',
    400: '#9CA3AF',
    500: '#6B7280',
    600: '#4B5563',
    700: '#374151',
    800: '#1F2937',
    900: '#111827',
  },

  // Special gradients
  gradients: {
    sleepCard: ['#1A1F3A', '#242943'] as const,
    primaryButton: ['#6B4CE6', '#5438C5'] as const,
    scoreGood: ['#5FD19A', '#3BAAA3'] as const,
    scoreWarning: ['#F9C74F', '#F4A261'] as const,
    scoreBad: ['#F87171', '#EF4444'] as const,
    background: ['#0A0E27', '#131729'] as const,
  },

  // Transparent overlays
  overlay: {
    light: 'rgba(255, 255, 255, 0.05)',
    medium: 'rgba(255, 255, 255, 0.1)',
    heavy: 'rgba(255, 255, 255, 0.15)',
    dark: 'rgba(0, 0, 0, 0.3)',
  },
};

export const typography = {
  // Font families
  fonts: {
    regular: 'System',
    medium: 'System',
    semiBold: 'System',
    bold: 'System',
  },

  // Font sizes
  sizes: {
    xs: 12,
    sm: 14,
    base: 16,
    lg: 18,
    xl: 20,
    '2xl': 24,
    '3xl': 30,
    '4xl': 36,
    '5xl': 48,
  },

  // Line heights
  lineHeights: {
    tight: 1.2,
    normal: 1.5,
    relaxed: 1.75,
  },

  // Font weights
  weights: {
    regular: '400' as const,
    medium: '500' as const,
    semiBold: '600' as const,
    bold: '700' as const,
  },
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  '2xl': 48,
  '3xl': 64,
};

export const borderRadius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  full: 9999,
};

export const shadows = {
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 8,
  },
  glow: {
    shadowColor: '#6B4CE6',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 6,
  },
};

export const animations = {
  duration: {
    fast: 200,
    normal: 300,
    slow: 500,
  },
  easing: {
    ease: 'ease',
    easeIn: 'ease-in',
    easeOut: 'ease-out',
    easeInOut: 'ease-in-out',
  },
};

export default {
  colors,
  typography,
  spacing,
  borderRadius,
  shadows,
  animations,
};

