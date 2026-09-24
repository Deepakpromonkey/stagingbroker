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
import fs from 'fs'

/*
 * pdf.js's wasm decoders, colour profiles, standard fonts and CMaps, served
 * at /pdfjs/ - see PDF_OPTIONS in src/lib/pdfWorker.js. Copied from
 * pdfjs-dist rather than committed, so they always match the installed
 * version.
 */
const PDFJS_ASSET_DIRS = ['wasm', 'iccs', 'standard_fonts', 'cmaps']
const pdfjsDist = path.resolve(import.meta.dirname, 'node_modules/pdfjs-dist')

function pdfjsAssets() {
  let outDir

  return {
    name: 'pdfjs-assets',
    configResolved(config) {
      outDir = path.resolve(config.root, config.build.outDir)
    },
    configureServer(server) {
      server.middlewares.use('/pdfjs', (req, res, next) => {
        const file = path.join(pdfjsDist, decodeURIComponent(req.url.split('?')[0]))
        const [dir] = path.relative(pdfjsDist, file).split(path.sep)

        if (!PDFJS_ASSET_DIRS.includes(dir) || !fs.existsSync(file) || !fs.statSync(file).isFile()) {
          return next()
        }

        if (file.endsWith('.wasm')) res.setHeader('Content-Type', 'application/wasm')
        fs.createReadStream(file).pipe(res)
      })
    },
    closeBundle() {
      for (const dir of PDFJS_ASSET_DIRS) {
        fs.cpSync(path.join(pdfjsDist, dir), path.join(outDir, 'pdfjs', dir), { recursive: true })
      }
    },
  }
}

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    pdfjsAssets(),
  ],
  server: {
    host: true,
    // This allows VS Code's forwarded URL to access your local server
    allowedHosts: true, 
    // Mirrors the /coi-files/ location on the web server: the COI bucket
    // sends no CORS headers, and pdf.js must read the certificate itself.
    proxy: {
      '/coi-files': {
        target: 'https://dollartraq.s3.us-east-2.amazonaws.com',
        changeOrigin: true,
        rewrite: (p) => p.replace(/^\/coi-files/, ''),
      },
    },
  },
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