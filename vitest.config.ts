import { defineConfig } from 'vitest/config';
import { resolve } from 'path';

export default defineConfig({
  test: {
    environment: 'happy-dom',
    globals: true,
    setupFiles: ['./test/setup.ts'],
    coverage: {
      reporter: ['text', 'json', 'html'],
      exclude: ['node_modules/', 'test/', 'dist/', '**/*.config.*'],
    },
  },
  resolve: {
    alias: {
      '@shared': resolve(__dirname, 'packages/shared'),
      '@extension': resolve(__dirname, 'packages/extension'),
      '@web': resolve(__dirname, 'packages/web'),
    },
  },
});