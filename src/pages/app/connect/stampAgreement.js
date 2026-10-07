// Signature width as a share of the page width — the same ratio PdfViewer
// previews and the API stamps with, so all three agree on where it lands.
const SIGNATURE_WIDTH_RATIO = 0.22;

// pdf-lib's standard fonts are WinAnsi; anything outside Latin-1 would throw.
const latin1 = (text) => text.replace(/[^\x20-\x7E\xA0-\xFF]/g, "?");

/**
 * Stamp the carrier's signature onto the agreement in the browser.
 *
 * The API stamps the broker's original itself whenever it can read it, and
 * keeps this copy only for PDFs its parser cannot open (those saved with
 * compressed cross-reference streams, which is most of what Word writes).
 * pdf-lib reads those fine, so sending this along means a signed copy is
 * stored either way.
 *
 * `xPct` / `yPct` are the signature's centre in percent of the page box,
 * measured from the top left — the same numbers posted to the API.
 *
 * @returns {Promise<File>} the signed agreement as a PDF file
 */
export default async function stampAgreement({
  pdfUrl,
  signature,
  page,
  xPct,
  yPct,
  signerName,
}) {
  // Loaded on demand: it is only ever needed at the moment of signing.
  const { PDFDocument, StandardFonts, rgb } = await import("pdf-lib");

  const response = await fetch(pdfUrl);

  if (!response.ok) {
    throw new Error(`Agreement could not be fetched (${response.status}).`);
  }

  const pdf = await PDFDocument.load(await response.arrayBuffer(), {
    ignoreEncryption: true,
  });

  const pages = pdf.getPages();
  const target = pages[Math.min(Math.max(page, 1), pages.length) - 1];
  const { width: pageWidth, height: pageHeight } = target.getSize();

  const image = await pdf.embedPng(await signature.arrayBuffer());

  const width = pageWidth * SIGNATURE_WIDTH_RATIO;
  const height = width * (image.height / image.width);

  const fontSize = 6;
  const captionHeight = fontSize * 2.4;

  // pdf-lib measures y from the bottom of the page, the stored position from
  // the top. Kept on the page, with room for the caption underneath.
  const x = Math.min(
    Math.max(pageWidth * (xPct / 100) - width / 2, 0),
    pageWidth - width,
  );
  const top = Math.min(
    Math.max(pageHeight * (yPct / 100) - height / 2, 0),
    pageHeight - height - captionHeight,
  );
  const y = pageHeight - top - height;

  target.drawImage(image, { x, y, width, height });

  const font = await pdf.embedFont(StandardFonts.Helvetica);

  const caption = [
    latin1(`Signed electronically by ${signerName || "the carrier"}`),
    latin1(new Date().toLocaleString("en-US", { timeZoneName: "short" })),
  ];

  caption.forEach((line, index) => {
    const lineWidth = font.widthOfTextAtSize(line, fontSize);

    target.drawText(line, {
      x: x + (width - lineWidth) / 2,
      y: y - fontSize * 1.2 * (index + 1),
      size: fontSize,
      font,
      color: rgb(0.35, 0.35, 0.35),
    });
  });

  const bytes = await pdf.save();

  return new File([bytes], "signed-agreement.pdf", { type: "application/pdf" });
}
