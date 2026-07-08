import { useEffect, useRef, useState } from 'react';
import { motion } from 'motion/react';
import type { Item, Photo, Space } from '../types';
import { PHOTOS_BUCKET, publicUrlFor } from '../lib/supabase';

interface ItemGridProps {
  items: { item: Item; space: Space }[];
  onOpenItem: (itemId: string, spaceId: string) => void;
}

const SWIPE_THRESHOLD = 30;

function sortPhotos(photos: Photo[]): Photo[] {
  return [...photos].sort((a, b) => (b.is_primary ? 1 : 0) - (a.is_primary ? 1 : 0) || a.sort_order - b.sort_order);
}

function ItemCard({ item, index, onOpenItem }: { item: Item; index: number; onOpenItem: (itemId: string, spaceId: string) => void }) {
  const sortedPhotos = sortPhotos(item.photos);
  const [displayIdx, setDisplayIdx] = useState(0);
  const activeIdx = Math.min(displayIdx, Math.max(0, sortedPhotos.length - 1));
  const activePhoto = sortedPhotos[activeIdx] ?? null;
  const subtitle = [item.make, item.model].filter(Boolean).join(' ');

  const thumbRef = useRef<HTMLDivElement>(null);
  const startX = useRef<number | null>(null);
  const dragged = useRef(false);
  const photoCount = useRef(sortedPhotos.length);
  photoCount.current = sortedPhotos.length;
  const openItemRef = useRef(onOpenItem);
  openItemRef.current = onOpenItem;

  // Attached as plain DOM listeners rather than React's onPointer* props: a
  // global gesture tracker (from the motion library used elsewhere in the
  // app) intercepts synthetic pointerdown/pointerup before React's own
  // delegated handlers run, silently swallowing them — pointermove is
  // unaffected, which is what made this so confusing to track down. Native
  // listeners on the node itself see every event regardless.
  //
  // Gesture state (startX/dragged) lives in refs, not closure locals, since
  // this effect can re-run between pointerdown and pointerup — onOpenItem is
  // a fresh function identity from the parent on every render, so relying on
  // a closure-local variable here would silently reset mid-swipe.
  useEffect(() => {
    const el = thumbRef.current;
    if (!el) return;

    function isNavButton(target: EventTarget | null) {
      return target instanceof HTMLElement && target.closest('.thumb-nav') !== null;
    }

    function onDown(e: PointerEvent) {
      if (isNavButton(e.target)) return;
      startX.current = e.clientX;
      dragged.current = false;
    }
    function onMove(e: PointerEvent) {
      if (startX.current !== null && Math.abs(e.clientX - startX.current) > 8) dragged.current = true;
    }
    function onUp(e: PointerEvent) {
      if (isNavButton(e.target) || startX.current === null) return;
      const delta = e.clientX - startX.current;
      startX.current = null;
      if (Math.abs(delta) >= SWIPE_THRESHOLD && photoCount.current > 1) {
        setDisplayIdx((i) => (delta < 0 ? (i + 1) % photoCount.current : (i - 1 + photoCount.current) % photoCount.current));
        return;
      }
      if (!dragged.current) openItemRef.current(item.id, item.space_id);
    }

    el.addEventListener('pointerdown', onDown);
    el.addEventListener('pointermove', onMove);
    el.addEventListener('pointerup', onUp);
    return () => {
      el.removeEventListener('pointerdown', onDown);
      el.removeEventListener('pointermove', onMove);
      el.removeEventListener('pointerup', onUp);
    };
  }, [item.id, item.space_id]);

  function showPrev() {
    setDisplayIdx((i) => (i - 1 + sortedPhotos.length) % sortedPhotos.length);
  }
  function showNext() {
    setDisplayIdx((i) => (i + 1) % sortedPhotos.length);
  }

  return (
    <motion.div
      className="item-card"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, delay: Math.min(index, 10) * 0.025 }}
    >
      <div ref={thumbRef} className="thumb">
        {activePhoto ? <img src={publicUrlFor(PHOTOS_BUCKET, activePhoto.storage_path) ?? undefined} alt="" /> : 'No photo'}
        {sortedPhotos.length > 1 && (
          <>
            <button type="button" className="thumb-nav prev" aria-label="Previous photo" onClick={showPrev}>
              ‹
            </button>
            <button type="button" className="thumb-nav next" aria-label="Next photo" onClick={showNext}>
              ›
            </button>
            <span className="photo-count-badge">
              {activeIdx + 1} / {sortedPhotos.length}
            </span>
          </>
        )}
      </div>
      <button type="button" className="item-card-body" onClick={() => onOpenItem(item.id, item.space_id)}>
        <div className="name">{item.name}</div>
        <div className="subtitle">{subtitle || ' '}</div>
        <div className="meta">
          {item.manual_path && <span className="pill has">Manual on file</span>}
          {item.parts.length > 0 && (
            <span className="pill">
              {item.parts.length} part{item.parts.length === 1 ? '' : 's'}
            </span>
          )}
        </div>
      </button>
    </motion.div>
  );
}

export function ItemGrid({ items, onOpenItem }: ItemGridProps) {
  return (
    <div className="item-grid">
      {items.map(({ item }, i) => (
        <ItemCard key={item.id} item={item} index={i} onOpenItem={onOpenItem} />
      ))}
    </div>
  );
}
