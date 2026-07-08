// Tesseract.js is ~2MB with its wasm/data files, so it's dynamically
// imported here and only ever loaded when a user actually taps "Scan label."

const MIN_LINE_CONFIDENCE = 45;

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

export async function recognizeText(file: File | Blob, onProgress?: (pct: number) => void): Promise<string[]> {
  const { createWorker, PSM } = await import('tesseract.js');
  const processed = await preprocess(file);

  const worker = await createWorker('eng', undefined, {
    logger: (m) => {
      if (m.status === 'recognizing text' && onProgress) onProgress(Math.round(m.progress * 100));
    },
  });

  try {
    // Rating plates read as one dense block of short lines, not a page of
    // prose — SINGLE_BLOCK keeps Tesseract from trying (and failing) to
    // detect paragraph/column structure that isn't there.
    await worker.setParameters({ tessedit_pageseg_mode: PSM.SINGLE_BLOCK });
    // `blocks` (which nests paragraphs -> lines, each with its own
    // confidence) isn't populated unless explicitly requested — without it
    // the only per-region signal is the single whole-page confidence.
    const { data } = await worker.recognize(processed, {}, { blocks: true });

    const rawLines = (data.blocks ?? []).flatMap((block) => block.paragraphs.flatMap((p) => p.lines));

    const lines = rawLines
      .filter((l) => l.confidence >= MIN_LINE_CONFIDENCE)
      .map((l) => l.text.replace(/\s+/g, ' ').trim())
      .filter((t) => t.length >= 2);

    return Array.from(new Set(lines));
  } finally {
    await worker.terminate();
  }
}
