import { Modal } from './Modal';
import type { Space } from '../types';

interface ManageSpacesModalProps {
  open: boolean;
  onClose: () => void;
  spaces: Space[];
  onDeleteSpace: (id: string, name: string) => void;
}

export function ManageSpacesModal({ open, onClose, spaces, onDeleteSpace }: ManageSpacesModalProps) {
  return (
    <Modal open={open} onClose={onClose} title="Manage rooms" width="narrow">
      <div className="modal-body">
        {spaces.length === 0 ? (
          <p className="field-hint">No rooms yet.</p>
        ) : (
          <div>
            {spaces.map((sp) => (
              <div key={sp.id} className="manage-row">
                <span className="name">{sp.name}</span>
                <span className="count">
                  {sp.items.length} item{sp.items.length === 1 ? '' : 's'}
                </span>
                <button type="button" className="del" aria-label={`Delete ${sp.name}`} onClick={() => onDeleteSpace(sp.id, sp.name)}>
                  ✕
                </button>
              </div>
            ))}
          </div>
        )}
        <div className="form-actions">
          <button className="btn ghost" onClick={onClose}>
            Done
          </button>
        </div>
      </div>
    </Modal>
  );
}
