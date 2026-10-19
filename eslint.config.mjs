// @ts-check
import js from '@eslint/js';
import { defineConfig } from 'eslint/config';
import tseslint from 'typescript-eslint';

export default defineConfig(
  {
    ignores: [
      'dist/**',
      'coverage/**',
      'node_modules/**',
      // Generated tsc build output (tsconfig outDir) — lint the sources in src/ instead.
      'scripts/**',
      'cypress/screenshots/**',
      'cypress/videos/**',
    ],
  },
  {
    files: ['**/*.{js,ts}'],
    extends: [
        js.configs.recommended,
        tseslint.configs.recommended,
        tseslint.configs.strict,
        tseslint.configs.stylistic,
    ],
    rules: {
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      '@typescript-eslint/consistent-type-imports': 'warn',
      'no-console': 'warn',
    },
  },
  {
    // CLI scripts: printing to stdout/stderr is their output channel.
    files: ['misc/scripts/**/*.ts'],
    rules: { 'no-console': 'off' },
  },
  {
    // Specs capture and assert on console output (e.g. console.error spies).
    files: ['tests/**/*.ts', 'cypress/**/*.ts'],
    rules: { 'no-console': 'off' },
  },
  {
    // Cypress specs use chai property assertions (expect(x).to.exist),
    // which are expressions by design.
    files: ['cypress/**/*.ts'],
    rules: { '@typescript-eslint/no-unused-expressions': 'off' },
  },
);
