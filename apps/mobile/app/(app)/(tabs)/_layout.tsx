import Feather from "@expo/vector-icons/Feather";
import { Tabs } from "expo-router";
import type { ComponentProps } from "react";
import { StyleSheet, View } from "react-native";

import { colors, typography } from "../../../src/design/theme";
import { TAB_ITEMS } from "../../../src/navigation/tabs";

function TabIcon({ name, color, focused }: { name: (typeof TAB_ITEMS)[number]["icon"]; color: ComponentProps<typeof Feather>["color"]; focused: boolean }) {
  return <View style={[styles.icon, focused ? styles.activeIcon : null]}><Feather color={color} name={name} size={20} /></View>;
}

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.tabInactive,
        tabBarHideOnKeyboard: true,
        tabBarLabelStyle: { ...typography.caption, fontWeight: "600" },
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
          borderTopWidth: 1,
          minHeight: 68,
          paddingTop: 7
        }
      }}
    >
      <Tabs.Screen name="index" options={{ title: "Home", tabBarAccessibilityLabel: "Home tab", tabBarIcon: ({ color, focused }) => <TabIcon color={color} focused={focused} name="home" /> }} />
      <Tabs.Screen name="lists" options={{ title: "Lists", tabBarAccessibilityLabel: "Lists tab", tabBarIcon: ({ color, focused }) => <TabIcon color={color} focused={focused} name="list" /> }} />
      <Tabs.Screen name="products" options={{ title: "Products", tabBarAccessibilityLabel: "Products tab", tabBarIcon: ({ color, focused }) => <TabIcon color={color} focused={focused} name="package" /> }} />
      <Tabs.Screen name="history" options={{ title: "History", tabBarAccessibilityLabel: "History tab", tabBarIcon: ({ color, focused }) => <TabIcon color={color} focused={focused} name="clock" /> }} />
      <Tabs.Screen name="profile" options={{ title: "Profile", tabBarAccessibilityLabel: "Profile tab", tabBarIcon: ({ color, focused }) => <TabIcon color={color} focused={focused} name="user" /> }} />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  icon: { width: 36, height: 28, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  activeIcon: { backgroundColor: colors.primarySubtle }
});
