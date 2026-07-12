// Official NTU transcripts (and similar university transcript exports) are
// laid out as two side-by-side columns per page — e.g. one semester's course
// table on the left half of the page, a different semester's table on the
// right half. Plain top-to-bottom text extraction (what pdf-parse's getText()
// used to do) reads across the full page width line by line, which
// interleaves the two unrelated tables' rows together and badly corrupts
// course/credit/grade alignment.
//
// Geometry alone can't reliably tell "two independent tables side by side"
// apart from "one wide table with well-separated columns" — both can have an
// identical, consistent vertical gap running through most rows (tested this
// directly: a synthetic single wide table with spaced-out columns produces
// the exact same "clean gutter" signal a genuine two-column page does). So
// rather than guessing per document, column-aware extraction is opt-in:
// callers explicitly ask for it for document types it's known to be needed
// and correct for (transcripts). Everything else gets plain single-column
// extraction, which is what every document type worked with before.

if (typeof globalThis.DOMMatrix === 'undefined') {
  // pdfjs-dist normally gets DOMMatrix from @napi-rs/canvas, which ships
  // prebuilt native binaries per platform. If that binding can't load (some
  // Linux distros/architectures, some sandboxes), pdfjs-dist crashes before
  // it ever gets to text extraction — even though text extraction itself
  // doesn't need real canvas rendering, only basic 2D matrix math. A tiny
  // pure-JS polyfill keeps extraction working everywhere.
  try {
    // eslint-disable-next-line global-require
    globalThis.DOMMatrix = require('dommatrix');
  } catch (err) {
    // dommatrix isn't installed; let pdfjs-dist surface its own error later.
  }
}

const ROW_Y_TOLERANCE = 2.5;
const CENTRAL_RANGE = [0.3, 0.7]; // only look for a gutter within the middle 40% of the page
const MAX_STRADDLING_ROW_RATIO = 0.15; // allow a few stray full-width lines (titles/footers)
// How big a horizontal gap between two adjacent text runs has to be, relative
// to the local font size, before it's treated as a real word boundary. Some
// PDFs split a single token into multiple adjacent glyph runs with an
// effectively zero (sometimes even slightly negative/overlapping) gap — e.g.
// a course code "AD1102" coming through as two runs "AD110" and "2" glued
// together with no space between them at all, purely as an artifact of how
// the document's text stream was generated. Blindly inserting a space
// between every pair of cells (the old behaviour) turns that into "AD110 2",
// silently corrupting the code. Using the actual measured gap instead of
// always inserting one fixes that while still correctly spacing genuine
// adjacent words, whose gaps are reliably much larger than this.
const SAME_TOKEN_GAP_RATIO = 0.15;

function buildRows(items) {
  const rows = [];

  items.forEach((item) => {
    const text = (item.str || '').trim();
    if (!text) return;

    const x0 = item.transform[4];
    const x1 = x0 + (item.width || 0);
    const y = item.transform[5];
    const height = item.height || Math.abs(item.transform[0]) || 10;
    let row = rows.find((candidate) => Math.abs(candidate.y - y) <= ROW_Y_TOLERANCE);

    if (!row) {
      row = { y, cells: [] };
      rows.push(row);
    }

    row.cells.push({ text, x0, x1, height });
  });

  return rows;
}

function rowsToLines(rows) {
  return rows
    .sort((a, b) => b.y - a.y)
    .map((row) => {
      const cells = [...row.cells].sort((a, b) => a.x0 - b.x0);
      let line = '';
      let prevCell = null;

      cells.forEach((cell) => {
        if (prevCell) {
          const gap = cell.x0 - prevCell.x1;
          const threshold = Math.max(1, prevCell.height * SAME_TOKEN_GAP_RATIO);
          if (gap > threshold) line += ' ';
        }
        line += cell.text;
        prevCell = cell;
      });

      return line;
    });
}

// Finds the best candidate vertical line to split a page's two side-by-side
// tables at, or returns null if the page doesn't look like it has two
// tables. Tests every cell-boundary x position within the middle of the
// page and keeps the one that the fewest rows have a cell straddling — a
// genuine two-column layout has a position essentially no row's cells cross
// (the shared gutter). This is only ever called for document types already
// known to use this layout (see extractTranscriptPdfText below); it is not
// used as a general-purpose auto-detector.
function findColumnSplit(rows, pageWidth) {
  if (rows.length === 0) return null;

  const rangeStart = pageWidth * CENTRAL_RANGE[0];
  const rangeEnd = pageWidth * CENTRAL_RANGE[1];

  const candidates = new Set();
  rows.forEach((row) => {
    row.cells.forEach((cell) => {
      if (cell.x0 >= rangeStart && cell.x0 <= rangeEnd) candidates.add(cell.x0);
      if (cell.x1 >= rangeStart && cell.x1 <= rangeEnd) candidates.add(cell.x1);
    });
  });

  let best = null;
  candidates.forEach((x) => {
    const straddlingRows = rows.filter((row) => row.cells.some((cell) => cell.x0 < x && cell.x1 > x)).length;
    if (!best || straddlingRows < best.straddlingRows) best = { x, straddlingRows };
  });

  if (!best || best.straddlingRows / rows.length > MAX_STRADDLING_ROW_RATIO) return null;

  return best.x;
}

function extractPlainPageText(items) {
  return rowsToLines(buildRows(items)).join('\n');
}

function extractColumnAwarePageText(items, pageWidth) {
  const rows = buildRows(items);
  const splitX = findColumnSplit(rows, pageWidth);

  if (splitX === null) {
    return rowsToLines(rows).join('\n');
  }

  const leftItems = items.filter((item) => item.transform[4] < splitX);
  const rightItems = items.filter((item) => item.transform[4] >= splitX);

  return [...rowsToLines(buildRows(leftItems)), ...rowsToLines(buildRows(rightItems))].join('\n');
}

async function extractPagesText(buffer, pageTextFn) {
  const { getDocument } = await import('pdfjs-dist/legacy/build/pdf.mjs');
  const data = new Uint8Array(buffer);
  const loadingTask = getDocument({ data, disableFontFace: true, useSystemFonts: false });
  const doc = await loadingTask.promise;

  try {
    const pageTexts = [];

    for (let pageNumber = 1; pageNumber <= doc.numPages; pageNumber += 1) {
      // eslint-disable-next-line no-await-in-loop
      const page = await doc.getPage(pageNumber);
      const viewport = page.getViewport({ scale: 1 });
      // eslint-disable-next-line no-await-in-loop
      const content = await page.getTextContent();
      pageTexts.push(pageTextFn(content.items, viewport.width));
      page.cleanup();
    }

    return pageTexts.join('\n');
  } finally {
    await doc.destroy();
  }
}

// Plain single-column extraction (row-aware, but never splits into columns).
// Safe default for any PDF whose layout isn't known in advance.
function extractPdfText(buffer) {
  return extractPagesText(buffer, (items) => extractPlainPageText(items));
}

// Column-aware extraction for transcripts, which are known to print two
// independent semester tables side by side per page.
function extractTranscriptPdfText(buffer) {
  return extractPagesText(buffer, (items, pageWidth) => extractColumnAwarePageText(items, pageWidth));
}

module.exports = { extractPdfText, extractTranscriptPdfText };
