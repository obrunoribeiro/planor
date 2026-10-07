// ESLint para pacotes Node (apps/api, packages/db).
import globals from 'globals';
import { base } from './base.js';

export default [
  ...base,
  {
    languageOptions: {
      globals: { ...globals.node },
    },
  },
];
