import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const apiBaseUrl = env.VITE_API_BASE_URL || 'http://127.0.0.1:3002/api'
  const proxyTarget = apiBaseUrl.startsWith('http')
    ? new URL(apiBaseUrl).origin
    : 'http://127.0.0.1:3002'

  return {
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
          target: proxyTarget,
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
  }
})
