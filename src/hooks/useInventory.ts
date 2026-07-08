import { useCallback, useEffect, useState } from 'react';
import { MANUALS_BUCKET, PHOTOS_BUCKET, supabase } from '../lib/supabase';
import { compressImage } from '../lib/image';
import { useToasts } from './useToasts';
import type { Part, PartType, Space } from '../types';

export function useInventory(userId: string | undefined) {
  const [spaces, setSpaces] = useState<Space[]>([]);
  const [loading, setLoading] = useState(true);
  const { showToast } = useToasts();

  const refresh = useCallback(async () => {
    if (!userId) return;
    const [{ data: spacesData, error: spacesErr }, { data: itemsData, error: itemsErr }, { data: partsData, error: partsErr }] =
      await Promise.all([
        supabase.from('spaces').select('*').order('sort_order').order('created_at'),
        supabase.from('items').select('*').order('created_at'),
        supabase.from('parts').select('*').order('created_at'),
      ]);

    const err = spacesErr || itemsErr || partsErr;
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

    const itemsBySpace = new Map<string, Space['items']>();
    (itemsData ?? []).forEach((it) => {
      const list = itemsBySpace.get(it.space_id) ?? [];
      list.push({ ...it, parts: partsByItem.get(it.id) ?? [] });
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
    fields: { name: string; model: string; notes: string; photoFile: File | null },
  ) {
    if (!userId) return;
    await guarded(async () => {
      const { data: inserted, error } = await supabase
        .from('items')
        .insert({ space_id: spaceId, user_id: userId, name: fields.name, model: fields.model, notes: fields.notes })
        .select()
        .single();
      if (error) throw error;

      if (fields.photoFile) {
        await uploadPhotoInternal(inserted.id, fields.photoFile);
      }
      await refresh();
    }, "Couldn't add item");
  }

  async function deleteItem(id: string) {
    await guarded(async () => {
      const { error } = await supabase.from('items').delete().eq('id', id);
      if (error) throw error;
      await refresh();
    }, "Couldn't delete item");
  }

  async function uploadPhotoInternal(itemId: string, file: File) {
    const blob = await compressImage(file, 1000, 0.82);
    const path = `${userId}/${itemId}/${crypto.randomUUID()}.jpg`;
    const { error: uploadErr } = await supabase.storage.from(PHOTOS_BUCKET).upload(path, blob, { contentType: 'image/jpeg' });
    if (uploadErr) throw uploadErr;
    const { error: updateErr } = await supabase.from('items').update({ photo_path: path }).eq('id', itemId);
    if (updateErr) throw updateErr;
  }

  async function updateItemPhoto(itemId: string, file: File) {
    await guarded(async () => {
      await uploadPhotoInternal(itemId, file);
      await refresh();
    }, "Couldn't save photo");
  }

  async function attachManual(itemId: string, file: File) {
    if (!userId) return;
    await guarded(async () => {
      const path = `${userId}/${itemId}/${crypto.randomUUID()}-${file.name}`;
      const { error: uploadErr } = await supabase.storage.from(MANUALS_BUCKET).upload(path, file, { contentType: 'application/pdf' });
      if (uploadErr) throw uploadErr;
      const { error: updateErr } = await supabase
        .from('items')
        .update({ manual_path: path, manual_filename: file.name })
        .eq('id', itemId);
      if (updateErr) throw updateErr;
      await refresh();
    }, "Couldn't attach manual");
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
    deleteItem,
    updateItemPhoto,
    attachManual,
    addPart,
    deletePart,
  };
}
