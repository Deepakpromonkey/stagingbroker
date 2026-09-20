import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],
  // FRONTEND_URL on the API points shareable links (public tracking,
  // invitations, carrier-connect) at this machine's LAN IP rather than
  // localhost — so links work on a phone or another device on the same
  // network, not just this machine's own browser. Vite only binds to
  // localhost by default; without this, a link built from that LAN IP
  // never reaches the dev server at all, connection refused/timeout,
  // regardless of what the URL itself looks like.
  server: {
    host: true,
  },
  resolve: {
        alias: {
            "@": path.resolve(__dirname, "./src"),
            "actions": path.resolve(__dirname, "./src/actions"),
            "api": path.resolve(__dirname, "./src/api"),
            "pages": path.resolve(__dirname, "./src/pages"),
            "assets": path.resolve(__dirname, "./src/assets"),
            "components": path.resolve(__dirname, "./src/components"),
            "helpers": path.resolve(__dirname, "./src/helpers"),
            "lib": path.resolve(__dirname, "./src/lib"),
        }
    },
})