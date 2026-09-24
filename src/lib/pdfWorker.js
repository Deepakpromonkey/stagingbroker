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
