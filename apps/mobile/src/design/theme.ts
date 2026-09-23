import { Platform } from "react-native";

/** Direction B tokens, with compatibility aliases for existing screens. */
export const colors = {
  primary: "#183D2C",
  primaryLight: "#24533C",
  primaryPressed: "#24533C",
  primaryMuted: "#E3EDE6",
  primarySubtle: "#E3EDE6",
  primaryBorder: "#C9DCCF",
  background: "#F6F5F2",
  backgroundQuiet: "#F0EFEA",
  surface: "#FFFFFF",
  surfaceSubtle: "#F0EFEA",
  surfaceMuted: "#F0EFEA",
  surfaceScrim: "rgba(15, 38, 27, 0.45)",
  appBarBackground: "#F6F5F2",
  appBarBorder: "#EAE8E3",
  textPrimary: "#121714",
  text: "#121714",
  textSecondary: "#5A645E",
  textTertiary: "#8D9790",
  textInverse: "#FFFFFF",
  success: "#1B7F49",
  successLight: "#E8F5EE",
  warning: "#B46B08",
  warningLight: "#FEF6E7",
  warningSurface: "#FEF6E7",
  error: "#BA2D2D",
  danger: "#BA2D2D",
  errorLight: "#FDF2F2",
  dangerSurface: "#FDF2F2",
  info: "#1C64B4",
  infoLight: "#EBF3FB",
  borderSubtle: "#EAE8E3",
  border: "#EAE8E3",
  borderStrong: "#D7D4CC",
  disabled: "#A7AEA8",
  tabInactive: "#68726C",
  sage: "#B8C8A8",
  sageStrong: "#7F9A75",
  peach: "#E7A982",
  peachSurface: "#F8E3D3"
} as const;

export type ColorToken = keyof typeof colors;

export const spacing = {
  xxs: 4,
  xs: 8,
  sm: 12,
  md: 16,
  lg: 20,
  xl: 24,
  xxl: 32,
  xxxl: 40,
  huge: 40,
  screenPadding: 16,
  bottomBarHeight: 64
} as const;

export const radius = { xs: 6, sm: 10, md: 14, lg: 20, xl: 26, round: 9999 } as const;
export const radii = radius;

export const fonts = {
  body: "AppShopSans",
  bodyBold: "AppShopSansBold",
  heading: "AppShopSansBold"
} as const;

export const typography = {
  display: { fontFamily: fonts.heading, fontSize: 34, lineHeight: 40, fontWeight: "700" as const, letterSpacing: -0.7 },
  h1: { fontFamily: fonts.heading, fontSize: 28, lineHeight: 34, fontWeight: "700" as const, letterSpacing: -0.5 },
  screenTitle: { fontFamily: fonts.heading, fontSize: 28, lineHeight: 34, fontWeight: "700" as const, letterSpacing: -0.5 },
  h2: { fontFamily: fonts.heading, fontSize: 22, lineHeight: 28, fontWeight: "700" as const, letterSpacing: -0.3 },
  sectionTitle: { fontFamily: fonts.heading, fontSize: 22, lineHeight: 28, fontWeight: "700" as const, letterSpacing: -0.3 },
  h3: { fontFamily: fonts.bodyBold, fontSize: 18, lineHeight: 24, fontWeight: "600" as const, letterSpacing: -0.2 },
  cardTitle: { fontFamily: fonts.bodyBold, fontSize: 16, lineHeight: 22, fontWeight: "700" as const },
  bodyLarge: { fontFamily: fonts.bodyBold, fontSize: 16, lineHeight: 22, fontWeight: "500" as const },
  body: { fontFamily: fonts.body, fontSize: 15, lineHeight: 20, fontWeight: "400" as const },
  bodyMedium: { fontFamily: fonts.body, fontSize: 15, lineHeight: 20, fontWeight: "400" as const },
  bodyStrong: { fontFamily: fonts.bodyBold, fontSize: 15, lineHeight: 20, fontWeight: "700" as const },
  secondary: { fontFamily: fonts.body, fontSize: 13, lineHeight: 18, fontWeight: "400" as const },
  bodySmall: { fontFamily: fonts.body, fontSize: 13, lineHeight: 18, fontWeight: "400" as const },
  caption: { fontFamily: fonts.bodyBold, fontSize: 12, lineHeight: 16, fontWeight: "600" as const, letterSpacing: 0.2 },
  overline: { fontFamily: fonts.bodyBold, fontSize: 11, lineHeight: 14, fontWeight: "700" as const, letterSpacing: 0.8, textTransform: "uppercase" as const },
  button: { fontFamily: fonts.bodyBold, fontSize: 15, lineHeight: 20, fontWeight: "600" as const, letterSpacing: -0.1 }
} as const;

export const iconSizes = { sm: 18, md: 22, lg: 26 } as const;
export const touchTargets = { minimum: 44, comfortable: 48 } as const;

const platformShadows = Platform.select({
  ios: {
    sm: { shadowColor: colors.text, shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 3 },
    md: { shadowColor: colors.text, shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.07, shadowRadius: 8 },
    lg: { shadowColor: colors.text, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.12, shadowRadius: 16 }
  },
  default: { sm: { elevation: 1 }, md: { elevation: 3 }, lg: { elevation: 6 } }
})!;

export const shadows = { ...platformShadows, card: platformShadows.sm };
