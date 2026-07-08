import { useEffect, useRef, useState } from 'react';
import { Modal } from './Modal';
import type { Item, Part, PartType, Photo, Space } from '../types';
import { MANUALS_BUCKET, PHOTOS_BUCKET, publicUrlFor } from '../lib/supabase';

const PART_TYPES: PartType[] = ['Filter', 'Replacement part', 'Battery', 'Consumable', 'Accessory', 'Other'];

interface ItemDetailModalProps {
  item: Item | null;
  space: Space | null;
  onClose: () => void;
  onAddPhoto: (itemId: string, file: File, makePrimary: boolean) => void;
  onDeletePhoto: (photoId: string, storagePath: string) => void;
  onSetPrimaryPhoto: (itemId: string, photoId: string) => void;
  onAttachManual: (itemId: string, file: File) => void;
  onAddPart: (itemId: string, part: { type: PartType; name: string; link: string; notes: string }) => void;
  onDeletePart: (partId: string) => void;
  onDeleteItem: (itemId: string, name: string) => void;
}

export function ItemDetailModal({
  item,
  space,
  onClose,
  onAddPhoto,
  onDeletePhoto,
  onSetPrimaryPhoto,
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
  const [activePhotoIdx, setActivePhotoIdx] = useState(0);

  const addPhotoInput = useRef<HTMLInputElement>(null);
  const manualInput = useRef<HTMLInputElement>(null);

  // Retain the last non-null item/space so the modal's content doesn't blank
  // out mid-close while Modal's exit animation is still playing.
  const [display, setDisplay] = useState<{ item: Item; space: Space } | null>(null);
  useEffect(() => {
    if (item && space) setDisplay({ item, space });
  }, [item, space]);

  useEffect(() => {
    setActivePhotoIdx(0);
  }, [display?.item.id]);

  function resetPartForm() {
    setPartFormOpen(false);
    setPartType('Filter');
    setPartName('');
    setPartLink('');
    setPartNotes('');
  }

  function handleSavePart() {
    const trimmed = partName.trim();
    if (!trimmed || !display) return;
    onAddPart(display.item.id, { type: partType, name: trimmed, link: partLink.trim(), notes: partNotes.trim() });
    resetPartForm();
  }

  if (!display) {
    return <Modal open={false} onClose={onClose} title="Item" />;
  }

  const { item: d, space: s } = display;
  const sortedPhotos: Photo[] = [...d.photos].sort((a, b) => (b.is_primary ? 1 : 0) - (a.is_primary ? 1 : 0) || a.sort_order - b.sort_order);
  const activePhoto = sortedPhotos[Math.min(activePhotoIdx, sortedPhotos.length - 1)] ?? null;
  const manualUrl = publicUrlFor(MANUALS_BUCKET, d.manual_path);
  const manualSearchUrl = `https://duckduckgo.com/?q=${encodeURIComponent(`${d.make} ${d.model || d.name} manual pdf`.trim())}`;

  return (
    <Modal open={!!item} onClose={onClose} title={d.name} width="wide">
      <div className="gallery">
        <div className="gallery-main">
          {activePhoto ? (
            <img src={publicUrlFor(PHOTOS_BUCKET, activePhoto.storage_path) ?? undefined} alt={`${d.name} photo ${activePhotoIdx + 1}`} />
          ) : (
            'No photos yet'
          )}
        </div>
        <div className="gallery-strip">
          {sortedPhotos.map((p, i) => (
            <div key={p.id} className={`photo-thumb${i === activePhotoIdx ? ' active' : ''}`}>
              <button
                type="button"
                className="photo-thumb-select"
                onClick={() => setActivePhotoIdx(i)}
                aria-label={`Show photo ${i + 1}${p.is_primary ? ' (cover photo)' : ''}`}
                aria-current={i === activePhotoIdx ? 'true' : undefined}
              >
                <img src={publicUrlFor(PHOTOS_BUCKET, p.storage_path) ?? undefined} alt="" />
                {p.is_primary && <span className="cover-badge">Cover</span>}
              </button>
              <button
                type="button"
                className="gallery-remove"
                aria-label={`Remove photo ${i + 1}`}
                onClick={() => onDeletePhoto(p.id, p.storage_path)}
              >
                ✕
              </button>
            </div>
          ))}
          <button
            type="button"
            className="add-photo-tile"
            onClick={() => addPhotoInput.current?.click()}
            aria-label="Add photo"
          >
            +
          </button>
        </div>
        <input
          ref={addPhotoInput}
          type="file"
          accept="image/*"
          aria-label="Add item photo"
          style={{ display: 'none' }}
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) onAddPhoto(d.id, file, sortedPhotos.length === 0);
            e.target.value = '';
          }}
        />
        {activePhoto && !activePhoto.is_primary && (
          <div className="gallery-actions">
            <button type="button" className="btn small" onClick={() => onSetPrimaryPhoto(d.id, activePhoto.id)}>
              ⭐ Set as cover photo
            </button>
          </div>
        )}
      </div>

      <div className="info-panel">
        <h1>{d.name}</h1>
        <div className="info-grid">
          <div className="info-field">
            <span className="k">Make</span>
            <span className="v">{d.make || '—'}</span>
          </div>
          <div className="info-field">
            <span className="k">Model</span>
            <span className="v">{d.model || '—'}</span>
          </div>
          <div className="info-field">
            <span className="k">Serial number</span>
            <span className="v">{d.serial_number || '—'}</span>
          </div>
          <div className="info-field">
            <span className="k">Room</span>
            <span className="v">{s.name}</span>
          </div>
        </div>
      </div>

      <div className="detail-section">
        <h3>Reference</h3>
        <button
          type="button"
          className="link-btn"
          disabled={!manualUrl}
          onClick={() => manualUrl && window.open(manualUrl, '_blank', 'noopener')}
        >
          📄 {manualUrl ? `Show manual${d.manual_filename ? ' — ' + d.manual_filename : ''}` : 'Show manual'}
        </button>
        <div style={{ display: 'flex', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
          <a className="btn small" href={manualSearchUrl} target="_blank" rel="noopener noreferrer">
            🔍 Find manual online
          </a>
          <button type="button" className="btn small" onClick={() => manualInput.current?.click()}>
            📎 Attach manual (PDF)
          </button>
        </div>
        <input
          ref={manualInput}
          type="file"
          accept="application/pdf"
          aria-label="Manual PDF"
          style={{ display: 'none' }}
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) onAttachManual(d.id, file);
            e.target.value = '';
          }}
        />
        {d.notes && (
          <p className="notes-text" style={{ marginTop: 12 }}>
            {d.notes}
          </p>
        )}
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
              <th>
                <span className="visually-hidden">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {d.parts.length === 0 ? (
              <tr>
                <td colSpan={5} className="empty-note">
                  No parts logged yet.
                </td>
              </tr>
            ) : (
              d.parts.map((p: Part) => (
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
                  <td style={{ color: 'var(--ink-faint)', fontSize: 12.5 }}>{p.notes}</td>
                  <td>
                    <button type="button" className="row-del" aria-label={`Delete ${p.name}`} onClick={() => onDeletePart(p.id)}>
                      ✕
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        {!partFormOpen ? (
          <button type="button" className="inline-add-toggle" onClick={() => setPartFormOpen(true)}>
            + Add part
          </button>
        ) : (
          <div className="inline-form">
            <div className="grid-2">
              <div className="field">
                <label htmlFor="part-type">Part type</label>
                <select id="part-type" value={partType} onChange={(e) => setPartType(e.target.value as PartType)}>
                  {PART_TYPES.map((t) => (
                    <option key={t}>{t}</option>
                  ))}
                </select>
              </div>
              <div className="field">
                <label htmlFor="part-name">Part name</label>
                <input id="part-name" value={partName} onChange={(e) => setPartName(e.target.value)} placeholder="e.g. Water filter" />
              </div>
            </div>
            <div className="field">
              <label htmlFor="part-link">Purchase link</label>
              <input id="part-link" value={partLink} onChange={(e) => setPartLink(e.target.value)} placeholder="https://…" />
            </div>
            <div className="field">
              <label htmlFor="part-notes">Notes / part #</label>
              <input
                id="part-notes"
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
        <button className="btn danger-outline small" onClick={() => onDeleteItem(d.id, d.name)}>
          Delete item
        </button>
        <button className="btn ghost small" onClick={onClose}>
          Close
        </button>
      </div>
    </Modal>
  );
}
