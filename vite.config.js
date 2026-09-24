// import { defineConfig } from 'vite'
// import react from '@vitejs/plugin-react'
// import tailwindcss from '@tailwindcss/vite'
// import path from 'path'

// export default defineConfig({
//   plugins: [
//     react(),
//     tailwindcss(),
//   ],
//   // FRONTEND_URL on the API points shareable links (public tracking,
//   // invitations, carrier-connect) at this machine's LAN IP rather than
//   // localhost — so links work on a phone or another device on the same
//   // network, not just this machine's own browser. Vite only binds to
//   // localhost by default; without this, a link built from that LAN IP
//   // never reaches the dev server at all, connection refused/timeout,
//   // regardless of what the URL itself looks like.
//   server: {
//     host: true,
//   },
//   resolve: {
//         alias: {
//             "@": path.resolve(__dirname, "./src"),
//             "actions": path.resolve(__dirname, "./src/actions"),
//             "api": path.resolve(__dirname, "./src/api"),
//             "pages": path.resolve(__dirname, "./src/pages"),
//             "assets": path.resolve(__dirname, "./src/assets"),
//             "components": path.resolve(__dirname, "./src/components"),
//             "helpers": path.resolve(__dirname, "./src/helpers"),
//             "lib": path.resolve(__dirname, "./src/lib"),
//         }
//     },
// })


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
    host: true,
    // This allows VS Code's forwarded URL to access your local server
    allowedHosts: true,
    // Fleetra (the chat API) runs as a separate service. Forwarding it here
    // keeps the browser on ONE origin: no CORS, and the requests work the same
    // through a VS Code forwarded URL or from another device on the LAN,
    // because the forwarding happens on the machine running Vite, not in the
    // browser. Mirrors what nginx does in production.
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
            "@": path.resolve(import.meta.dirname, "./src"),
            "actions": path.resolve(import.meta.dirname, "./src/actions"),
            "api": path.resolve(import.meta.dirname, "./src/api"),
            "pages": path.resolve(import.meta.dirname, "./src/pages"),
            "assets": path.resolve(import.meta.dirname, "./src/assets"),
            "components": path.resolve(import.meta.dirname, "./src/components"),
            "helpers": path.resolve(import.meta.dirname, "./src/helpers"),
            "lib": path.resolve(import.meta.dirname, "./src/lib"),
        }
    },
})