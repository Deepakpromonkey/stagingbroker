import { pdfjs } from "react-pdf";

import PdfWorker from "pdfjs-dist/build/pdf.worker.min.mjs?worker";

/*
| Bundled with the app rather than pulled from a CDN — the documents rendered
| with it (agreements, certificates) are private and should not depend on a
| third-party host.
|
| Handed to pdf.js as a worker we instantiate, not as a URL for it to fetch:
| workerSrc pointed at the emitted .mjs asset, and a server that does not map
| .mjs to a JavaScript MIME type — nginx does not, out of the box — has the
| module worker rejected by the browser, which is why the agreement rendered as
| "could not be displayed". Vite emits this one as a plain .js worker chunk, so
| no server-side MIME mapping is involved.
|
| Created on first use and shared, the way pdf.js reuses a worker across
| documents: at import time it would cost every carrier a megabyte of worker on
| step 1, long before they reach the agreement.
*/
let workerPort = null;

export const ensurePdfWorker = () => {
  if (!workerPort) {
    workerPort = new PdfWorker();
    pdfjs.GlobalWorkerOptions.workerPort = workerPort;
  }
};

/*
| Where pdf.js finds the decoders and font data it does not bundle - copied
| out of pdfjs-dist by the pdfjsAssets plugin in vite.config.js.
|
| Without them pdf.js still renders, just not faithfully: agency certificates
| are often scans (JPEG 2000 / JBIG2 images under a text layer), and with no
| wasm decoder the image is dropped - table lines, check marks and the
| signature vanish, leaving only the text. Missing font data swaps in
| look-alike fonts.
|
| One object for the life of the app: react-pdf reloads the document whenever
| `options` changes identity.
*/
const PDFJS_BASE = `${import.meta.env.BASE_URL}pdfjs/`;

export const PDF_OPTIONS = {
  wasmUrl: `${PDFJS_BASE}wasm/`,
  iccUrl: `${PDFJS_BASE}iccs/`,
  standardFontDataUrl: `${PDFJS_BASE}standard_fonts/`,
  cMapUrl: `${PDFJS_BASE}cmaps/`,
  cMapPacked: true,
};
