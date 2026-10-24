import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import path from 'path'
import { fileURLToPath } from 'url'

const dir = path.dirname(fileURLToPath(import.meta.url))

export default defineConfig({
  plugins: [vue()],
  root: dir,
  build: { outDir: path.join(dir, 'dist'), emptyOutDir: true },
  server: {
    host: '0.0.0.0',
    port: 5174,
    proxy: { '/api': 'http://127.0.0.1:4174', '/uploads': 'http://127.0.0.1:4174' },
  },
})
