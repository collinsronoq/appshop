import Feather from "@expo/vector-icons/Feather";
import { Tabs } from "expo-router";
import type { ComponentProps } from "react";

import { colors, iconSizes, typography } from "../../../src/design/theme";
import { TAB_ITEMS } from "../../../src/navigation/tabs";

function TabIcon({ name, color }: { name: (typeof TAB_ITEMS)[number]["icon"]; color: ComponentProps<typeof Feather>["color"] }) {
  return <Feather color={color} name={name} size={iconSizes.md} />;
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
          minHeight: 62,
          paddingTop: 6
        }
      }}
    >
      <Tabs.Screen name="index" options={{ title: "Home", tabBarAccessibilityLabel: "Home tab", tabBarIcon: ({ color }) => <TabIcon color={color} name="home" /> }} />
      <Tabs.Screen name="lists" options={{ title: "Lists", tabBarAccessibilityLabel: "Lists tab", tabBarIcon: ({ color }) => <TabIcon color={color} name="list" /> }} />
      <Tabs.Screen name="products" options={{ title: "Products", tabBarAccessibilityLabel: "Products tab", tabBarIcon: ({ color }) => <TabIcon color={color} name="package" /> }} />
      <Tabs.Screen name="history" options={{ title: "History", tabBarAccessibilityLabel: "History tab", tabBarIcon: ({ color }) => <TabIcon color={color} name="clock" /> }} />
      <Tabs.Screen name="profile" options={{ title: "Profile", tabBarAccessibilityLabel: "Profile tab", tabBarIcon: ({ color }) => <TabIcon color={color} name="user" /> }} />
    </Tabs>
  );
}
