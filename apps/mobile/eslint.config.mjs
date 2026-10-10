import globals from 'globals';
import reactNative from '@planor/config/eslint/react-native';

export default [
  ...reactNative,
  {
    ignores: ['.expo/**', 'expo-env.d.ts'],
  },
  {
    // babel.config.js, metro.config.js e os config plugins do Expo (plugins/) são CommonJS de
    // verdade — Babel, Metro e o prebuild ainda esperam esse formato, independentemente do resto
    // do pacote usar ESM.
    files: ['babel.config.js', 'metro.config.js', 'plugins/**/*.js'],
    languageOptions: {
      sourceType: 'commonjs',
      globals: { ...globals.node },
    },
    rules: {
      '@typescript-eslint/no-require-imports': 'off',
    },
  },
];
