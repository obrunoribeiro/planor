import node from '@planor/config/eslint/node';

export default [
  ...node,
  {
    // Scripts de CLI — console.log aqui é a própria interface com quem roda o comando.
    files: ['src/migrate.ts', 'src/seed.ts'],
    rules: {
      'no-console': 'off',
    },
  },
];
