import { useState } from 'react';
import { Modal } from './Modal';

interface AddSpaceModalProps {
  open: boolean;
  onClose: () => void;
  onSave: (name: string) => void;
}

export function AddSpaceModal({ open, onClose, onSave }: AddSpaceModalProps) {
  const [name, setName] = useState('');

  function handleSave() {
    const trimmed = name.trim();
    if (!trimmed) return;
    onSave(trimmed);
    setName('');
  }

  return (
    <Modal open={open} onClose={onClose} title="New space" width="narrow">
      <div className="modal-body">
        <div className="field">
          <label>Name</label>
          <input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSave()}
            placeholder="e.g. Kitchen, Garage, Office"
          />
        </div>
        <div className="form-actions">
          <button className="btn ghost" onClick={onClose}>
            Cancel
          </button>
          <button className="btn primary" onClick={handleSave}>
            Add space
          </button>
        </div>
      </div>
    </Modal>
  );
}
