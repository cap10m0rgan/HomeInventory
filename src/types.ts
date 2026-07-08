export type PartType = 'Filter' | 'Replacement part' | 'Battery' | 'Consumable' | 'Accessory' | 'Other';

export interface Part {
  id: string;
  item_id: string;
  type: PartType;
  name: string;
  link: string;
  notes: string;
  created_at: string;
}

export interface Photo {
  id: string;
  item_id: string;
  storage_path: string;
  is_primary: boolean;
  sort_order: number;
  created_at: string;
}

export interface Item {
  id: string;
  space_id: string;
  name: string;
  make: string;
  model: string;
  serial_number: string;
  notes: string;
  manual_path: string | null;
  manual_filename: string | null;
  created_at: string;
  parts: Part[];
  photos: Photo[];
}

export interface Space {
  id: string;
  name: string;
  sort_order: number;
  created_at: string;
  items: Item[];
}

export type ToastType = 'error' | 'success' | 'warning' | 'info';

export interface Toast {
  id: string;
  type: ToastType;
  title: string;
  detail?: string;
}
