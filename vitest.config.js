import path from 'node:path';
import { defineConfig } from 'vitest/config';

// Separate from vite.config.js so tests do not load the editor plugins.
export default defineConfig({
  resolve: {
    alias: { '@': path.resolve(import.meta.dirname, './src') },
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.{js,jsx,ts}'],
    env: { TZ: 'UTC' },
  },
});
