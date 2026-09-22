import { Platform } from "react-native";

export const colors = {
  background: "#F8F3E8",
  backgroundQuiet: "#FCF8F0",
  surface: "#FFFEFA",
  surfaceMuted: "#F1EBDD",
  appBarBackground: "#F8F3E8",
  appBarBorder: "#DCD5C4",
  primary: "#173F2D",
  primaryPressed: "#0E3020",
  primarySubtle: "#E1E9DC",
  sage: "#B8C8A8",
  sageStrong: "#7F9A75",
  peach: "#E7A982",
  peachSurface: "#F8E3D3",
  text: "#17251D",
  textSecondary: "#647068",
  border: "#DED7C7",
  borderStrong: "#AEBBA9",
  warning: "#96581F",
  warningSurface: "#F8E3D3",
  danger: "#9E4038",
  dangerSurface: "#F8E8E2",
  success: "#2F6A49",
  disabled: "#A7AEA8",
  tabInactive: "#68726C"
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
  huge: 40
} as const;

export const radius = {
  sm: 10,
  md: 14,
  lg: 20,
  xl: 26,
  round: 999
} as const;

export const fonts = {
  body: "AppShopSans",
  bodyBold: "AppShopSansBold",
  heading: "AppShopSerifBold"
} as const;

export const typography = {
  display: { fontFamily: fonts.heading, fontSize: 34, lineHeight: 39, fontWeight: "700" as const, letterSpacing: -0.7 },
  screenTitle: { fontFamily: fonts.heading, fontSize: 27, lineHeight: 33, fontWeight: "700" as const, letterSpacing: -0.35 },
  sectionTitle: { fontFamily: fonts.heading, fontSize: 20, lineHeight: 26, fontWeight: "700" as const },
  cardTitle: { fontFamily: fonts.bodyBold, fontSize: 16, lineHeight: 21, fontWeight: "700" as const },
  body: { fontFamily: fonts.body, fontSize: 15, lineHeight: 22, fontWeight: "400" as const },
  bodyStrong: { fontFamily: fonts.bodyBold, fontSize: 15, lineHeight: 22, fontWeight: "700" as const },
  secondary: { fontFamily: fonts.body, fontSize: 14, lineHeight: 20, fontWeight: "400" as const },
  caption: { fontFamily: fonts.bodyBold, fontSize: 12, lineHeight: 17, fontWeight: "600" as const }
} as const;

export const iconSizes = { sm: 18, md: 22, lg: 26 } as const;
export const touchTargets = { minimum: 44, comfortable: 48 } as const;

export const shadows = Platform.select({
  ios: {
    card: {
      shadowColor: "#14261D",
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.055,
      shadowRadius: 12
    }
  },
  default: { card: { elevation: 2 } }
})!;
