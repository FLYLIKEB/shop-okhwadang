import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts',
    css: false,
    pool: 'forks',
    maxWorkers: 1,
    fileParallelism: false,
    // .omx contains local audit probes that assert historical bugs; maintained regressions live in src.
    exclude: ['backend/**', 'node_modules/**', '.next/**', '.claude/**', '.codex/**', '.omx/**', '.worktrees/**'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'lcov', 'json-summary'],
      reportsDirectory: './coverage',
      thresholds: {
        statements: 70,
        branches: 60,
        functions: 60,
        lines: 70,
      },
      exclude: [
        'src/test/**',
        '**/*.config.*',
        '**/*.d.ts',
      ],
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
