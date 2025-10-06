import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0', // 外部アクセスを許可
    port: 5173,
    proxy: {
      '/ws': {
        target: 'ws://192.168.3.39:8080',
        ws: true,
        changeOrigin: true,
        secure: false, // 自己署名証明書を許可
      },
    },
  },
})
