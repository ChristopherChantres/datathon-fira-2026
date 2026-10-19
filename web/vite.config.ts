import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [react()],
  build: {
    target: 'es2020',
    sourcemap: false,
    rollupOptions: {
      output: {
        // Large libraries in their own long-cached chunks.
        manualChunks(id) {
          if (!id.includes('node_modules')) return undefined;
          if (id.includes('/gsap/')) return 'gsap';
          if (id.includes('/katex/')) return 'katex';
          if (/\/(react|react-dom|scheduler)\//.test(id)) return 'react';
          if (/\/d3-[a-z]+\//.test(id)) return 'd3';
          return 'vendor';
        },
      },
    },
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
});
