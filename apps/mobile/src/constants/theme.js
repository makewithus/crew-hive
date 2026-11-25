/**
 * apps/mobile/src/constants/theme.js
 * Official CrewHive Mobile Design Tokens extracted from root BRANDING.md.
 * JavaScript-only constants for React Native StyleSheet and component styling.
 */

export const Colors = {
  brand: {
    primary: "#F5A623",
    primaryHover: "#DF9115",
    primaryLight: "rgba(245, 166, 35, 0.12)",
    primaryBorder: "rgba(245, 166, 35, 0.25)",
    whatsapp: "#25D366",
  },
  accent: {
    amber: "#F5A623",
    amberLight: "rgba(245, 166, 35, 0.15)",
    amberBorder: "rgba(245, 166, 35, 0.3)",
    amberHover: "#DF9115",
  },
  surface: {
    base: "#141414",
    card: "#141414",
    raised: "#1F1F1F",
    elevated: "#1A1A1A",
    subtle: "#242424",
  },
  bg: {
    base: "#0D0D0D",      // Global canvas background
    surface: "#141414",   // Card surface, bottom sheets, navigation bar
    elevated: "#1A1A1A",  // Inputs, dropdowns, table rows
    subtle: "#242424",    // Hover/press states, nested containers
    raised: "#1F1F1F",
  },
  border: {
    base: "#2A2A2A",      // 1px standard border
    subtle: "rgba(255, 255, 255, 0.08)",
    focus: "#F5A623",     // Focused inputs & active rings
  },
  text: {
    primary: "#F5F5F5",   // High-contrast primary copy
    white: "#FFFFFF",     // Pure white brand titles
    secondary: "#A1A1AA", // Subtitles, metadata, form labels
    muted: "#71717A",     // Captions, timestamps, disabled
    inverse: "#0D0D0D",   // Bold text on amber buttons
  },
  semantic: {
    success: "#10B981",
    error: "#EF4444",
    warning: "#F59E0B",
    info: "#38BDF8",
  },
  status: {
    available: "#10B981",
    availableBg: "rgba(16, 185, 129, 0.12)",
    availableBorder: "rgba(16, 185, 129, 0.25)",
    busy: "#71717A",
    busyBg: "rgba(113, 113, 122, 0.12)",
    busyBorder: "rgba(113, 113, 122, 0.20)",
    pending: "#F59E0B",
    pendingBg: "rgba(245, 158, 11, 0.12)",
    pendingBorder: "rgba(245, 158, 11, 0.25)",
    declined: "#EF4444",
    declinedBg: "rgba(239, 68, 68, 0.12)",
    declinedBorder: "rgba(239, 68, 68, 0.30)",
    info: "#38BDF8",
    infoBg: "rgba(56, 189, 248, 0.12)",
    infoBorder: "rgba(56, 189, 248, 0.25)",
  },
  roles: {
    crew: "#F5A623",
    organizer: "#C084FC",
    admin: "#38BDF8",
    association: "#FBBF24",
  },
};

export const Radius = {
  sm: 6,
  md: 8,
  lg: 12,
  xl: 16,
  "2xl": 24,
  full: 9999,
};

export const Spacing = {
  1: 4,
  2: 8,
  3: 12,
  4: 16,
  5: 20,
  6: 24,
  8: 32,
  10: 40,
  12: 48,
  16: 64,
};

export const Typography = {
  size: {
    xs: 12,
    sm: 14,
    md: 16,
    lg: 18,
    xl: 20,
    xxl: 24,
    display: 32,
  },
  weight: {
    regular: "400",
    medium: "500",
    semiBold: "600",
    bold: "700",
    heavy: "800",
  },
  display: { fontSize: 32, fontWeight: "800", lineHeight: 38 },
  h1: { fontSize: 26, fontWeight: "700", lineHeight: 32 },
  h2: { fontSize: 20, fontWeight: "600", lineHeight: 26 },
  h3: { fontSize: 17, fontWeight: "600", lineHeight: 22 },
  bodyLarge: { fontSize: 16, fontWeight: "400", lineHeight: 24 },
  body: { fontSize: 15, fontWeight: "400", lineHeight: 22 },
  bodySecondary: { fontSize: 13, fontWeight: "400", lineHeight: 18 },
  caption: { fontSize: 12, fontWeight: "500", lineHeight: 16 },
  micro: { fontSize: 10, fontWeight: "600", lineHeight: 14, letterSpacing: 0.5 },
};

export const Shadows = {
  card: {
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.45,
    shadowRadius: 8,
    elevation: 4,
  },
  primaryButton: {
    shadowColor: "#F5A623",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.35,
    shadowRadius: 6,
    elevation: 3,
  },
  modal: {
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.65,
    shadowRadius: 16,
    elevation: 8,
  },
};

export const Dimensions = {
  screenPadding: 16,
  minTouchTarget: 44, // Strict Apple HIG / Android minimum hitbox
  buttonHeight: 48,
  inputHeight: 48,
  avatarSize: 56,
  bottomBarHeight: 60,
};

export default {
  Colors,
  Radius,
  Spacing,
  Typography,
  Shadows,
  Dimensions,
};
