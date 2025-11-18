module.exports = {
  extends: ['@react-native'],
  plugins: ['@react-native/eslint-plugin-specs'],
  rules: {
    'react-native/no-inline-styles': 'off',
    '@react-native/specs/react-native-modules': 'error',
  },
  overrides: [
    {
      files: ['**/__tests__/**/*.[jt]s?(x)', '**/?(*.)+(spec|test).[jt]s?(x)'],
      extends: ['plugin:testing-library/react'],
    },
  ],
};