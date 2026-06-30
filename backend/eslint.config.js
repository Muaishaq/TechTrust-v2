/**
 * @file        eslint.config.js
 * @description ESLint flat config for the TechTrust backend
 * @author      Muaishaq
 * @created     2026-06-25
 * @modified    2026-06-25
 */

const js = require('@eslint/js');

/** @type {import('eslint').Linter.Config[]} */
module.exports = [
  js.configs.recommended,
  {
    ignores: ['node_modules/**', 'logs/**', 'coverage/**'],
  },
  {
    files: ['**/*.js'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'commonjs',
      globals: {
        console: 'readonly',
        process: 'readonly',
        __dirname: 'readonly',
        __filename: 'readonly',
        module: 'readonly',
        require: 'readonly',
        exports: 'readonly',
        Buffer: 'readonly',
        setTimeout: 'readonly',
        clearTimeout: 'readonly',
        setInterval: 'readonly',
        clearInterval: 'readonly',
      },
    },
    rules: {
      'no-console': 'warn',
      'no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    },
  },
];
