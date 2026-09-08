import AsyncStorage from "@react-native-async-storage/async-storage";

const KEY = "household-shopping.selected-household-id";
export const selectedHouseholdStorage = {
  get: () => AsyncStorage.getItem(KEY),
  set: (id: string) => AsyncStorage.setItem(KEY, id),
  remove: () => AsyncStorage.removeItem(KEY)
};
