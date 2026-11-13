import { defineConfig } from 'vitest/config'

// Le moteur est du TypeScript pur : on le teste sans Nuxt.
export default defineConfig({
  test: {
    include: ['engine/**/*.test.ts'],
  },
})
