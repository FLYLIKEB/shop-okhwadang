import { dirname } from 'path';
import { fileURLToPath } from 'url';
import { FlatCompat } from '@eslint/eslintrc';
import eslintPluginImport from 'eslint-plugin-import';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  {
    ignores: ['backend/**', '.next/**'],
  },
  ...compat.extends('next/core-web-vitals', 'next/typescript'),
  {
    plugins: {
      import: eslintPluginImport,
    },
    rules: {
      'no-console': 'error',
      'import/no-restricted-paths': [
        'error',
        {
          zones: [
            {
              target: 'src/components/shared/**',
              from: 'src/components/ko/**',
              message: 'shared/ cannot import from ko/. Use shared/ components or create locale-specific components in ko/.',
            },
            {
              target: 'src/components/shared/**',
              from: 'src/components/en/**',
              message: 'shared/ cannot import from en/. Use shared/ components or create locale-specific components in en/.',
            },
            {
              target: 'src/components/ko/**',
              from: 'src/components/en/**',
              message: 'ko/ cannot import from en/. Locales should be independent.',
            },
            {
              target: 'src/components/en/**',
              from: 'src/components/ko/**',
              message: 'en/ cannot import from ko/. Locales should be independent.',
            },
          ],
        },
      ],
    },
  },
];

export default eslintConfig;
