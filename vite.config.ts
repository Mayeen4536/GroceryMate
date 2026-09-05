import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'prompt',
      // Registration happens through `PWAUpdatePrompt.tsx`'s `useRegisterSW()` call,
      // not an auto-injected script — this makes that ownership explicit.
      injectRegister: false,
      includeAssets: ['favicon.svg'],
      manifest: {
        id: '/',
        name: 'GroceryMate',
        short_name: 'GroceryMate',
        description: 'Split groceries fairly with your household — track spending, settle up, and keep living simple.',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        background_color: '#faf8f5',
        theme_color: '#faf8f5',
        categories: ['finance', 'lifestyle', 'productivity'],
        icons: [
          { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          { src: 'maskable-icon-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        // The whole app is a self-contained bundle with no external API/CDN calls (no
        // backend, fonts ship as local build assets), so precaching every built asset
        // is sufficient for full offline support — no runtime caching rules needed.
        globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
        // Inter Variable ships 7 unicode-range subsets; the UI is English-only, so
        // only latin/latin-ext ever render. Precaching the rest would roughly double
        // the font payload with Cyrillic/Greek/Vietnamese glyphs no one will use.
        globIgnores: ['**/inter-{cyrillic,cyrillic-ext,greek,greek-ext,vietnamese}-*.woff2'],
        navigateFallback: 'index.html',
        cleanupOutdatedCaches: true,
      },
      devOptions: {
        // Keep dev mode always fresh; PWA behavior (offline, install, caching) is
        // verified against the production build via `npm run build && npm run preview`.
        enabled: false,
      },
    }),
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  test: {
    // jsdom (not the previous 'node') so component/hook tests that need a
    // DOM — @testing-library/react's renderHook/render — can run; plain
    // logic tests are unaffected by the extra DOM globals.
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.test.ts', 'src/**/*.test.tsx'],
  },
})
