import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Relative base so the built assets resolve correctly whether served from
// a GitHub Pages project subpath (https://user.github.io/HomeInventory/)
// or any other path.
export default defineConfig({
  base: './',
  plugins: [react()],
})
