const expo = require('eslint-config-expo/flat');
const prettierPlugin = require('eslint-plugin-prettier');
const prettierConfig = require('eslint-config-prettier');

module.exports = [
  // Expo's recommended flat config (includes @typescript-eslint, react, import)
  ...expo,

  // Prettier must be last to override conflicting formatting rules
  prettierConfig,

  {
    plugins: {
      prettier: prettierPlugin,
    },
    rules: {
      'prettier/prettier': 'error',
      // Disallow `any` without inline justification comment
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    },
  },

  {
    ignores: [
      'node_modules/**',
      '.expo/**',
      'dist/**',
      'babel.config.js',
      'metro.config.js',
      'tailwind.config.js',
      'eslint.config.js',
    ],
  },
];
