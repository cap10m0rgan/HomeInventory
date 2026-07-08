import { useState } from 'react';
import type { Space } from '../types';
import { BlueprintMark } from './BlueprintMark';

interface SidebarProps {
  spaces: Space[];
  activeSpaceId: string | null;
  onSelectSpace: (id: string) => void;
  onAddSpace: () => void;
  onDeleteSpace: (id: string, name: string) => void;
  onSignOut: () => void;
}

function initials(name: string) {
  return (name.trim()[0] || '?').toUpperCase();
}

export function Sidebar({ spaces, activeSpaceId, onSelectSpace, onAddSpace, onDeleteSpace, onSignOut }: SidebarProps) {
  const [expanded, setExpanded] = useState(false);

  return (
    <>
      <nav className={`sidebar${expanded ? ' expanded' : ''}`} aria-label="Spaces">
        <button className="sidebar-toggle" aria-label={expanded ? 'Collapse spaces menu' : 'Expand spaces menu'} aria-expanded={expanded} onClick={() => setExpanded((v) => !v)}>
          <span className="chevron" aria-hidden="true" style={{ transform: expanded ? 'rotate(180deg)' : 'none' }}>
            &#8250;
          </span>
        </button>

        <div className="sidebar-brand">
          <BlueprintMark size={26} />
          <span className="word">Home Base</span>
        </div>

        <ul className="sidebar-nav">
          {spaces.map((sp) => (
            <li key={sp.id} className="nav-row">
              <button
                type="button"
                className={`nav-item${sp.id === activeSpaceId ? ' active' : ''}`}
                aria-current={sp.id === activeSpaceId ? 'true' : undefined}
                onClick={() => {
                  onSelectSpace(sp.id);
                  setExpanded(false);
                }}
              >
                <span className="avatar" aria-hidden="true">
                  {initials(sp.name)}
                </span>
                <span className="label">{sp.name}</span>
                <span className="count">{sp.items.length}</span>
              </button>
              <button type="button" className="del" aria-label={`Delete ${sp.name}`} onClick={() => onDeleteSpace(sp.id, sp.name)}>
                ✕
              </button>
            </li>
          ))}

          <li>
            <button type="button" className="nav-item add-item" onClick={onAddSpace}>
              <span className="avatar" aria-hidden="true">
                +
              </span>
              <span className="label">Add space</span>
            </button>
          </li>
        </ul>

        <div className="sidebar-foot">
          <button type="button" className="nav-item" onClick={onSignOut}>
            <span className="avatar" aria-hidden="true">
              ⎋
            </span>
            <span className="label">Sign out</span>
          </button>
        </div>
      </nav>
      <div className={`backdrop${expanded ? ' open' : ''}`} onClick={() => setExpanded(false)} />
    </>
  );
}
