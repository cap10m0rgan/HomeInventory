import { useEffect, useId, useRef, useState } from 'react';
import type { Reference, ReferenceKind } from '../types';
import { REFERENCES_BUCKET, publicUrlFor } from '../lib/supabase';

const REFERENCE_KINDS: ReferenceKind[] = ['Manual', 'Parts list', 'Receipt', 'Warranty', 'Other'];

type FileCategory = 'pdf' | 'image' | 'video' | 'other';

function fileCategory(ref: Reference): FileCategory {
  const mime = ref.mime_type.toLowerCase();
  if (mime === 'application/pdf') return 'pdf';
  if (mime.startsWith('image/')) return 'image';
  if (mime.startsWith('video/')) return 'video';
  // Camera uploads from some phones arrive with an empty mime type — fall
  // back to the extension so they still get the right icon.
  const ext = ref.filename.split('.').pop()?.toLowerCase() ?? '';
  if (ext === 'pdf') return 'pdf';
  if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'heic', 'heif', 'bmp', 'svg'].includes(ext)) return 'image';
  if (['mp4', 'mov', 'webm', 'mkv', 'avi', 'm4v'].includes(ext)) return 'video';
  return 'other';
}

const CATEGORY_LABEL: Record<FileCategory, string> = {
  pdf: 'PDF',
  image: 'Image',
  video: 'Video',
  other: 'File',
};

// Icons are decorative (aria-hidden) — the visible category label alongside
// each one carries the same information as text.
function FileIcon({ category }: { category: FileCategory }) {
  const common = {
    width: 22,
    height: 22,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.7,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    'aria-hidden': true,
  };
  if (category === 'image') {
    return (
      <svg {...common}>
        <rect x="3" y="4" width="18" height="16" rx="2" />
        <circle cx="8.5" cy="9.5" r="1.5" />
        <path d="M21 16l-5-5-6 6-2.5-2.5L3 19" />
      </svg>
    );
  }
  if (category === 'video') {
    return (
      <svg {...common}>
        <rect x="3" y="4" width="18" height="16" rx="2" />
        <path d="M10 9l5 3-5 3z" />
      </svg>
    );
  }
  // pdf / other: document with a folded corner; PDF adds text lines.
  return (
    <svg {...common}>
      <path d="M6 2.5h8L19 7.5v12a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-15a2 2 0 0 1 2-2z" />
      <path d="M14 2.5v5h5" />
      {category === 'pdf' && (
        <>
          <path d="M8 13h7" />
          <path d="M8 16.5h7" />
        </>
      )}
    </svg>
  );
}

interface ReferenceSectionProps {
  itemId: string;
  itemName: string;
  make: string;
  model: string;
  references: Reference[];
  onAddReference: (itemId: string, file: File, kind: ReferenceKind) => void;
  onDeleteReference: (referenceId: string, storagePath: string) => void;
}

export function ReferenceSection({ itemId, itemName, make, model, references, onAddReference, onDeleteReference }: ReferenceSectionProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [attachOpen, setAttachOpen] = useState(false);
  const [attachKind, setAttachKind] = useState<ReferenceKind>('Manual');
  const [attachFile, setAttachFile] = useState<File | null>(null);

  const menuId = useId();
  const kindSelectId = useId();
  const addBtnRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  const searchUrl = `https://duckduckgo.com/?q=${encodeURIComponent(`${make} ${model || itemName} manual pdf`.trim())}`;

  // Light-dismiss for the add menu: any press outside closes it.
  useEffect(() => {
    if (!menuOpen) return;
    function onPointerDown(e: PointerEvent) {
      const t = e.target;
      if (t instanceof Node && !menuRef.current?.contains(t) && !addBtnRef.current?.contains(t)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener('pointerdown', onPointerDown);
    return () => document.removeEventListener('pointerdown', onPointerDown);
  }, [menuOpen]);

  function closeMenu(refocus: boolean) {
    setMenuOpen(false);
    if (refocus) addBtnRef.current?.focus();
  }

  function resetAttachForm() {
    setAttachOpen(false);
    setAttachKind('Manual');
    setAttachFile(null);
  }

  function handleAttachSave() {
    if (!attachFile) return;
    onAddReference(itemId, attachFile, attachKind);
    resetAttachForm();
  }

  return (
    <div
      className="detail-section"
      onKeyDown={(e) => {
        // While the add menu is open, Escape closes just the menu — without
        // this, the keydown bubbles to the modal and closes the whole dialog
        // (the menu button keeps focus after opening, so a handler on the
        // menu alone would never see the event).
        if (menuOpen && e.key === 'Escape') {
          e.stopPropagation();
          closeMenu(true);
        }
      }}
    >
      <div className="section-head">
        <h3>References</h3>
        <button
          ref={addBtnRef}
          type="button"
          className="section-add"
          aria-expanded={menuOpen}
          aria-controls={menuId}
          onClick={() => setMenuOpen((v) => !v)}
        >
          <span aria-hidden="true">+</span> Add
        </button>
      </div>

      <div className="ref-menu-anchor">
        {menuOpen && (
          <div id={menuId} ref={menuRef} className="ref-menu">
            <a className="ref-menu-option" href={searchUrl} target="_blank" rel="noopener noreferrer" onClick={() => closeMenu(false)}>
              <span className="ref-menu-icon" aria-hidden="true">
                🔍
              </span>
              <span>
                Search online
                <small>Look up “{`${make} ${model || itemName}`.trim()}” manuals in a new tab</small>
              </span>
            </a>
            <button
              type="button"
              className="ref-menu-option"
              onClick={() => {
                closeMenu(false);
                setAttachOpen(true);
              }}
            >
              <span className="ref-menu-icon" aria-hidden="true">
                📎
              </span>
              <span>
                Attach a file
                <small>PDF, photos, or video — manual, parts list, receipt…</small>
              </span>
            </button>
          </div>
        )}
      </div>

      {references.length === 0 && !attachOpen && (
        <p className="empty-note" style={{ margin: 0 }}>
          Nothing on file yet — attach a manual, parts list, or receipt.
        </p>
      )}

      {references.length > 0 && (
        <ul className="ref-list">
          {references.map((r) => {
            const category = fileCategory(r);
            const url = publicUrlFor(REFERENCES_BUCKET, r.storage_path);
            return (
              <li key={r.id} className="ref-row">
                <span className={`ref-icon ${category}`}>
                  <FileIcon category={category} />
                </span>
                <span className="ref-main">
                  {url ? (
                    <a className="ref-name" href={url} target="_blank" rel="noopener noreferrer">
                      {r.filename}
                    </a>
                  ) : (
                    <span className="ref-name">{r.filename}</span>
                  )}
                  <span className="ref-meta">
                    {r.kind} · {CATEGORY_LABEL[category]}
                  </span>
                </span>
                <button
                  type="button"
                  className="row-del"
                  aria-label={`Remove ${r.filename}`}
                  onClick={() => onDeleteReference(r.id, r.storage_path)}
                >
                  ✕
                </button>
              </li>
            );
          })}
        </ul>
      )}

      {attachOpen && (
        <div className="inline-form" style={{ marginTop: 12 }}>
          <div className="grid-2">
            <div className="field">
              <label htmlFor={kindSelectId}>What is this?</label>
              <select id={kindSelectId} value={attachKind} onChange={(e) => setAttachKind(e.target.value as ReferenceKind)}>
                {REFERENCE_KINDS.map((k) => (
                  <option key={k}>{k}</option>
                ))}
              </select>
            </div>
            <div className="field">
              <label htmlFor={`${kindSelectId}-file`}>File</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                <button type="button" className="btn small" onClick={() => fileInput.current?.click()}>
                  Choose file
                </button>
                <span className="field-hint" style={{ margin: 0 }} role="status">
                  {attachFile ? attachFile.name : 'No file chosen'}
                </span>
              </div>
              <input
                id={`${kindSelectId}-file`}
                ref={fileInput}
                type="file"
                accept="application/pdf,image/*,video/*"
                style={{ display: 'none' }}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) setAttachFile(file);
                  e.target.value = '';
                }}
              />
            </div>
          </div>
          <div className="form-actions">
            <button type="button" className="btn ghost small" onClick={resetAttachForm}>
              Cancel
            </button>
            <button type="button" className="btn primary small" disabled={!attachFile} onClick={handleAttachSave}>
              Add reference
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
