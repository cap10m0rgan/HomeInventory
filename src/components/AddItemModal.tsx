import { useRef, useState } from 'react';
import { Modal } from './Modal';
import { rotateImage } from '../lib/image';

interface AddItemModalProps {
  open: boolean;
  onClose: () => void;
  onSave: (fields: { name: string; make: string; model: string; serialNumber: string; notes: string; photoFiles: File[] }) => void;
}

interface PendingPhoto {
  id: string;
  file: File;
  preview: string;
}

export function AddItemModal({ open, onClose, onSave }: AddItemModalProps) {
  const [name, setName] = useState('');
  const [make, setMake] = useState('');
  const [model, setModel] = useState('');
  const [serialNumber, setSerialNumber] = useState('');
  const [notes, setNotes] = useState('');
  const [photos, setPhotos] = useState<PendingPhoto[]>([]);
  const fileInput = useRef<HTMLInputElement>(null);

  function reset() {
    setName('');
    setMake('');
    setModel('');
    setSerialNumber('');
    setNotes('');
    setPhotos((prev) => {
      prev.forEach((p) => URL.revokeObjectURL(p.preview));
      return [];
    });
  }

  function handleClose() {
    reset();
    onClose();
  }

  function handleSave() {
    const trimmed = name.trim();
    if (!trimmed) return;
    onSave({
      name: trimmed,
      make: make.trim(),
      model: model.trim(),
      serialNumber: serialNumber.trim(),
      notes: notes.trim(),
      photoFiles: photos.map((p) => p.file),
    });
    reset();
  }

  function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    if (files.length > 0) {
      setPhotos((prev) => [
        ...prev,
        ...files.map((file) => ({ id: crypto.randomUUID(), file, preview: URL.createObjectURL(file) })),
      ]);
    }
    e.target.value = '';
  }

  function removePhoto(id: string) {
    setPhotos((prev) => {
      const gone = prev.find((p) => p.id === id);
      if (gone) URL.revokeObjectURL(gone.preview);
      return prev.filter((p) => p.id !== id);
    });
  }

  async function rotatePendingPhoto(id: string) {
    const target = photos.find((p) => p.id === id);
    if (!target) return;
    const rotated = await rotateImage(target.file);
    const file = new File([rotated], target.file.name.replace(/\.\w+$/, '') + '.jpg', { type: 'image/jpeg' });
    setPhotos((prev) =>
      prev.map((p) => {
        if (p.id !== id) return p;
        URL.revokeObjectURL(p.preview);
        return { ...p, file, preview: URL.createObjectURL(file) };
      }),
    );
  }

  return (
    <Modal open={open} onClose={handleClose} title="Add item">
      <div className="modal-body">
        <div className="field">
          <label htmlFor="item-name">Name</label>
          <input id="item-name" autoFocus value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Refrigerator" />
        </div>

        <div className="grid-2">
          <div className="field">
            <label htmlFor="item-make">Make</label>
            <input id="item-make" value={make} onChange={(e) => setMake(e.target.value)} placeholder="e.g. Samsung" />
          </div>
          <div className="field">
            <label htmlFor="item-model">Model</label>
            <input id="item-model" value={model} onChange={(e) => setModel(e.target.value)} placeholder="e.g. RF28R7351SG" />
          </div>
        </div>

        <div className="field">
          <label htmlFor="item-serial">Serial number</label>
          <input id="item-serial" value={serialNumber} onChange={(e) => setSerialNumber(e.target.value)} placeholder="e.g. 0N123ABCD456" />
        </div>

        <div className="field" style={{ marginTop: 16 }}>
          <label htmlFor="item-photo-input">Photos</label>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            <button type="button" className="btn small" onClick={() => fileInput.current?.click()}>
              📷 Add photos
            </button>
            <span className="field-hint" style={{ margin: 0 }} role="status">
              {photos.length > 0
                ? `${photos.length} photo${photos.length === 1 ? '' : 's'} — the first is the cover`
                : 'Camera or photo library — you can add several'}
            </span>
          </div>
          <input
            id="item-photo-input"
            ref={fileInput}
            type="file"
            accept="image/*"
            multiple
            style={{ display: 'none' }}
            onChange={handlePhotoChange}
          />
          {photos.length > 0 && (
            <>
              <ul className="pending-photos">
                {photos.map((p, i) => (
                  <li key={p.id} className="pending-photo">
                    <img src={p.preview} alt={`Photo ${i + 1} preview`} />
                    {i === 0 && <span className="cover-badge">Cover</span>}
                    <div className="pending-photo-actions">
                      <button type="button" aria-label={`Rotate photo ${i + 1}`} onClick={() => rotatePendingPhoto(p.id)}>
                        ⟳
                      </button>
                      <button type="button" aria-label={`Remove photo ${i + 1}`} onClick={() => removePhoto(p.id)}>
                        ✕
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
              <p className="field-hint">
                Tip: include a shot of the rating plate — long-press its preview to copy the model and serial numbers right
                into the fields above.
              </p>
            </>
          )}
        </div>

        <div className="field">
          <label htmlFor="item-notes">Notes</label>
          <textarea
            id="item-notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Anything worth remembering — purchase date, warranty, quirks…"
          />
        </div>
        <div className="form-actions">
          <button className="btn ghost" onClick={handleClose}>
            Cancel
          </button>
          <button className="btn primary" onClick={handleSave}>
            Add item
          </button>
        </div>
      </div>
    </Modal>
  );
}
