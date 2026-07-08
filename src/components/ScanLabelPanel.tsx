import { useRef, useState } from 'react';
import { recognizeText } from '../lib/ocr';

interface ScanLabelPanelProps {
  onAssignModel: (text: string) => void;
  onAssignSerial: (text: string) => void;
}

export function ScanLabelPanel({ onAssignModel, onAssignSerial }: ScanLabelPanelProps) {
  const [scanning, setScanning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [lines, setLines] = useState<string[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setError(null);
    setLines(null);
    setScanning(true);
    setProgress(0);
    try {
      const found = await recognizeText(file, setProgress);
      setLines(found);
      if (found.length === 0) {
        setError("Couldn't make out any text — try a closer, well-lit photo of the rating plate.");
      }
    } catch {
      setError("Couldn't read that photo. Try again with better lighting or a straighter angle.");
    } finally {
      setScanning(false);
    }
  }

  return (
    <div className="scan-panel">
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
        <button type="button" className="btn small" onClick={() => fileInput.current?.click()} disabled={scanning}>
          🔎 Scan model/serial label
        </button>
        <span className="field-hint" style={{ margin: 0 }}>
          {scanning ? `Reading label… ${progress}%` : 'Take or choose a photo of the rating plate'}
        </span>
      </div>
      <input ref={fileInput} type="file" accept="image/*" aria-label="Photo of rating plate to scan" style={{ display: 'none' }} onChange={handleFile} />

      {error && (
        <p role="status" className="field-hint" style={{ color: 'var(--danger)', marginTop: 10 }}>
          {error}
        </p>
      )}

      {lines && lines.length > 0 && (
        <div role="status">
          <p className="field-hint" style={{ marginTop: 10 }}>
            Found this text — tap a line to fill it in:
          </p>
          <div className="scan-candidates">
            {lines.map((line, i) => (
              <div key={`${line}-${i}`} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span className="mono" style={{ fontSize: 12.5 }}>
                  {line}
                </span>
                <button type="button" className="scan-chip" onClick={() => onAssignModel(line)}>
                  Use as Model
                </button>
                <button type="button" className="scan-chip" onClick={() => onAssignSerial(line)}>
                  Use as Serial #
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
