import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  base: './',

  resolve: {
    alias: {
      'three': path.resolve(__dirname, 'node_modules/three')
    }
  },
  build: {
    // 可选：为了防止 Three.js 包过大，警告阈值调高一点
    chunkSizeWarningLimit: 1000,
  }
})
