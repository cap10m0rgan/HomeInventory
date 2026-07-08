import { useEffect, useMemo, useState } from 'react';
import { useInventory } from '../hooks/useInventory';
import { useToasts } from '../hooks/useToasts';
import { Sidebar } from './Sidebar';
import { ItemGrid } from './ItemGrid';
import { AddSpaceModal } from './AddSpaceModal';
import { AddItemModal } from './AddItemModal';
import { ItemDetailModal } from './ItemDetailModal';
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
        const itemHit = it.name.toLowerCase().includes(q) || it.model.toLowerCase().includes(q);
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

  const gridItems: { item: Item; space: Space }[] | null = searchResults ?? (activeSpace ? activeSpace.items.map((item) => ({ item, space: activeSpace })) : null);

  return (
    <div className="app-shell">
      <Sidebar
        spaces={inventory.spaces}
        activeSpaceId={activeSpaceId}
        onSelectSpace={(id) => {
          setActiveSpaceId(id);
          setSearchTerm('');
        }}
        onAddSpace={() => setAddSpaceOpen(true)}
        onDeleteSpace={handleDeleteSpace}
        onSignOut={onSignOut}
      />

      <div className="main">
        <div className="topbar">
          <input
            className="search"
            placeholder="Search items and parts…"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        {!searchTerm.trim() && (
          <div className="room-chips">
            {inventory.spaces.map((sp) => (
              <button
                key={sp.id}
                type="button"
                className={`room-chip${sp.id === activeSpaceId ? ' active' : ''}`}
                onClick={() => setActiveSpaceId(sp.id)}
              >
                {sp.name}
              </button>
            ))}
            <button type="button" className="room-chip add-chip" onClick={() => setAddSpaceOpen(true)}>
              + Space
            </button>
          </div>
        )}

        {searchTerm.trim() ? (
          <>
            <div className="room-heading">
              <h1 className="bp-display">Search results</h1>
              <span className="item-count">
                {searchResults?.length ?? 0} match{searchResults?.length === 1 ? '' : 'es'}
              </span>
            </div>
            {searchResults?.length === 0 && <p className="room-empty-hint">Nothing matches yet. Try a different term.</p>}
            <ItemGrid items={gridItems ?? []} onOpenItem={openItem} />
          </>
        ) : inventory.spaces.length === 0 ? (
          <div className="empty-state" style={{ marginTop: 40 }}>
            <div className="big">Nothing here yet</div>
            Click <strong>+ Space</strong> above to add your first space (Kitchen, Garage, Office…).
          </div>
        ) : activeSpace ? (
          <>
            <div className="room-heading">
              <h1 className="bp-display">{activeSpace.name}</h1>
              <span className="item-count">
                {activeSpace.items.length} item{activeSpace.items.length === 1 ? '' : 's'}
              </span>
            </div>
            {activeSpace.items.length === 0 && <p className="room-empty-hint">No items yet — add the first one below.</p>}
            <ItemGrid items={gridItems ?? []} onOpenItem={openItem} onAddItem={() => setAddItemOpen(true)} />
          </>
        ) : (
          <p className="room-empty-hint">Open the menu and select or add a space.</p>
        )}
      </div>

      <AddSpaceModal open={addSpaceOpen} onClose={() => setAddSpaceOpen(false)} onSave={(name) => {
        inventory.createSpace(name);
        setAddSpaceOpen(false);
      }} />

      <AddItemModal
        open={addItemOpen}
        onClose={() => setAddItemOpen(false)}
        onSave={(fields) => {
          if (!activeSpaceId) {
            showToast('warning', 'Select or create a space first');
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
        onUploadPhoto={inventory.updateItemPhoto}
        onAttachManual={inventory.attachManual}
        onAddPart={inventory.addPart}
        onDeletePart={inventory.deletePart}
        onDeleteItem={handleDeleteItem}
      />
    </div>
  );
}
