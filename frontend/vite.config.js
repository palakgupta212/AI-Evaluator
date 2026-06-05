import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': {
        target: 'http://192.168.31.154:8080',
        changeOrigin: true,
      },
    },
    port: 5173,
  },
});
