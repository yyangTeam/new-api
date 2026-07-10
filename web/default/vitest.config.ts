import path from 'node:path'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  test: {
    globals: true,
    environment: 'happy-dom',
    setupFiles: ['./src/test/setup.ts'],
    css: false,
    include: ['src/**/*.test.{ts,tsx}'],
    coverage: {
      provider: 'v8',
      include: ['src/**/*.{ts,tsx}'],
      exclude: [
        'src/test/**',
        'src/routeTree.gen.ts',
        'src/env.d.ts',
        'src/tanstack-table.d.ts',
        'src/main.tsx',
        'src/routes/**',
        'src/i18n/locales/**',
        'src/i18n/static-keys.ts',
        'src/styles/**',
        'src/assets/**',
      ],
      reporter: ['text', 'lcov', 'html'],
      reportsDirectory: './coverage',
    },
  },
})
