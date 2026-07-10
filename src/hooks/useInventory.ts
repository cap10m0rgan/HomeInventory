import { useCallback, useEffect, useState } from 'react';
import { PHOTOS_BUCKET, REFERENCES_BUCKET, supabase } from '../lib/supabase';
import { compressImage, rotateImage } from '../lib/image';
import { useToasts } from './useToasts';
import type { Part, PartType, Photo, Reference, Space } from '../types';

export function useInventory(userId: string | undefined) {
  const [spaces, setSpaces] = useState<Space[]>([]);
  const [loading, setLoading] = useState(true);
  const { showToast } = useToasts();

  const refresh = useCallback(async () => {
    if (!userId) return;
    const [
      { data: spacesData, error: spacesErr },
      { data: itemsData, error: itemsErr },
      { data: partsData, error: partsErr },
      { data: photosData, error: photosErr },
      { data: referencesData, error: referencesErr },
    ] = await Promise.all([
      supabase.from('spaces').select('*').order('sort_order').order('created_at'),
      supabase.from('items').select('*').order('created_at'),
      supabase.from('parts').select('*').order('created_at'),
      supabase.from('item_photos').select('*').order('sort_order').order('created_at'),
      supabase.from('item_references').select('*').order('created_at'),
    ]);

    const err = spacesErr || itemsErr || partsErr || photosErr || referencesErr;
    if (err) {
      showToast('error', "Couldn't load your inventory", err.message);
      setLoading(false);
      return;
    }

    const partsByItem = new Map<string, Part[]>();
    (partsData ?? []).forEach((p) => {
      const list = partsByItem.get(p.item_id) ?? [];
      list.push(p as Part);
      partsByItem.set(p.item_id, list);
    });

    const photosByItem = new Map<string, Photo[]>();
    (photosData ?? []).forEach((ph) => {
      const list = photosByItem.get(ph.item_id) ?? [];
      list.push(ph as Photo);
      photosByItem.set(ph.item_id, list);
    });

    const referencesByItem = new Map<string, Reference[]>();
    (referencesData ?? []).forEach((r) => {
      const list = referencesByItem.get(r.item_id) ?? [];
      list.push(r as Reference);
      referencesByItem.set(r.item_id, list);
    });

    const itemsBySpace = new Map<string, Space['items']>();
    (itemsData ?? []).forEach((it) => {
      const list = itemsBySpace.get(it.space_id) ?? [];
      list.push({
        ...it,
        parts: partsByItem.get(it.id) ?? [],
        photos: photosByItem.get(it.id) ?? [],
        references: referencesByItem.get(it.id) ?? [],
      });
      itemsBySpace.set(it.space_id, list);
    });

    setSpaces((spacesData ?? []).map((sp) => ({ ...sp, items: itemsBySpace.get(sp.id) ?? [] })));
    setLoading(false);
  }, [userId, showToast]);

  useEffect(() => {
    setLoading(true);
    refresh();
  }, [refresh]);

  async function guarded<T>(action: () => Promise<T>, failTitle: string): Promise<T | null> {
    try {
      return await action();
    } catch (err) {
      showToast('error', failTitle, err instanceof Error ? err.message : String(err));
      return null;
    }
  }

  async function createSpace(name: string) {
    if (!userId) return;
    await guarded(async () => {
      const { error } = await supabase.from('spaces').insert({ name, user_id: userId, sort_order: spaces.length });
      if (error) throw error;
      await refresh();
    }, "Couldn't add space");
  }

  async function deleteSpace(id: string) {
    await guarded(async () => {
      const { error } = await supabase.from('spaces').delete().eq('id', id);
      if (error) throw error;
      await refresh();
    }, "Couldn't delete space");
  }

  async function createItem(
    spaceId: string,
    fields: { name: string; make: string; model: string; serialNumber: string; notes: string; photoFiles: File[] },
  ) {
    if (!userId) return;
    await guarded(async () => {
      const { data: inserted, error } = await supabase
        .from('items')
        .insert({
          space_id: spaceId,
          user_id: userId,
          name: fields.name,
          make: fields.make,
          model: fields.model,
          serial_number: fields.serialNumber,
          notes: fields.notes,
        })
        .select()
        .single();
      if (error) throw error;

      // Sequential on purpose: the first photo is the cover, and uploading in
      // order keeps sort stable (rows are ordered by created_at).
      for (let i = 0; i < fields.photoFiles.length; i++) {
        await addPhotoInternal(inserted.id, fields.photoFiles[i], i === 0);
      }
      await refresh();
    }, "Couldn't add item");
  }

  async function updateItem(
    itemId: string,
    fields: { name: string; make: string; model: string; serialNumber: string; notes: string; spaceId: string },
  ) {
    await guarded(async () => {
      const { error } = await supabase
        .from('items')
        .update({
          name: fields.name,
          make: fields.make,
          model: fields.model,
          serial_number: fields.serialNumber,
          notes: fields.notes,
          space_id: fields.spaceId,
        })
        .eq('id', itemId);
      if (error) throw error;
      await refresh();
    }, "Couldn't update item");
  }

  async function deleteItem(id: string) {
    await guarded(async () => {
      const { error } = await supabase.from('items').delete().eq('id', id);
      if (error) throw error;
      await refresh();
    }, "Couldn't delete item");
  }

  async function addPhotoInternal(itemId: string, file: File, makePrimary: boolean) {
    const blob = await compressImage(file, 1400, 0.85);
    const path = `${userId}/${itemId}/${crypto.randomUUID()}.jpg`;
    const { error: uploadErr } = await supabase.storage.from(PHOTOS_BUCKET).upload(path, blob, { contentType: 'image/jpeg' });
    if (uploadErr) throw uploadErr;

    if (makePrimary) {
      // Only one row may have is_primary=true (enforced by a partial unique
      // index) — clear the existing primary first so the insert doesn't 409.
      await supabase.from('item_photos').update({ is_primary: false }).eq('item_id', itemId).eq('is_primary', true);
    }
    const { error: insertErr } = await supabase
      .from('item_photos')
      .insert({ item_id: itemId, user_id: userId, storage_path: path, is_primary: makePrimary });
    if (insertErr) throw insertErr;
  }

  async function addPhoto(itemId: string, file: File, makePrimary: boolean) {
    await guarded(async () => {
      await addPhotoInternal(itemId, file, makePrimary);
      await refresh();
    }, "Couldn't add photo");
  }

  async function deletePhoto(itemId: string, photoId: string, storagePath: string, wasPrimary: boolean) {
    await guarded(async () => {
      const { error: dbErr } = await supabase.from('item_photos').delete().eq('id', photoId);
      if (dbErr) throw dbErr;
      // Best-effort: reclaim storage. Not fatal if this fails (e.g. already gone).
      await supabase.storage.from(PHOTOS_BUCKET).remove([storagePath]);

      if (wasPrimary) {
        const { data: remaining } = await supabase
          .from('item_photos')
          .select('id')
          .eq('item_id', itemId)
          .order('sort_order')
          .order('created_at')
          .limit(1);
        if (remaining && remaining.length > 0) {
          await supabase.from('item_photos').update({ is_primary: true }).eq('id', remaining[0].id);
        }
      }
      await refresh();
    }, "Couldn't delete photo");
  }

  async function rotatePhoto(photoId: string, storagePath: string) {
    if (!userId) return;
    await guarded(async () => {
      const { data: blob, error: dlErr } = await supabase.storage.from(PHOTOS_BUCKET).download(storagePath);
      if (dlErr) throw dlErr;
      const rotated = await rotateImage(blob);
      // Upload under a fresh path instead of overwriting: the public URL is
      // CDN-cached, so replacing the same object would keep serving the old
      // orientation for a while.
      const dir = storagePath.slice(0, storagePath.lastIndexOf('/'));
      const newPath = `${dir}/${crypto.randomUUID()}.jpg`;
      const { error: upErr } = await supabase.storage.from(PHOTOS_BUCKET).upload(newPath, rotated, { contentType: 'image/jpeg' });
      if (upErr) throw upErr;
      const { error: dbErr } = await supabase.from('item_photos').update({ storage_path: newPath }).eq('id', photoId);
      if (dbErr) {
        // Roll back the orphan upload before surfacing the failure.
        await supabase.storage.from(PHOTOS_BUCKET).remove([newPath]);
        throw dbErr;
      }
      await supabase.storage.from(PHOTOS_BUCKET).remove([storagePath]);
      await refresh();
    }, "Couldn't rotate photo");
  }

  async function setPrimaryPhoto(itemId: string, photoId: string) {
    await guarded(async () => {
      await supabase.from('item_photos').update({ is_primary: false }).eq('item_id', itemId).eq('is_primary', true);
      const { error } = await supabase.from('item_photos').update({ is_primary: true }).eq('id', photoId);
      if (error) throw error;
      await refresh();
    }, "Couldn't set cover photo");
  }

  async function addReference(itemId: string, file: File, kind: string) {
    if (!userId) return;
    await guarded(async () => {
      // Kind is free text now — normalize at the DB boundary so every caller
      // gets the same hygiene (a check constraint enforces the cap server-side).
      const cleanKind = kind.replace(/\s+/g, ' ').trim().slice(0, 40) || 'Other';
      const path = `${userId}/${itemId}/${crypto.randomUUID()}-${file.name}`;
      const { error: uploadErr } = await supabase.storage
        .from(REFERENCES_BUCKET)
        .upload(path, file, { contentType: file.type || 'application/octet-stream' });
      if (uploadErr) throw uploadErr;
      const { error: insertErr } = await supabase
        .from('item_references')
        .insert({ item_id: itemId, user_id: userId, kind: cleanKind, filename: file.name, storage_path: path, mime_type: file.type || '' });
      if (insertErr) throw insertErr;
      await refresh();
    }, "Couldn't attach file");
  }

  async function deleteReference(referenceId: string, storagePath: string) {
    await guarded(async () => {
      const { error } = await supabase.from('item_references').delete().eq('id', referenceId);
      if (error) throw error;
      // Best-effort: reclaim storage. Not fatal if this fails (e.g. already gone).
      await supabase.storage.from(REFERENCES_BUCKET).remove([storagePath]);
      await refresh();
    }, "Couldn't remove file");
  }

  async function addPart(itemId: string, part: { type: PartType; name: string; link: string; notes: string }) {
    if (!userId) return;
    await guarded(async () => {
      const { error } = await supabase.from('parts').insert({ item_id: itemId, user_id: userId, ...part });
      if (error) throw error;
      await refresh();
    }, "Couldn't save part");
  }

  async function deletePart(id: string) {
    await guarded(async () => {
      const { error } = await supabase.from('parts').delete().eq('id', id);
      if (error) throw error;
      await refresh();
    }, "Couldn't delete part");
  }

  return {
    spaces,
    loading,
    createSpace,
    deleteSpace,
    createItem,
    updateItem,
    deleteItem,
    addPhoto,
    deletePhoto,
    setPrimaryPhoto,
    rotatePhoto,
    addReference,
    deleteReference,
    addPart,
    deletePart,
  };
}
