import { defineConfig } from 'vitest/config';
import { resolve } from 'path';
import tsconfigPaths from 'vite-tsconfig-paths';

export default defineConfig({
  plugins: [tsconfigPaths()],
  esbuild: {
    jsx: 'automatic',
  },
  test: {
    environment: 'happy-dom',
    globals: true,
    setupFiles: ['./test/setup.ts'],
    exclude: [
      '**/node_modules/**',
      '**/dist/**',
      '**/.next/**',
      '**/*.spec.ts' // Exclude Playwright E2E tests
    ],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'text-summary'],
      exclude: [
        'node_modules/',
        'test/',
        'dist/',
        'dist-*/',
        '.next/',
        'coverage/',
        '**/*.config.*',
        '**/*.d.ts',
        '**/types/**',
        'scripts/**',
        'netlify/functions/**',
        '**/*.spec.ts' // Also exclude from coverage
      ],
      thresholds: {
        global: {
          branches: 70,
          functions: 70,
          lines: 70,
          statements: 70,
        },
      },
      include: [
        'packages/*/src/**/*.{ts,tsx,js,jsx}',
        'src/**/*.{ts,tsx,js,jsx}',
      ],
    },
    pool: 'forks',
    poolOptions: {
      forks: {
        singleFork: true,
      },
    },
  },
  resolve: {
    alias: {
      '@shared': resolve(__dirname, 'packages/shared'),
      '@extension': resolve(__dirname, 'packages/extension'),
      '@web': resolve(__dirname, 'packages/web'),
      '@/': resolve(__dirname, 'packages/web/src/'), // Add @/ alias for web package
    },
  },
});