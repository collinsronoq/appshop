module.exports = {
  preset: "jest-expo",
  testMatch: ["**/?(*.)+(spec|test).[jt]s?(x)"],
  moduleNameMapper: {
    "^@expo/vector-icons/Feather$": "<rootDir>/src/test/vector-icons-mock.tsx",
    "^expo-modules-core(.*)$": "<rootDir>/node_modules/expo/node_modules/expo-modules-core$1"
  }
};
