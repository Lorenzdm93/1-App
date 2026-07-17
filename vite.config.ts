import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// base './' makes every asset link relative, so the app works at
// https://<user>.github.io/<any-repo-name>/ without configuration.
export default defineConfig({
  base: './',
  plugins: [react()],
  build: { target: 'es2020' },
})
