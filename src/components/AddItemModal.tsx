import { useRef, useState } from 'react';
import { Modal } from './Modal';

interface AddItemModalProps {
  open: boolean;
  onClose: () => void;
  onSave: (fields: { name: string; model: string; notes: string; photoFile: File | null }) => void;
}

export function AddItemModal({ open, onClose, onSave }: AddItemModalProps) {
  const [name, setName] = useState('');
  const [model, setModel] = useState('');
  const [notes, setNotes] = useState('');
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  function reset() {
    setName('');
    setModel('');
    setNotes('');
    setPhotoFile(null);
    setPhotoPreview(null);
  }

  function handleClose() {
    reset();
    onClose();
  }

  function handleSave() {
    const trimmed = name.trim();
    if (!trimmed) return;
    onSave({ name: trimmed, model: model.trim(), notes: notes.trim(), photoFile });
    reset();
  }

  function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhotoFile(file);
    setPhotoPreview(URL.createObjectURL(file));
    e.target.value = '';
  }

  return (
    <Modal open={open} onClose={handleClose} title="Add item">
      <div className="modal-body">
        <div className="field">
          <label>Name</label>
          <input autoFocus value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Refrigerator" />
        </div>
        <div className="field">
          <label>Brand / model</label>
          <input value={model} onChange={(e) => setModel(e.target.value)} placeholder="e.g. Samsung RF28R7351SG" />
        </div>
        <div className="field">
          <label>Photo</label>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <button type="button" className="btn small" onClick={() => fileInput.current?.click()}>
              📷 Take / choose photo
            </button>
            <span className="bp-label" style={{ fontSize: 12 }}>
              {photoFile ? 'Photo captured ✓' : 'No photo yet'}
            </span>
          </div>
          <input ref={fileInput} type="file" accept="image/*" capture="environment" style={{ display: 'none' }} onChange={handlePhotoChange} />
          {photoPreview && (
            <img src={photoPreview} alt="" style={{ maxWidth: 140, marginTop: 10, borderRadius: 3, border: '1px solid var(--bp-line)' }} />
          )}
        </div>
        <div className="field">
          <label>Notes</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Anything worth remembering — purchase date, serial number, quirks…"
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
