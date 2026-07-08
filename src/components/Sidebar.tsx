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
      <div className={`sidebar${expanded ? ' expanded' : ''}`}>
        <button className="sidebar-toggle" aria-label="Toggle spaces menu" onClick={() => setExpanded((v) => !v)}>
          <span className="chevron" style={{ transform: expanded ? 'rotate(180deg)' : 'none' }}>
            &#8250;
          </span>
        </button>

        <div className="sidebar-brand">
          <BlueprintMark size={26} />
          <span className="word">Home Base</span>
        </div>

        <ul className="sidebar-nav">
          {spaces.map((sp) => (
            <li
              key={sp.id}
              className={`nav-item${sp.id === activeSpaceId ? ' active' : ''}`}
              onClick={() => {
                onSelectSpace(sp.id);
                setExpanded(false);
              }}
            >
              <span className="avatar">{initials(sp.name)}</span>
              <span className="label">{sp.name}</span>
              <span className="count">{sp.items.length}</span>
              <span
                className="del"
                onClick={(e) => {
                  e.stopPropagation();
                  onDeleteSpace(sp.id, sp.name);
                }}
              >
                ✕
              </span>
            </li>
          ))}

          <li className="nav-item add-item" onClick={onAddSpace}>
            <span className="avatar">+</span>
            <span className="label">Add space</span>
          </li>
        </ul>

        <div className="sidebar-foot">
          <div className="nav-item" onClick={onSignOut}>
            <span className="avatar">⎋</span>
            <span className="label">Sign out</span>
          </div>
        </div>
      </div>
      <div className={`backdrop${expanded ? ' open' : ''}`} onClick={() => setExpanded(false)} />
    </>
  );
}
