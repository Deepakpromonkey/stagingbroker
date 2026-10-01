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
const pdfjsDist = path.resolve(__dirname, 'node_modules/pdfjs-dist')

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