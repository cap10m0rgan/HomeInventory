# Home Base — Home Inventory

Home asset tracking. Appliances and electronics — organized by space, with
photos, manuals, and parts/consumables on file for each item.

A Vite + React + TypeScript frontend, backed by [Supabase](https://supabase.com)
(Postgres + Auth + Storage), auto-deployed to **GitHub Pages** on every push
to `main`.

## One-time setup

### 1. Create a Supabase project

1. Go to [supabase.com](https://supabase.com) and create a free account/project.
2. In the project dashboard, open **SQL Editor → New query**, paste the contents
   of [`supabase/schema.sql`](./supabase/schema.sql), and run it. This creates
   the `spaces`, `items`, and `parts` tables, row-level security policies, and
   the two storage buckets (`item-photos`, `item-manuals`).
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

If you set this up before multi-photo support and Make/Serial Number fields
existed, run [`supabase/migrations/0002_photos_and_fields.sql`](./supabase/migrations/0002_photos_and_fields.sql)
in the SQL editor. It adds the new `item_photos` table and `items.make` /
`items.serial_number` columns, migrates any existing single photo per item
into the new table as its cover photo, and is safe to re-run.

## Local development

```bash
cp .env.example .env.local   # fill in your Supabase URL + anon key
npm install
npm run dev
```

## Data model & privacy notes

- Every row in `spaces` / `items` / `item_photos` / `parts` is scoped to
  `auth.uid()` via row-level security — only your signed-in account can read
  or write them.
- Photo and manual storage buckets are **public-read** (so `<img>` tags and
  manual links work without signed-URL refresh logic), but object paths are
  random UUIDs and the buckets aren't browsable — effectively unlisted rather
  than indexed. Uploads/deletes are still restricted to the owning account.
  If you want stricter privacy later, switch the buckets to private and
  generate signed URLs on read.

## Notes on the OCR "Scan model/serial label" feature

Text recognition runs entirely client-side via
[Tesseract.js](https://github.com/naptha/tesseract.js) (lazy-loaded only when
you tap the scan button, so it doesn't add to the initial page weight).
Recognized text lines are shown as candidates you tap to fill into Model or
Serial Number — nothing is auto-filled silently, since OCR on small,
reflective, or angled rating plates is inherently unreliable. For best
results: fill the frame with the plate, use even lighting, and hold the
camera as parallel to the label as possible.
