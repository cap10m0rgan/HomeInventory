import { useEffect, useId, useRef, useState } from 'react';
import { Modal } from './Modal';
import { ReferenceSection } from './ReferenceSection';
import type { Item, Part, PartType, Photo, Space } from '../types';
import { PHOTOS_BUCKET, publicUrlFor } from '../lib/supabase';

const PART_TYPES: PartType[] = ['Filter', 'Replacement part', 'Battery', 'Consumable', 'Accessory', 'Other'];

interface ItemDetailModalProps {
  item: Item | null;
  space: Space | null;
  /** All rooms, for moving the item while editing. */
  spaces: { id: string; name: string }[];
  onClose: () => void;
  onUpdateItem: (
    itemId: string,
    fields: { name: string; make: string; model: string; serialNumber: string; notes: string; spaceId: string },
  ) => void;
  onAddPhoto: (itemId: string, file: File, makePrimary: boolean) => void;
  onDeletePhoto: (itemId: string, photoId: string, storagePath: string, wasPrimary: boolean) => void;
  onSetPrimaryPhoto: (itemId: string, photoId: string) => void;
  referenceKindSuggestions: string[];
  onAddReference: (itemId: string, file: File, kind: string) => void;
  onDeleteReference: (referenceId: string, storagePath: string) => void;
  onAddPart: (itemId: string, part: { type: PartType; name: string; link: string; notes: string }) => void;
  onDeletePart: (partId: string) => void;
  onDeleteItem: (itemId: string, name: string) => void;
}

export function ItemDetailModal({
  item,
  space,
  spaces,
  onClose,
  onUpdateItem,
  onAddPhoto,
  onDeletePhoto,
  onSetPrimaryPhoto,
  referenceKindSuggestions,
  onAddReference,
  onDeleteReference,
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

  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState('');
  const [editMake, setEditMake] = useState('');
  const [editModel, setEditModel] = useState('');
  const [editSerial, setEditSerial] = useState('');
  const [editNotes, setEditNotes] = useState('');
  const [editSpaceId, setEditSpaceId] = useState('');
  const editId = useId();
  const editNameRef = useRef<HTMLInputElement>(null);
  const editBtnRef = useRef<HTMLButtonElement>(null);
  const prevEditing = useRef(false);
  const addPartBtnRef = useRef<HTMLButtonElement>(null);

  const addPhotoInput = useRef<HTMLInputElement>(null);

  // Retain the last non-null item/space so the modal's content doesn't blank
  // out mid-close while Modal's exit animation is still playing.
  const [display, setDisplay] = useState<{ item: Item; space: Space } | null>(null);
  useEffect(() => {
    if (item && space) setDisplay({ item, space });
  }, [item, space]);

  useEffect(() => {
    setActivePhotoIdx(0);
    setEditing(false);
  }, [display?.item.id]);

  useEffect(() => {
    if (!item) setEditing(false);
  }, [item]);

  // Keep focus inside the dialog across the edit-mode swap: entering focuses
  // the first field; leaving focuses the Edit button. Without this, focus
  // falls to <body> when the form unmounts and Escape stops closing the
  // modal (the dialog's keydown handler never sees it).
  useEffect(() => {
    if (editing) editNameRef.current?.focus();
    else if (prevEditing.current && item) editBtnRef.current?.focus();
    prevEditing.current = editing;
  }, [editing, item]);

  function resetPartForm() {
    setPartFormOpen(false);
    setPartType('Filter');
    setPartName('');
    setPartLink('');
    setPartNotes('');
    // Same focus rule as edit mode: don't let the unmounting form drop
    // focus to <body>.
    requestAnimationFrame(() => addPartBtnRef.current?.focus());
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

  return (
    <Modal open={!!item} onClose={onClose} title={d.name} width="wide">
      <div className="gallery">
        <div className="gallery-main">
          {activePhoto ? (
            <img
              src={publicUrlFor(PHOTOS_BUCKET, activePhoto.storage_path) ?? undefined}
              alt={`${d.name} photo ${activePhotoIdx + 1} of ${sortedPhotos.length}`}
            />
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
                onClick={() => onDeletePhoto(d.id, p.id, p.storage_path, p.is_primary)}
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
        {!editing ? (
          <>
            <div className="info-head">
              <h1>{d.name}</h1>
              <button
                ref={editBtnRef}
                type="button"
                className="section-add"
                onClick={() => {
                  setEditName(d.name);
                  setEditMake(d.make);
                  setEditModel(d.model);
                  setEditSerial(d.serial_number);
                  setEditNotes(d.notes);
                  setEditSpaceId(s.id);
                  setEditing(true);
                }}
              >
                Edit
              </button>
            </div>
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
          </>
        ) : (
          <div className="inline-form">
            <div className="field">
              <label htmlFor={`${editId}-name`}>Name</label>
              <input id={`${editId}-name`} ref={editNameRef} value={editName} onChange={(e) => setEditName(e.target.value)} />
            </div>
            <div className="grid-2">
              <div className="field">
                <label htmlFor={`${editId}-make`}>Make</label>
                <input id={`${editId}-make`} value={editMake} onChange={(e) => setEditMake(e.target.value)} />
              </div>
              <div className="field">
                <label htmlFor={`${editId}-model`}>Model</label>
                <input id={`${editId}-model`} value={editModel} onChange={(e) => setEditModel(e.target.value)} />
              </div>
            </div>
            <div className="grid-2">
              <div className="field">
                <label htmlFor={`${editId}-serial`}>Serial number</label>
                <input id={`${editId}-serial`} value={editSerial} onChange={(e) => setEditSerial(e.target.value)} />
              </div>
              <div className="field">
                <label htmlFor={`${editId}-room`}>Room</label>
                <select id={`${editId}-room`} value={editSpaceId} onChange={(e) => setEditSpaceId(e.target.value)}>
                  {spaces.map((sp) => (
                    <option key={sp.id} value={sp.id}>
                      {sp.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="field">
              <label htmlFor={`${editId}-notes`}>Notes</label>
              <textarea id={`${editId}-notes`} value={editNotes} onChange={(e) => setEditNotes(e.target.value)} />
            </div>
            <div className="form-actions">
              <button type="button" className="btn ghost small" onClick={() => setEditing(false)}>
                Cancel
              </button>
              <button
                type="button"
                className="btn primary small"
                disabled={!editName.trim()}
                onClick={() => {
                  onUpdateItem(d.id, {
                    name: editName.trim(),
                    make: editMake.trim(),
                    model: editModel.trim(),
                    serialNumber: editSerial.trim(),
                    notes: editNotes.trim(),
                    spaceId: editSpaceId,
                  });
                  setEditing(false);
                }}
              >
                Save changes
              </button>
            </div>
          </div>
        )}
      </div>

      <ReferenceSection
        itemId={d.id}
        itemName={d.name}
        make={d.make}
        model={d.model}
        references={d.references}
        kindSuggestions={referenceKindSuggestions}
        onAddReference={onAddReference}
        onDeleteReference={onDeleteReference}
      />

      {d.notes && !editing && (
        <div className="detail-section">
          <h3>Notes</h3>
          <p className="notes-text" style={{ margin: 0 }}>
            {d.notes}
          </p>
        </div>
      )}

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
          <button ref={addPartBtnRef} type="button" className="inline-add-toggle" onClick={() => setPartFormOpen(true)}>
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
