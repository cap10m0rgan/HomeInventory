// Tesseract.js is ~2MB with its wasm/data files, so it's dynamically
// imported here and only ever loaded when a user actually taps "Scan label."

const MIN_WORD_CONFIDENCE = 45;

/**
 * Rating plates are small, dense, and often photographed at an angle with a
 * phone camera — raw Tesseract on the unmodified photo tends to fragment
 * badly. Upscaling (Tesseract wants each character several pixels tall) and
 * a grayscale contrast stretch make a large, measurable difference.
 */
async function preprocess(file: File | Blob): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const targetLong = 1600;
  const longEdge = Math.max(bitmap.width, bitmap.height);
  const scale = Math.min(3, Math.max(1, targetLong / longEdge));
  const width = Math.round(bitmap.width * scale);
  const height = Math.round(bitmap.height * scale);

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return file;
  ctx.drawImage(bitmap, 0, 0, width, height);

  const imageData = ctx.getImageData(0, 0, width, height);
  const { data } = imageData;

  // Grayscale first, tracking the min/max so we can contrast-stretch.
  let min = 255;
  let max = 0;
  const gray = new Uint8ClampedArray(width * height);
  for (let i = 0; i < gray.length; i++) {
    const o = i * 4;
    const g = data[o] * 0.299 + data[o + 1] * 0.587 + data[o + 2] * 0.114;
    gray[i] = g;
    if (g < min) min = g;
    if (g > max) max = g;
  }

  const range = Math.max(1, max - min);
  for (let i = 0; i < gray.length; i++) {
    const o = i * 4;
    const stretched = ((gray[i] - min) / range) * 255;
    data[o] = data[o + 1] = data[o + 2] = stretched;
  }
  ctx.putImageData(imageData, 0, 0);

  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob ?? file), 'image/png');
  });
}

interface WordBox {
  text: string;
  confidence: number;
  x0: number;
  y0: number;
  y1: number;
}

/**
 * Real rating plates are rarely one uniform column of text — this Maytag
 * plate, for example, has an English/French bilingual layout plus a
 * separate electrical-specs column on the right. Trusting Tesseract's own
 * line/paragraph grouping (which assumes a single reading flow) produces
 * exactly the jumbled, ungrouped output that prompted this rewrite. Instead:
 * take every recognized word regardless of which "line" Tesseract assigned
 * it to, and re-group into rows purely by vertical pixel position — this is
 * robust to whatever layout the label actually has.
 */
function groupWordsIntoRows(words: WordBox[]): string[] {
  const filtered = words.filter((w) => w.confidence >= MIN_WORD_CONFIDENCE && w.text.trim().length > 0);
  if (filtered.length === 0) return [];

  const heights = filtered.map((w) => w.y1 - w.y0).sort((a, b) => a - b);
  const medianHeight = heights[Math.floor(heights.length / 2)] || 10;
  // Tight-ish on purpose: a genuinely multi-column label (e.g. bilingual
  // pairs next to a separate specs column) can have unrelated text sitting
  // at roughly the same height without being the same logical row. A wider
  // tolerance groups more but risks stitching two columns into one
  // unreadable line; this errs toward more, shorter rows instead.
  const tolerance = medianHeight * 0.45;

  const sorted = [...filtered].sort((a, b) => (a.y0 + a.y1) / 2 - (b.y0 + b.y1) / 2);
  const rows: WordBox[][] = [];
  for (const w of sorted) {
    const yCenter = (w.y0 + w.y1) / 2;
    const row = rows.find((r) => Math.abs((r[0].y0 + r[0].y1) / 2 - yCenter) <= tolerance);
    if (row) row.push(w);
    else rows.push([w]);
  }

  return rows
    .map((row) =>
      row
        .sort((a, b) => a.x0 - b.x0)
        .map((w) => w.text)
        .join(' ')
        .replace(/\s+/g, ' ')
        .trim(),
    )
    .filter((t) => t.length >= 2);
}

export async function recognizeText(file: File | Blob, onProgress?: (pct: number) => void): Promise<string[]> {
  const { createWorker, PSM } = await import('tesseract.js');
  const processed = await preprocess(file);

  const worker = await createWorker('eng', undefined, {
    logger: (m) => {
      if (m.status === 'recognizing text' && onProgress) onProgress(Math.round(m.progress * 100));
    },
  });

  try {
    // SPARSE_TEXT finds text wherever it is on the image without assuming
    // any particular column/paragraph structure — a better fit than
    // SINGLE_BLOCK for labels with real multi-column layouts, since we do
    // our own geometric line-grouping below anyway and just need accurate
    // word-level detection, not Tesseract's opinion about reading order.
    await worker.setParameters({ tessedit_pageseg_mode: PSM.SPARSE_TEXT });
    // `blocks` (which nests paragraphs -> lines -> words, each with its own
    // confidence and bounding box) isn't populated unless explicitly
    // requested — without it there's only a single whole-page confidence
    // and no coordinates to group by.
    const { data } = await worker.recognize(processed, {}, { blocks: true });

    const words: WordBox[] = (data.blocks ?? []).flatMap((block) =>
      block.paragraphs.flatMap((p) =>
        p.lines.flatMap((l) =>
          l.words.map((w) => ({ text: w.text, confidence: w.confidence, x0: w.bbox.x0, y0: w.bbox.y0, y1: w.bbox.y1 })),
        ),
      ),
    );

    return Array.from(new Set(groupWordsIntoRows(words)));
  } finally {
    await worker.terminate();
  }
}
