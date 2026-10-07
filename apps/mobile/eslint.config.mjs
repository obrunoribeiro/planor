import globals from 'globals';
import reactNative from '@planor/config/eslint/react-native';

export default [
  ...reactNative,
  {
    ignores: ['.expo/**', 'expo-env.d.ts'],
  },
  {
    // babel.config.js e metro.config.js são CommonJS de verdade — Babel/Metro ainda esperam
    // esse formato, independentemente do resto do pacote usar ESM.
    files: ['babel.config.js', 'metro.config.js'],
    languageOptions: {
      sourceType: 'commonjs',
      globals: { ...globals.node },
    },
    rules: {
      '@typescript-eslint/no-require-imports': 'off',
    },
  },
];
