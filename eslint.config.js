const { FlatCompat } = require('@eslint/eslintrc');
const importPlugin = require('eslint-plugin-import');

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

module.exports = [
  {
    ignores: [
      '.next/**',
      'eslint.config.js',
      'node_modules/**',
      'playwright-report/**',
      'test-results/**',
    ],
  },
  ...compat.extends('next/core-web-vitals', 'next/typescript'),
  {
    plugins: {
      import: importPlugin,
    },
    rules: {
      'import/order': [
        'error',
        {
          alphabetize: {
            order: 'asc',
            caseInsensitive: true,
          },
          groups: [
            'builtin',
            'external',
            'internal',
            ['parent', 'sibling', 'index'],
            'object',
            'type',
          ],
          'newlines-between': 'always',
        },
      ],
    },
  },
  {
    files: ['tests/**/*.ts'],
    rules: {
      'import/order': 'off',
    },
  },
];
