import { motion } from 'motion/react';
import type { Item, Space } from '../types';
import { PHOTOS_BUCKET, publicUrlFor } from '../lib/supabase';

interface ItemGridProps {
  items: { item: Item; space: Space }[];
  onOpenItem: (itemId: string, spaceId: string) => void;
}

function coverPhoto(item: Item) {
  return item.photos.find((p) => p.is_primary) ?? item.photos[0] ?? null;
}

export function ItemGrid({ items, onOpenItem }: ItemGridProps) {
  return (
    <div className="item-grid">
      {items.map(({ item }, i) => {
        const cover = coverPhoto(item);
        const subtitle = [item.make, item.model].filter(Boolean).join(' ');
        return (
          <motion.button
            type="button"
            key={item.id}
            className="item-card"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25, delay: Math.min(i, 10) * 0.025 }}
            onClick={() => onOpenItem(item.id, item.space_id)}
          >
            <div className="thumb">
              {cover ? <img src={publicUrlFor(PHOTOS_BUCKET, cover.storage_path) ?? undefined} alt="" /> : 'No photo'}
              {item.photos.length > 1 && <span className="photo-count-badge">1 / {item.photos.length}</span>}
            </div>
            <div className="body">
              <div className="name">{item.name}</div>
              <div className="subtitle">{subtitle || ' '}</div>
              <div className="meta">
                {item.manual_path && <span className="pill has">Manual on file</span>}
                {item.parts.length > 0 && (
                  <span className="pill">
                    {item.parts.length} part{item.parts.length === 1 ? '' : 's'}
                  </span>
                )}
              </div>
            </div>
          </motion.button>
        );
      })}
    </div>
  );
}
