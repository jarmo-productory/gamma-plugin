import js from '@eslint/js';
import typescript from '@typescript-eslint/eslint-plugin';
import typescriptParser from '@typescript-eslint/parser';
import prettier from 'eslint-config-prettier';

export default [
  js.configs.recommended,
  {
    files: ['**/*.{js,ts,tsx}'],
    languageOptions: {
      parser: typescriptParser,
      parserOptions: {
        ecmaVersion: 2020,
        sourceType: 'module',
      },
      globals: {
        chrome: 'readonly',
        XLSX: 'readonly',
        __APP_VERSION__: 'readonly',
        __BUILD_TARGET__: 'readonly',
        __HAS_CLERK_KEY__: 'readonly',
        console: 'readonly',
        window: 'readonly',
        document: 'readonly',
        setTimeout: 'readonly',
        clearTimeout: 'readonly',
        setInterval: 'readonly',
        clearInterval: 'readonly',
        navigator: 'readonly',
        process: 'readonly',
        __dirname: 'readonly',
        require: 'readonly',
        module: 'readonly',
        HTMLDivElement: 'readonly',
        MutationObserver: 'readonly',
        Blob: 'readonly',
        URL: 'readonly',
        Buffer: 'readonly',
        fetch: 'readonly',
        localStorage: 'readonly',
        location: 'readonly',
      },
    },
    plugins: {
      '@typescript-eslint': typescript,
    },
    rules: {
      ...typescript.configs.recommended.rules,
      // Security: Allow only error/warn console statements
      // TypeScript specific
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/explicit-function-return-type': 'off',
      '@typescript-eslint/explicit-module-boundary-types': 'off',
      // General code quality
      'prefer-const': 'error',
      'no-var': 'error',
      eqeqeq: 'error',
      curly: 'error',
      
      // Security-focused rules
      'no-eval': 'error', // Prevent code injection
      'no-implied-eval': 'error', // Prevent setTimeout/setInterval with strings
      'no-script-url': 'error', // Prevent javascript: URLs
      'no-debugger': 'error', // Remove debugger statements in production
      'no-alert': 'warn', // Discourage alert/confirm/prompt usage
      
      // Prevent sensitive data exposure
      'no-console': ['warn', { allow: ['error', 'warn'] }], // Allow errors/warnings only
      
      // TypeScript security
      '@typescript-eslint/no-unsafe-assignment': 'off', // Allow for flexibility
      '@typescript-eslint/no-unsafe-call': 'off',
      '@typescript-eslint/no-unsafe-member-access': 'off',
    },
  },
  {
    files: ['**/*.test.ts', 'test/**/*.ts'],
    languageOptions: {
      globals: {
        global: 'readonly',
        describe: 'readonly',
        it: 'readonly',
        test: 'readonly',
        expect: 'readonly',
        beforeEach: 'readonly',
        afterEach: 'readonly',
        vi: 'readonly',
      },
    },
    rules: {
      '@typescript-eslint/no-unused-vars': 'off',
      'no-undef': 'off',
    },
  },
  {
    ignores: [
      'dist/**',
      'dist-*/**',
      'dist-web/**',
      'dist-shared/**',
      '.netlify/**',
      'node_modules/**',
      '**/*.min.js',
      'src/lib/xlsx.full.min.js',
    ],
  },
  prettier,
];
