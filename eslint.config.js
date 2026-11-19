import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  // Original fall JSX is retained for reference; generated/vendor/local files are not project source.
  globalIgnores([
    'dist/**', 'public/**', 'raw_assets/**',
    '.tmp/**', '.sites-runtime/**', '.workbuddy/**',
    'src/Experience/models/Scene_4_Fall.jsx',
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
