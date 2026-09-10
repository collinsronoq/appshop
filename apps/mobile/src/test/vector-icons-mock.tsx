import { Text } from "react-native";

export default function Feather({ name }: { name: string }) {
  return <Text accessibilityElementsHidden>{name}</Text>;
}
