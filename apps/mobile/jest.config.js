module.exports = {
  preset: "jest-expo",
  testMatch: ["**/?(*.)+(spec|test).[jt]s?(x)"],
  moduleNameMapper: {
    "^@expo/vector-icons/Feather$": "<rootDir>/src/test/vector-icons-mock.tsx"
  }
};
