// Base ESLint (flat config, ESLint 9) compartilhada por todo o monorepo.
// Pacotes específicos (Node, React Native) estendem esse array e acrescentam o próprio bloco.
import js from '@eslint/js';
import prettier from 'eslint-config-prettier';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export const base = tseslint.config(
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    languageOptions: {
      globals: { ...globals.es2022 },
    },
    rules: {
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
      '@typescript-eslint/consistent-type-imports': 'warn',
      'no-console': ['warn', { allow: ['warn', 'error'] }],
    },
  },
  prettier,
  {
    ignores: ['dist/**', 'build/**', '.expo/**', 'node_modules/**', '.turbo/**'],
  },
);

export default base;
