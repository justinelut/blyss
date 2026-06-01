import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import tsconfigPaths from 'vite-tsconfig-paths'

/**
 * Vitest config for the Blyss web client.
 *
 * - tsconfigPaths resolves the `@/*` alias (baseUrl: src/) the same way Next does.
 * - jsdom environment + jest-dom matchers for component tests.
 * - setup file registers @testing-library/jest-dom.
 */
export default defineConfig({
  plugins: [tsconfigPaths(), react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./vitest.setup.ts'],
    include: ['src/**/*.{test,property.test}.{ts,tsx}'],
    css: false,
  },
})
