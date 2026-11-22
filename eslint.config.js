import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  // Generated, vendor and local files are not project source.
  globalIgnores([
    'dist/**', 'public/**', 'assets/**',
    '.tmp/**', '.sites-runtime/**', '.workbuddy/**',
  ]),
  {
    files: ['src/**/*.{js,jsx}', 'blog/assets/js/**/*.js'],
    extends: [
      js.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
      parserOptions: {
        ecmaVersion: 'latest',
        ecmaFeatures: { jsx: true },
        sourceType: 'module',
      },
    },
    rules: {
      'no-unused-vars': ['error', { varsIgnorePattern: '^[A-Z_]' }],
    },
  },
  {
    files: ['scripts/**/*.{js,mjs}', 'tests/**/*.mjs', '*.config.js'],
    extends: [js.configs.recommended],
    languageOptions: { globals: globals.node },
  },
])
