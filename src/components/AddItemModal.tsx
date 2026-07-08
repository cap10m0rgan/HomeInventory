import { useRef, useState } from 'react';
import { Modal } from './Modal';
import { ScanLabelPanel } from './ScanLabelPanel';

interface AddItemModalProps {
  open: boolean;
  onClose: () => void;
  onSave: (fields: { name: string; make: string; model: string; serialNumber: string; notes: string; photoFile: File | null }) => void;
}

export function AddItemModal({ open, onClose, onSave }: AddItemModalProps) {
  const [name, setName] = useState('');
  const [make, setMake] = useState('');
  const [model, setModel] = useState('');
  const [serialNumber, setSerialNumber] = useState('');
  const [notes, setNotes] = useState('');
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  function reset() {
    setName('');
    setMake('');
    setModel('');
    setSerialNumber('');
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
    onSave({ name: trimmed, make: make.trim(), model: model.trim(), serialNumber: serialNumber.trim(), notes: notes.trim(), photoFile });
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

        <ScanLabelPanel onAssignModel={setModel} onAssignSerial={setSerialNumber} />

        <div className="field" style={{ marginTop: 16 }}>
          <label htmlFor="item-photo-input">Photo</label>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <button type="button" className="btn small" onClick={() => fileInput.current?.click()}>
              📷 Add photo
            </button>
            <span className="field-hint" style={{ margin: 0 }}>
              {photoFile ? 'Photo added ✓' : 'Camera or photo library'}
            </span>
          </div>
          <input id="item-photo-input" ref={fileInput} type="file" accept="image/*" style={{ display: 'none' }} onChange={handlePhotoChange} />
          {photoPreview && (
            <img src={photoPreview} alt="" style={{ maxWidth: 140, marginTop: 10, borderRadius: 8, border: '1px solid var(--border)' }} />
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
