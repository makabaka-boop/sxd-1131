import { defineConfig } from 'vite';

export default defineConfig({
  server: {
    port: 8831,
    proxy: {
      '/api': {
        target: 'http://localhost:8031',
        changeOrigin: true
      }
    }
  },
  build: {
    outDir: 'dist'
  }
});
