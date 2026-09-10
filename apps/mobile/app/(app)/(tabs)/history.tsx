import Feather from "@expo/vector-icons/Feather";
import { useRouter } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { AppHeader, AppScreen, SurfaceCard } from "../../../src/design/components";
import { colors, iconSizes, radius, spacing, typography } from "../../../src/design/theme";

const destinations = [
  { title: "Purchases", body: "View everything the household has bought.", icon: "shopping-bag" as const, href: "/purchases" as const },
  { title: "Purchasing memory", body: "See recently and frequently purchased products.", icon: "repeat" as const, href: "/purchasing-memory" as const }
];

export default function HistoryScreen() {
  const router = useRouter();
  return (
    <AppScreen>
      <AppHeader title="History" subtitle="Your household’s completed shopping activity." />
      <View style={styles.list}>
        {destinations.map((item) => (
          <Pressable accessibilityRole="button" key={item.title} onPress={() => router.push(item.href)} style={({ pressed }) => pressed ? styles.pressed : undefined}>
            <SurfaceCard style={styles.card}>
              <View style={styles.icon}><Feather color={colors.primary} name={item.icon} size={iconSizes.md} /></View>
              <View style={styles.copy}><Text style={styles.title}>{item.title}</Text><Text style={styles.body}>{item.body}</Text></View>
              <Feather color={colors.textSecondary} name="chevron-right" size={iconSizes.md} />
            </SurfaceCard>
          </Pressable>
        ))}
      </View>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  list: { gap: spacing.md, marginTop: spacing.md },
  card: { minHeight: 92, flexDirection: "row", alignItems: "center", gap: spacing.md },
  icon: { width: 44, height: 44, alignItems: "center", justifyContent: "center", borderRadius: radius.md, backgroundColor: colors.primarySubtle },
  copy: { flex: 1 },
  title: { ...typography.cardTitle, color: colors.text },
  body: { ...typography.secondary, color: colors.textSecondary, marginTop: spacing.xs },
  pressed: { opacity: 0.78 }
});
