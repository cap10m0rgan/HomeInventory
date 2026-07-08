import { motion } from 'motion/react';
import type { Item, Space } from '../types';
import { PHOTOS_BUCKET, publicUrlFor } from '../lib/supabase';

interface ItemGridProps {
  items: { item: Item; space: Space }[];
  onOpenItem: (itemId: string, spaceId: string) => void;
  onAddItem?: () => void;
}

export function ItemGrid({ items, onOpenItem, onAddItem }: ItemGridProps) {
  return (
    <div className="item-grid">
      {items.map(({ item }, i) => (
        <motion.button
          type="button"
          key={item.id}
          className="item-card"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.28, delay: Math.min(i, 10) * 0.03 }}
          onClick={() => onOpenItem(item.id, item.space_id)}
        >
          <div className="thumb">
            {item.photo_path ? (
              <img src={publicUrlFor(PHOTOS_BUCKET, item.photo_path) ?? undefined} alt="" />
            ) : (
              'No image'
            )}
          </div>
          <div className="body">
            <div className="name">{item.name}</div>
            <div className="meta">
              {item.manual_path ? <span className="has">Manual ✓</span> : <span>No manual</span>}
              <span>
                {item.parts.length} part{item.parts.length === 1 ? '' : 's'}
              </span>
            </div>
          </div>
        </motion.button>
      ))}
      {onAddItem && (
        <button type="button" className="add-item-card" onClick={onAddItem}>
          + Add item
        </button>
      )}
    </div>
  );
}
