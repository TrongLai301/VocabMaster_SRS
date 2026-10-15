import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: true, // Lắng nghe trên 0.0.0.0 để tạo URL Network (truy cập từ điện thoại / máy khác trong LAN)
    port: 5173,
  },
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, './src'),
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id: string) {
          if (
            id.includes('node_modules/react/') ||
            id.includes('node_modules/react-dom/') ||
            id.includes('node_modules/react-router-dom/')
          ) {
            return 'vendor';
          }
          if (id.includes('node_modules/framer-motion')) {
            return 'motion';
          }
          if (id.includes('node_modules/@supabase')) {
            return 'supabase';
          }
          if (
            id.includes('node_modules/lucide-react') ||
            id.includes('node_modules/sonner')
          ) {
            return 'ui';
          }
        },
      },
    },
    chunkSizeWarningLimit: 1000,
  },
});
