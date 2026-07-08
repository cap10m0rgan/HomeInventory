import { useEffect, useMemo, useState } from 'react';
import { useInventory } from '../hooks/useInventory';
import { useToasts } from '../hooks/useToasts';
import { ItemGrid } from './ItemGrid';
import { AddSpaceModal } from './AddSpaceModal';
import { AddItemModal } from './AddItemModal';
import { ManageSpacesModal } from './ManageSpacesModal';
import { ItemDetailModal } from './ItemDetailModal';
import { Logo } from './Logo';
import type { Item, Space } from '../types';

export function Shell({ userId, onSignOut }: { userId: string; onSignOut: () => void }) {
  const inventory = useInventory(userId);
  const { showToast } = useToasts();

  const [activeSpaceId, setActiveSpaceId] = useState<string | null>(null);
  const [activeItemId, setActiveItemId] = useState<string | null>(null);
  const [activeItemSpaceId, setActiveItemSpaceId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [addSpaceOpen, setAddSpaceOpen] = useState(false);
  const [addItemOpen, setAddItemOpen] = useState(false);
  const [manageSpacesOpen, setManageSpacesOpen] = useState(false);

  useEffect(() => {
    if (!activeSpaceId && inventory.spaces.length > 0) {
      setActiveSpaceId(inventory.spaces[0].id);
    }
  }, [inventory.spaces, activeSpaceId]);

  const activeSpace = inventory.spaces.find((s) => s.id === activeSpaceId) ?? null;

  const searchResults = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    if (!q) return null;
    const results: { item: Item; space: Space }[] = [];
    inventory.spaces.forEach((sp) => {
      sp.items.forEach((it) => {
        const itemHit =
          it.name.toLowerCase().includes(q) || it.model.toLowerCase().includes(q) || it.make.toLowerCase().includes(q);
        const partHit = it.parts.some((p) => p.name.toLowerCase().includes(q) || p.type.toLowerCase().includes(q));
        if (itemHit || partHit) results.push({ item: it, space: sp });
      });
    });
    return results;
  }, [searchTerm, inventory.spaces]);

  const activeItem = activeItemId
    ? inventory.spaces.flatMap((s) => s.items).find((it) => it.id === activeItemId) ?? null
    : null;
  const activeItemSpace = activeItemSpaceId ? inventory.spaces.find((s) => s.id === activeItemSpaceId) ?? null : null;

  function openItem(itemId: string, spaceId: string) {
    setActiveItemId(itemId);
    setActiveItemSpaceId(spaceId);
  }

  function closeItem() {
    setActiveItemId(null);
    setActiveItemSpaceId(null);
  }

  function handleDeleteSpace(id: string, name: string) {
    if (!confirm(`Delete "${name}" and all its items?`)) return;
    inventory.deleteSpace(id);
    if (activeSpaceId === id) setActiveSpaceId(null);
  }

  function handleDeleteItem(id: string, name: string) {
    if (!confirm(`Delete "${name}"? This also removes its logged parts.`)) return;
    inventory.deleteItem(id);
    closeItem();
  }

  const gridItems: { item: Item; space: Space }[] | null =
    searchResults ?? (activeSpace ? activeSpace.items.map((item) => ({ item, space: activeSpace })) : null);

  return (
    <div className="app-shell">
      <div className="app-header">
        <header className="topbar">
          <div className="topbar-brand">
            <Logo size={28} />
            <p className="word">Home Base</p>
          </div>
          <div className="topbar-search">
            <label htmlFor="inventory-search" className="visually-hidden">
              Search items and parts
            </label>
            <input
              id="inventory-search"
              placeholder="Search items and parts…"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <button type="button" className="btn ghost small topbar-signout" onClick={onSignOut}>
            Sign out
          </button>
        </header>

        {!searchTerm.trim() && (
          <nav className="rooms-row" aria-label="Rooms">
            {inventory.spaces.map((sp) => (
              <button
                key={sp.id}
                type="button"
                className={`room-chip${sp.id === activeSpaceId ? ' active' : ''}`}
                aria-current={sp.id === activeSpaceId ? 'true' : undefined}
                onClick={() => setActiveSpaceId(sp.id)}
              >
                {sp.name}
                <span className="count">{sp.items.length}</span>
              </button>
            ))}
            <button type="button" className="room-chip add-chip" onClick={() => setAddSpaceOpen(true)}>
              + Room
            </button>
            {inventory.spaces.length > 0 && (
              <button type="button" className="room-chip manage-chip" onClick={() => setManageSpacesOpen(true)}>
                Manage
              </button>
            )}
          </nav>
        )}
      </div>

      <main className="main" id="main-content">
        {searchTerm.trim() ? (
          <>
            <div className="room-heading">
              <div className="room-heading-text">
                <h1 className="display">Search results</h1>
                <span className="item-count" role="status" aria-live="polite">
                  {searchResults?.length ?? 0} match{searchResults?.length === 1 ? '' : 'es'}
                </span>
              </div>
            </div>
            {searchResults?.length === 0 && <p className="room-empty-hint">Nothing matches yet. Try a different term.</p>}
            <ItemGrid items={gridItems ?? []} onOpenItem={openItem} />
          </>
        ) : inventory.spaces.length === 0 ? (
          <div className="empty-state">
            <div className="big">Nothing here yet</div>
            Click <strong>+ Room</strong> above to add your first room (Kitchen, Garage, Office…).
          </div>
        ) : activeSpace ? (
          <>
            <div className="room-heading">
              <div className="room-heading-text">
                <h1 className="display">{activeSpace.name}</h1>
                <span className="item-count">
                  {activeSpace.items.length} item{activeSpace.items.length === 1 ? '' : 's'}
                </span>
              </div>
              <button type="button" className="btn primary" onClick={() => setAddItemOpen(true)}>
                + Add item
              </button>
            </div>
            {activeSpace.items.length === 0 ? (
              <div className="empty-state">
                <div className="big">No items yet</div>
                Click <strong>+ Add item</strong> above to log the first thing in this room.
              </div>
            ) : (
              <ItemGrid items={gridItems ?? []} onOpenItem={openItem} />
            )}
          </>
        ) : (
          <p className="room-empty-hint">Select or add a room above.</p>
        )}
      </main>

      <AddSpaceModal
        open={addSpaceOpen}
        onClose={() => setAddSpaceOpen(false)}
        onSave={(name) => {
          inventory.createSpace(name);
          setAddSpaceOpen(false);
        }}
      />

      <ManageSpacesModal
        open={manageSpacesOpen}
        onClose={() => setManageSpacesOpen(false)}
        spaces={inventory.spaces}
        onDeleteSpace={handleDeleteSpace}
      />

      <AddItemModal
        open={addItemOpen}
        onClose={() => setAddItemOpen(false)}
        onSave={(fields) => {
          if (!activeSpaceId) {
            showToast('warning', 'Select or create a room first');
            return;
          }
          inventory.createItem(activeSpaceId, fields);
          setAddItemOpen(false);
        }}
      />

      <ItemDetailModal
        item={activeItem}
        space={activeItemSpace}
        onClose={closeItem}
        onAddPhoto={inventory.addPhoto}
        onDeletePhoto={inventory.deletePhoto}
        onSetPrimaryPhoto={inventory.setPrimaryPhoto}
        onAttachManual={inventory.attachManual}
        onAddPart={inventory.addPart}
        onDeletePart={inventory.deletePart}
        onDeleteItem={handleDeleteItem}
      />
    </div>
  );
}
