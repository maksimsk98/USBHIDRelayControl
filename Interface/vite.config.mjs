import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import svgr from 'vite-plugin-svgr';
import { nodePolyfills } from 'vite-plugin-node-polyfills';

// Node built-ins (buffer/stream/process/assert) are required by bundled
// Node-oriented deps (xlsx, pdfmake, html-to-docx, docx); the polyfills
// plugin replaces the resolve.fallback + ProvidePlugin block from the
// old craco.config.js.
export default defineConfig({
  base: './',
  plugins: [
    react(),
    svgr(),
    nodePolyfills(),
  ],
  build: {
    // The Express server (src/server/server.js) serves static files from
    // cwd/build, and scripts/prepare-dist.js copies build/; dist/ and
    // dist-all/ are taken by electron packaging.
    outDir: 'build',
    // src/services/axiosConfig.js uses top-level await; the app targets
    // Electron 38 (Chrome 140), es2022 is safely below that.
    target: 'es2022',
  },
  server: {
    port: 3000,
    strictPort: true, // electron main.js and playwright expect :3000
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
      },
    },
  },
});
