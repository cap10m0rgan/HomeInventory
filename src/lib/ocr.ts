// Tesseract.js is ~2MB with its wasm/data files, so it's dynamically
// imported here and only ever loaded when a user actually taps "Scan label."
export async function recognizeText(file: File | Blob, onProgress?: (pct: number) => void): Promise<string[]> {
  const { default: Tesseract } = await import('tesseract.js');
  const result = await Tesseract.recognize(file, 'eng', {
    logger: (m) => {
      if (m.status === 'recognizing text' && onProgress) onProgress(Math.round(m.progress * 100));
    },
  });

  const lines = result.data.text
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l.length >= 2);

  // De-dupe while preserving order.
  return Array.from(new Set(lines));
}
