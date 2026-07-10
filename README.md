# Home Base — Home Inventory

Home asset tracking. Appliances and electronics — organized by space, with
photos, reference files (manuals, parts lists, receipts…), and
parts/consumables on file for each item.

A Vite + React + TypeScript frontend, backed by [Supabase](https://supabase.com)
(Postgres + Auth + Storage), auto-deployed to **GitHub Pages** on every push
to `main`.

## One-time setup

### 1. Create a Supabase project

1. Go to [supabase.com](https://supabase.com) and create a free account/project.
2. In the project dashboard, open **SQL Editor → New query**, paste the contents
   of [`supabase/schema.sql`](./supabase/schema.sql), and run it. This creates
   the `spaces`, `items`, `item_photos`, `item_references`, and `parts` tables,
   row-level security policies, and the two storage buckets (`item-photos`,
   `item-manuals` — the latter holds all reference files, the id is historical).
3. Go to **Project Settings → API** and copy:
   - **Project URL** → `VITE_SUPABASE_URL`
   - **anon public** key → `VITE_SUPABASE_ANON_KEY`

### 2. Create your account (single-user app)

This app has no admin invite system — it's meant for one household.

1. Run the app locally (see below) or temporarily deploy it, and use the
   **"Create an account"** link on the login screen once, with your own email
   and a password.
2. Confirm the account via the email Supabase sends.
3. In the Supabase dashboard, go to **Authentication → Providers → Email** and
   turn **off** "Allow new users to sign up." This prevents anyone else who
   finds your public URL from creating an account.

### 3. Configure GitHub Pages + secrets

1. In the repo: **Settings → Pages → Build and deployment → Source** → select
   **GitHub Actions**.
2. **Settings → Secrets and variables → Actions → New repository secret**, add:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
3. Push to `main` (or run the **Deploy to GitHub Pages** workflow manually
   from the Actions tab). The site will be live at
   `https://<your-username>.github.io/HomeInventory/`.

### Upgrading an existing project (already ran `schema.sql` once)

Run the files in [`supabase/migrations/`](./supabase/migrations/) that you
haven't applied yet, in order, in the SQL editor. Each is safe to re-run:

- `0002_photos_and_fields.sql` — adds the `item_photos` table and
  `items.make` / `items.serial_number` columns, migrating any existing single
  photo per item into the new table as its cover photo.
- `0003_references.sql` — adds the `item_references` table (typed reference
  files: manual, parts list, receipt, warranty…), preserving any
  already-attached manual as a `Manual` reference, and drops the old
  single-manual columns from `items`.

## Local development

```bash
cp .env.example .env.local   # fill in your Supabase URL + anon key
npm install
npm run dev
```

## Data model & privacy notes

- Every row in `spaces` / `items` / `item_photos` / `item_references` /
  `parts` is scoped to `auth.uid()` via row-level security — only your
  signed-in account can read or write them.
- Photo and reference storage buckets are **public-read** (so `<img>` tags
  and file links work without signed-URL refresh logic), but object paths are
  random UUIDs and the buckets aren't browsable — effectively unlisted rather
  than indexed. Uploads/deletes are still restricted to the owning account.
  If you want stricter privacy later, switch the buckets to private and
  generate signed URLs on read.

## Tip: capturing model/serial numbers

Rather than typing them off the rating plate, take a photo of the plate with
your phone and use the OS text-selection built into the photo viewer
(long-press the text in the image on iOS or Android) to copy the model and
serial numbers, then paste them into the item form.
