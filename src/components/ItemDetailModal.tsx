import { useRef, useState } from 'react';
import { Modal } from './Modal';
import type { Item, Part, PartType, Space } from '../types';
import { MANUALS_BUCKET, PHOTOS_BUCKET, publicUrlFor } from '../lib/supabase';

const PART_TYPES: PartType[] = ['Filter', 'Replacement part', 'Battery', 'Consumable', 'Accessory', 'Other'];

interface ItemDetailModalProps {
  item: Item | null;
  space: Space | null;
  onClose: () => void;
  onUploadPhoto: (itemId: string, file: File) => void;
  onAttachManual: (itemId: string, file: File) => void;
  onAddPart: (itemId: string, part: { type: PartType; name: string; link: string; notes: string }) => void;
  onDeletePart: (partId: string) => void;
  onDeleteItem: (itemId: string, name: string) => void;
}

export function ItemDetailModal({
  item,
  space,
  onClose,
  onUploadPhoto,
  onAttachManual,
  onAddPart,
  onDeletePart,
  onDeleteItem,
}: ItemDetailModalProps) {
  const [partFormOpen, setPartFormOpen] = useState(false);
  const [partType, setPartType] = useState<PartType>('Filter');
  const [partName, setPartName] = useState('');
  const [partLink, setPartLink] = useState('');
  const [partNotes, setPartNotes] = useState('');

  const photoInput = useRef<HTMLInputElement>(null);
  const manualInput = useRef<HTMLInputElement>(null);

  if (!item || !space) return null;

  function resetPartForm() {
    setPartFormOpen(false);
    setPartType('Filter');
    setPartName('');
    setPartLink('');
    setPartNotes('');
  }

  function handleSavePart() {
    const trimmed = partName.trim();
    if (!trimmed || !item) return;
    onAddPart(item.id, { type: partType, name: trimmed, link: partLink.trim(), notes: partNotes.trim() });
    resetPartForm();
  }

  const photoUrl = publicUrlFor(PHOTOS_BUCKET, item.photo_path);
  const manualUrl = publicUrlFor(MANUALS_BUCKET, item.manual_path);

  return (
    <Modal open={!!item} onClose={onClose} title={item.name} width="wide">
      <div className="title-block">
        {item.manual_path && <span className="tb-stamp">On file</span>}
        <div className="tb-name">{item.name}</div>
        <div className="tb-row">
          <div className="tb-field">
            <span className="k">Model</span>
            {item.model || '—'}
          </div>
          <div className="tb-field">
            <span className="k">Space</span>
            {space.name}
          </div>
          <div className="tb-field">
            <span className="k">Parts on file</span>
            {item.parts.length}
          </div>
        </div>
      </div>

      {photoUrl && (
        <div className="detail-section">
          <img src={photoUrl} alt={item.name} style={{ maxWidth: '100%', borderRadius: 3, border: '1px solid var(--bp-line)' }} />
        </div>
      )}
      <div className="detail-section" style={{ paddingTop: 0 }}>
        <button type="button" className="btn small" onClick={() => photoInput.current?.click()}>
          📷 Take / replace photo
        </button>
        <input
          ref={photoInput}
          type="file"
          accept="image/*"
          capture="environment"
          style={{ display: 'none' }}
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) onUploadPhoto(item.id, file);
            e.target.value = '';
          }}
        />
      </div>

      <div className="detail-section">
        <h3>Reference</h3>
        <button
          type="button"
          className="link-btn"
          disabled={!manualUrl}
          onClick={() => manualUrl && window.open(manualUrl, '_blank', 'noopener')}
        >
          📄 {manualUrl ? `Show manual${item.manual_filename ? ' — ' + item.manual_filename : ''}` : 'Show manual'}
        </button>
        <div style={{ display: 'flex', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
          <button
            type="button"
            className="btn small"
            onClick={() => {
              const q = encodeURIComponent(`${item.model || item.name} manual filetype:pdf`);
              window.open(`https://www.google.com/search?q=${q}`, '_blank', 'noopener');
            }}
          >
            🔍 Find manual online
          </button>
          <button type="button" className="btn small" onClick={() => manualInput.current?.click()}>
            📎 Attach manual (PDF)
          </button>
        </div>
        <input
          ref={manualInput}
          type="file"
          accept="application/pdf"
          style={{ display: 'none' }}
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) onAttachManual(item.id, file);
            e.target.value = '';
          }}
        />
        {item.notes && <p className="notes-text" style={{ marginTop: 12 }}>{item.notes}</p>}
      </div>

      <div className="detail-section">
        <h3>Parts &amp; consumables</h3>
        <table className="parts-table">
          <thead>
            <tr>
              <th>Type</th>
              <th>Name</th>
              <th>Where to buy</th>
              <th>Notes</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {item.parts.length === 0 ? (
              <tr>
                <td colSpan={5} className="empty-note">
                  No parts logged yet.
                </td>
              </tr>
            ) : (
              item.parts.map((p: Part) => (
                <tr key={p.id}>
                  <td>
                    <span className="part-type-tag">{p.type}</span>
                  </td>
                  <td>{p.name}</td>
                  <td>
                    {p.link ? (
                      <a className="link-btn" style={{ padding: '4px 8px', fontSize: 11.5 }} href={p.link} target="_blank" rel="noopener">
                        Buy ↗
                      </a>
                    ) : (
                      <span className="empty-note">—</span>
                    )}
                  </td>
                  <td style={{ color: 'var(--bp-ink-faint)', fontSize: 12 }}>{p.notes}</td>
                  <td>
                    <span className="row-del" onClick={() => onDeletePart(p.id)}>
                      ✕
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        {!partFormOpen ? (
          <span className="inline-add-toggle" onClick={() => setPartFormOpen(true)}>
            + Add part
          </span>
        ) : (
          <div className="inline-form">
            <div className="grid-2">
              <div className="field">
                <label>Part type</label>
                <select value={partType} onChange={(e) => setPartType(e.target.value as PartType)}>
                  {PART_TYPES.map((t) => (
                    <option key={t}>{t}</option>
                  ))}
                </select>
              </div>
              <div className="field">
                <label>Part name</label>
                <input value={partName} onChange={(e) => setPartName(e.target.value)} placeholder="e.g. Water filter" />
              </div>
            </div>
            <div className="field">
              <label>Purchase link</label>
              <input value={partLink} onChange={(e) => setPartLink(e.target.value)} placeholder="https://…" />
            </div>
            <div className="field">
              <label>Notes / part #</label>
              <input
                value={partNotes}
                onChange={(e) => setPartNotes(e.target.value)}
                placeholder="e.g. Model DA29-00020B, replace every 6 mo"
              />
            </div>
            <div className="form-actions">
              <button className="btn ghost small" onClick={resetPartForm}>
                Cancel
              </button>
              <button className="btn primary small" onClick={handleSavePart}>
                Save part
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="item-actions-footer">
        <button className="btn danger-outline small" onClick={() => onDeleteItem(item.id, item.name)}>
          Delete item
        </button>
        <button className="btn ghost small" onClick={onClose}>
          Close
        </button>
      </div>
    </Modal>
  );
}
