import { dirname } from 'path';
import { fileURLToPath } from 'url';
import { FlatCompat } from '@eslint/eslintrc';
import tseslint from 'typescript-eslint';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = tseslint.configs.recommended;

export default [
  {
    ignores: ['backend/**', '.next/**', 'src/test/**'],
  },
  ...eslintConfig,
  ...compat.extends('next/core-web-vitals'),
  {
    rules: {
      'no-console': 'error',
      '@typescript-eslint/no-unused-vars': 'off',
    },
  },
];
