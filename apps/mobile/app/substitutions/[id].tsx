import { useLocalSearchParams } from "expo-router";

import { SubstitutionDetailScreen } from "../../src/screens/substitution-detail-screen";

export default function SubstitutionDetailRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <SubstitutionDetailScreen id={id} />;
}
