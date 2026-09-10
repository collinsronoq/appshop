import { Platform } from "react-native";

export const colors = {
  background: "#F7F4ED",
  surface: "#FFFFFF",
  primary: "#245A43",
  primaryPressed: "#194431",
  primarySubtle: "#DFEADF",
  text: "#14261D",
  textSecondary: "#647269",
  border: "#E3E1DA",
  borderStrong: "#B7C4BB",
  warning: "#9A5B13",
  warningSurface: "#FFF3D6",
  danger: "#A33A32",
  dangerSurface: "#F9EAE7",
  success: "#32734E",
  disabled: "#AAB2AD",
  tabInactive: "#717B75"
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
  sm: 8,
  md: 12,
  lg: 16,
  round: 999
} as const;

export const typography = {
  display: { fontSize: 30, lineHeight: 36, fontWeight: "800" as const },
  screenTitle: { fontSize: 26, lineHeight: 32, fontWeight: "800" as const },
  sectionTitle: { fontSize: 18, lineHeight: 23, fontWeight: "700" as const },
  cardTitle: { fontSize: 16, lineHeight: 21, fontWeight: "700" as const },
  body: { fontSize: 15, lineHeight: 21, fontWeight: "400" as const },
  bodyStrong: { fontSize: 15, lineHeight: 21, fontWeight: "700" as const },
  secondary: { fontSize: 14, lineHeight: 19, fontWeight: "400" as const },
  caption: { fontSize: 12, lineHeight: 16, fontWeight: "500" as const }
} as const;

export const iconSizes = { sm: 18, md: 22, lg: 26 } as const;
export const touchTargets = { minimum: 44, comfortable: 48 } as const;

export const shadows = Platform.select({
  ios: {
    card: {
      shadowColor: "#14261D",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.05,
      shadowRadius: 8
    }
  },
  default: { card: { elevation: 1 } }
})!;
