import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'

export default defineConfig(({ mode }) => ({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  // Railway 배포용 base path
  base: '/',
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3001',  // 개발 시에는 로컬 PHP 서버 또는 실제 서버 주소로 변경
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    // 기본 esbuild 미니파이어 사용 (terser보다 빠름)
    minify: 'esbuild',
    rollupOptions: {
      output: {
        manualChunks: {
          // 벤더 청크 분리 - 캐싱 효율성 향상
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          'vendor-ui': ['framer-motion', 'lucide-react'],
          'vendor-data': ['zustand', '@tanstack/react-query'],
          'vendor-dnd': ['@dnd-kit/core', '@dnd-kit/sortable', '@dnd-kit/utilities'],
          'vendor-date': ['date-fns'],
        },
      },
    },
    cssCodeSplit: true,
    chunkSizeWarningLimit: 500,
    // 소스맵 비활성화 (프로덕션 빌드 크기 감소)
    sourcemap: mode !== 'production',
  },
  // esbuild 설정으로 console 제거
  esbuild: mode === 'production' ? {
    drop: ['console', 'debugger'],
  } : undefined,
}))
