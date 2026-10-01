import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],
  server: {
    // Fleetra (the chat API) runs as a separate service. Forwarding it here
    // keeps the browser on ONE origin in development: no CORS, and the
    // requests work the same through a VS Code forwarded URL or from another
    // device on the LAN. A deployed build calls VITE_FLEETRA_URL instead.
    proxy: {
      "/fleetra": {
        target: process.env.FLEETRA_URL || "http://127.0.0.1:8088",
        changeOrigin: true,
        // Fleetra streams its replies; don't let the proxy sit on them.
        configure: (proxy) => {
          proxy.on("proxyRes", (proxyRes) => {
            delete proxyRes.headers["content-encoding"];
            proxyRes.headers["cache-control"] = "no-cache, no-transform";
          });
        },
      },
    },
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