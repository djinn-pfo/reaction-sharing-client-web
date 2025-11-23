import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  // 環境変数をロード
  const env = loadEnv(mode, process.cwd(), '')

  console.log(`🚀 Building in ${mode} mode`)

  return {
    plugins: [react()],

    // モード情報を定義
    define: {
      __APP_ENV__: JSON.stringify(mode),
    },

    server: {
      host: '0.0.0.0', // 外部アクセスを許可
      port: 5173,
      proxy: mode === 'development' ? {
        '/ws': {
          target: env.VITE_SIGNALING_URL?.replace('ws://', 'http://') || 'http://192.168.3.39:8080',
          ws: true,
          changeOrigin: true,
          secure: false,
        },
        '/api': {
          target: env.VITE_API_BASE_URL || 'http://192.168.3.39:8080',
          changeOrigin: true,
          secure: false,
        },
      } : undefined,
    },

    build: {
      outDir: mode === 'production' ? 'dist' : 'dist-dev',
      sourcemap: mode === 'development',
      minify: mode === 'production' ? 'esbuild' : false,
      rollupOptions: {
        output: {
          manualChunks: {
            vendor: ['react', 'react-dom', 'react-router-dom'],
            three: ['three', '@react-three/fiber', '@react-three/drei'],
          },
        },
      },
    },
  }
})
