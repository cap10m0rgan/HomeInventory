import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!url || !anonKey) {
  throw new Error(
    'Missing VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY. Copy .env.example to .env.local ' +
      'and fill in your Supabase project values (see README for setup steps).',
  );
}

export const supabase = createClient(url, anonKey);

export const PHOTOS_BUCKET = 'item-photos';
export const MANUALS_BUCKET = 'item-manuals';

export function publicUrlFor(bucket: string, path: string | null | undefined): string | null {
  if (!path) return null;
  return supabase.storage.from(bucket).getPublicUrl(path).data.publicUrl;
}
