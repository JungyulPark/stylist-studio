import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    include: ['src/**/*.test.{ts,tsx}', 'functions/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      exclude: ['node_modules/', 'dist/', 'src/test/'],
    },
    // Use different environments for different test types
    environmentMatchGlobs: [
      // Frontend tests use jsdom
      ['src/**/*.test.{ts,tsx}', 'jsdom'],
      // Backend/functions tests use node environment
      ['functions/**/*.test.ts', 'node'],
    ],
    // Default environment for tests not matching above patterns
    environment: 'node',
  },
})
