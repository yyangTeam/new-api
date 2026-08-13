import path from 'node:path'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      // Some tests were authored against Node's native test runner API
      // (hooks like `before`/`after`, `node:test` specifiers) or bun:test.
      // Vitest exposes a compatible surface via this shim.
      'node:test': path.resolve(__dirname, './src/test/node-test-shim.ts'),
      'bun:test': path.resolve(__dirname, './src/test/node-test-shim.ts'),
    },
  },
  test: {
    globals: true,
    environment: 'happy-dom',
    // happy-dom attempts to fetch iframe/script/css content during renders.
    // On CI (public network) it really fetches example.com (custom-home /
    // about iframes, telegram/turnstile scripts), and the retained async
    // tasks accumulate across files until the worker heap-exhausts (~4GB,
    // OOM). Blocking these loads (key is `happyDOM` camelCase, NOT
    // 'happy-dom' — vitest's happy-dom env destructures { happyDOM }) keeps
    // the worker heap flat.
    environmentOptions: {
      happyDOM: {
        settings: {
          disableIframePageLoading: true,
          disableJavaScriptFileLoading: true,
          disableCSSFileLoading: true,
          navigation: {
            disableChildFrameNavigation: true,
            disableMainFrameNavigation: true,
          },
        },
      },
    },
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
      thresholds: {
        lines: 35,
        functions: 30,
        branches: 30,
        statements: 35,
      },
    },
  },
})
