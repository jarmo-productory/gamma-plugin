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
        atob: 'readonly',
        btoa: 'readonly',
        CustomEvent: 'readonly',
        sessionStorage: 'readonly',
        URLSearchParams: 'readonly',
        alert: 'readonly',
        __BUILD_ENV__: 'readonly',
        React: 'readonly',
        HTMLButtonElement: 'readonly',
        HTMLInputElement: 'readonly',
        HTMLTextAreaElement: 'readonly',
        HTMLHeadingElement: 'readonly',
        HTMLParagraphElement: 'readonly',
        KeyboardEvent: 'readonly',
        HTMLElement: 'readonly',
        Event: 'readonly',
        crypto: 'readonly',
      },
    },
    plugins: {
      '@typescript-eslint': typescript,
    },
    rules: {
      // Enforce Supabase-only auth: forbid any Clerk imports
      'no-restricted-imports': [
        'error',
        {
          patterns: ['@clerk/*']
        }
      ],
      ...typescript.configs.recommended.rules,
      // Security: Allow only error/warn console statements
      // TypeScript specific
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      '@typescript-eslint/no-explicit-any': 'off', // Allow any types for flexibility
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
      
      // Sprint 19 Security: Prevent direct device_tokens table access
      'no-restricted-syntax': [
        'error',
        {
          selector: "CallExpression[callee.property.name='from'][arguments.0.value='device_tokens']",
          message: 'Direct device_tokens table access forbidden. Use secureTokenStore RPC functions instead.'
        }
      ],
      
      // TypeScript security
      '@typescript-eslint/no-unsafe-assignment': 'off', // Allow for flexibility
      '@typescript-eslint/no-unsafe-call': 'off',
      '@typescript-eslint/no-unsafe-member-access': 'off',
    },
  },
  {
    files: ['**/*.test.ts', '**/*.test.js', 'test/**/*.ts', 'tests/**/*.js', 'tests/**/*.ts'],
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
      'no-console': 'off',
      '@typescript-eslint/no-explicit-any': 'off',
    },
  },
  {
    files: ['tests/performance/**/*.js'],
    languageOptions: {
      globals: {
        __ENV: 'readonly',
        __VU: 'readonly',
        __ITER: 'readonly',
        TextEncoder: 'readonly',
        encoding: 'readonly',
        console: 'readonly',
      },
    },
    rules: {
      '@typescript-eslint/no-unused-vars': 'off',
      'no-undef': 'off',
      'no-console': 'off',
      '@typescript-eslint/no-require-imports': 'off',
    },
  },
  {
    files: ['e2e-*.js', '**/e2e/**/*.js'],
    rules: {
      'no-console': 'off',
      '@typescript-eslint/no-require-imports': 'off',
      '@typescript-eslint/no-unused-vars': 'off',
    },
  },
  {
    files: ['netlify/functions/**/*.ts', 'netlify/functions/**/*.js'],
    rules: {
      'no-console': 'off', // Netlify functions need console logging
      '@typescript-eslint/no-require-imports': 'off', // CommonJS imports needed for Netlify
    },
  },
  {
    files: [
      'src/**/*.js', 
      'src/**/*.ts', 
      'packages/extension/**/*.js', 
      'packages/extension/**/*.ts'
    ],
    rules: {
      'no-console': 'off', // Extension and debug scripts need console logging
      '@typescript-eslint/no-require-imports': 'off',
    },
  },
  {
    files: [
      'tailwind.config.js', 
      'vite.config.ts', 
      'next.config.ts', 
      '*.config.js'
    ],
    rules: {
      '@typescript-eslint/no-require-imports': 'off', // Config files often use require
    },
  },
  {
    files: [
      'packages/shared/**/*.ts',
      'packages/shared/**/*.js',
      'packages/shared/ui/examples.tsx',
      'packages/web/**/*.js',
      'simple-console-test.js'
    ],
    rules: {
      'no-console': 'off', // Shared library and test files need console logging
      '@typescript-eslint/no-require-imports': 'off',
      'no-alert': 'off', // Allow alerts in test/debug files
    },
  },
  {
    files: [
      '**/api/debug/**/*.ts',
      '**/api/test-*/*.ts',
      'packages/web/src/utils/tokenStore.ts' // Legacy file marked as deprecated
    ],
    rules: {
      'no-restricted-syntax': 'off', // Allow direct database access in debug/test files
      'no-console': 'off', // Debug files need console logging
    },
  },
  
  {
    ignores: [
      'dist/**',
      'dist-*/**',
      'dist-web/**',
      'dist-shared/**',
      '.netlify/**',
      'packages/**/.netlify/**',
      'packages/**/node_modules/**',
      'node_modules/**',
      '**/*.min.js',
      '**/xlsx.full.min.js',
      'src/lib/xlsx.full.min.js',
      '**/*.generated.*',
      '**/.next/**',
      'playwright-report/**',
      'test-results/**',
      'coverage/**',
      'packages/web/src/main-legacy.js', // Legacy file with syntax errors
      'packages/web/src/main-old.js', // Legacy file with issues
      'packages/web/src/main-clerk-sdk.js', // Legacy file with unused vars
      'packages/extension/scripts/**/*.js', // Extension scripts
    ],
  },
  prettier,
];
