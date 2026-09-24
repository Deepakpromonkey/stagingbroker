/*
 * Where the Certificate Holder block sits on a page of a certificate.
 *
 * The holder is whoever the agency made the certificate out to - usually
 * another broker or a portal such as MyCarrierPortal - and a broker looking at
 * a carrier's COI has no use for someone else's name and address on it. The
 * PDF itself cannot be edited, so the viewer paints over the block instead.
 *
 * The block is found from the page's own text rather than a fixed position:
 * ACORD 25 revisions and agency software place it differently, the form is not
 * always on page 1, and some generators write every glyph as its own text item
 * ("C", "E", "R", ...), so lines are rebuilt before anything is searched.
 *
 * Everything here works in PDF user space (origin bottom-left, y up) and hands
 * back fractions of the page, so the overlay holds at any render width.
 */

// Baselines closer than this are one line.
const LINE_TOLERANCE = 2;

// How far below the heading the holder's first line may start, and the widest
// gap allowed between the holder's own lines. Past either, the text belongs to
// something else.
const FIRST_LINE_REACH = 60;
const LINE_GAP_LIMIT = 22;

// ACORD 25 geometry, as fractions of a portrait letter page from the top-left,
// for a scanned certificate that has no text to search.
const ACORD_25_FALLBACK = { left: 0.03, top: 0.836, right: 0.5, bottom: 0.93 };

function groupLines(items) {
    const lines = [];

    for (const item of items) {
        if (!item?.str || !item.transform) continue;

        const y = item.transform[5];
        let line = lines.find((candidate) => Math.abs(candidate.y - y) < LINE_TOLERANCE);

        if (!line) {
            line = { y, items: [] };
            lines.push(line);
        }

        line.items.push(item);
    }

    for (const line of lines) {
        line.items.sort((a, b) => a.transform[4] - b.transform[4]);
    }

    return lines;
}

// Every occurrence of `phrase` on the page, whitespace and case ignored.
function findPhrase(lines, phrase) {
    const target = phrase.replace(/\s+/g, '').toUpperCase();
    const hits = [];

    for (const line of lines) {
        let text = '';
        const owner = [];

        line.items.forEach(function (item, index) {
            for (const char of item.str) {
                if (/\s/.test(char)) continue;
                text += char.toUpperCase();
                owner.push(index);
            }
        });

        let from = 0;
        let at;

        while ((at = text.indexOf(target, from)) !== -1) {
            const first = line.items[owner[at]];
            const last = line.items[owner[at + target.length - 1]];

            hits.push({
                x0: first.transform[4],
                x1: last.transform[4] + last.width,
                y: line.y,
                height: Math.max(first.height, last.height)
            });

            from = at + 1;
        }
    }

    return hits;
}

/*
 * The heading, not the disclaimer. "Certificate holder" appears several times
 * in the ACORD boilerplate; the heading is the one with CANCELLATION beside it
 * on the same line. Without that pairing, only a line that says nothing but
 * the heading will do.
 */
function findHeading(lines) {
    const holders = findPhrase(lines, 'certificate holder');
    const cancels = findPhrase(lines, 'cancellation');

    for (const holder of holders) {
        const cancel = cancels.find(
            (candidate) => Math.abs(candidate.y - holder.y) < LINE_TOLERANCE && candidate.x0 > holder.x1
        );

        if (cancel) {
            return { holder, rightEdge: cancel.x0 };
        }
    }

    for (const holder of holders) {
        const line = lines.find((candidate) => Math.abs(candidate.y - holder.y) < LINE_TOLERANCE);
        const text = line.items.map((item) => item.str).join('').replace(/\s+/g, '').toUpperCase();

        if (text === 'CERTIFICATEHOLDER') {
            return { holder, rightEdge: null };
        }
    }

    return null;
}

function toFraction(viewport, x0, y0, x1, y1) {
    const [ax, ay, bx, by] = viewport.convertToViewportRectangle([x0, y0, x1, y1]);

    return {
        left: Math.min(ax, bx) / viewport.width,
        top: Math.min(ay, by) / viewport.height,
        right: Math.max(ax, bx) / viewport.width,
        bottom: Math.max(ay, by) / viewport.height
    };
}

/**
 * The areas to cover on one page, as `{ left, top, right, bottom }` fractions
 * of the rendered page. Empty when the page has no holder block.
 *
 * `page` is a pdf.js PDFPageProxy.
 */
export async function findHolderMasks(page) {
    const viewport = page.getViewport({ scale: 1 });
    const content = await page.getTextContent();
    const items = content.items.filter((item) => item.str && item.str.trim());

    /*
     * A scan: nothing to search. The first page of a certificate is the
     * ACORD 25 far more often than not, so its holder block is covered where
     * the form puts it. Later pages are left alone rather than guessed at.
     */
    if (!items.length) {
        return page.pageNumber === 1 ? [ACORD_25_FALLBACK] : [];
    }

    const lines = groupLines(items);
    const heading = findHeading(lines);

    if (!heading) {
        return [];
    }

    const { holder } = heading;
    const rightEdge = heading.rightEdge ?? viewport.width / 2;
    const left = holder.x0 - 4;

    // The holder's lines: left of the Cancellation column, below the heading,
    // stopping at the ACORD footer or the first gap too wide to be one address.
    const footers = [
        ...findPhrase(lines, 'ACORD 25'),
        ...findPhrase(lines, 'ACORD CORPORATION')
    ].filter((hit) => hit.y < holder.y);
    const floor = footers.length ? Math.max(...footers.map((hit) => hit.y + hit.height)) : 0;

    const below = groupLines(
        items.filter((item) => item.transform[4] < rightEdge - 2)
    )
        .filter((line) => line.y < holder.y - LINE_TOLERANCE && line.y > floor)
        .sort((a, b) => b.y - a.y);

    let bottom = holder.y - 40;
    let previous = holder.y;

    for (const line of below) {
        const gap = previous - line.y;

        if (gap > (previous === holder.y ? FIRST_LINE_REACH : LINE_GAP_LIMIT)) {
            break;
        }

        const height = Math.max(...line.items.map((item) => item.height));
        bottom = line.y - height * 0.5;
        previous = line.y;
    }

    bottom = Math.max(bottom, floor + 1);

    return [toFraction(viewport, left, bottom, rightEdge - 3, holder.y - 1.5)];
}
