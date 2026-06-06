# Azaterra CRM

A simple sales-inquiry CRM built for **Azaterra Crop Science**. Sales reps capture inquiries (neem oil, karanja oil, custom formulations), then move them through a pipeline from `New` to `Won/Lost`.

## Stack

- Next.js 14 (App Router) + TypeScript + Tailwind
- Prisma ORM + SQLite (local) — easy swap to Postgres for shared deployment

## Run locally

```bash
cd "CRM Tool"
npm install
npx prisma db push     # creates prisma/dev.db
npm run dev            # http://localhost:3001
```

## Deploy with a shared backend (multi-rep)

When you're ready for multiple sales reps to share the same data:

1. Spin up a free Postgres DB (recommended: [Neon](https://neon.tech) or [Supabase](https://supabase.com)).
2. Edit `prisma/schema.prisma` and change the datasource:
   ```prisma
   datasource db {
     provider = "postgresql"
     url      = env("DATABASE_URL")
   }
   ```
3. Set `DATABASE_URL=postgresql://...` in your hosting environment (Vercel project settings).
4. Run `npx prisma db push` against the new database.
5. Deploy to Vercel (`vercel --prod`).

## Features (v1)

- **Inquiry capture** — form with Azaterra-specific fields:
  - Customer type (Farmer / Distributor / Manufacturer / Formulator / Trader)
  - Product (Neem Oil cold-press, Karanja/Pongamia oil cold-press, Custom Formulation, Base Formulation)
  - Quantity + unit (L / Barrels / MT / KG), packaging (50L / 200L HDPE / MS Drum / IBC / Custom)
  - Country, source (Website / Exhibition / Referral / WhatsApp …)
  - Spec notes (e.g. "1500 ppm azadirachtin"), regulatory notes
- **Pipeline (kanban)** — New → Contacted → Sample Sent → Quoted → Negotiation → Won / Lost
- **List view** — search + filter by stage, product, country
- **Detail/edit** — change stage, log notes, set next-action date, assign sales rep

## File layout

```
CRM Tool/
├── app/
│   ├── page.tsx                 # Pipeline (homepage)
│   ├── layout.tsx
│   ├── inquiries/
│   │   ├── page.tsx             # List view
│   │   ├── new/page.tsx         # New inquiry form
│   │   └── [id]/page.tsx        # Detail/edit
│   └── api/inquiries/...        # REST endpoints
├── components/                  # InquiryForm, Pipeline, InquiriesTable, InquiryDetail
├── lib/
│   ├── db.ts                    # Prisma client
│   └── options.ts               # Stages, products, sources (edit to taste)
└── prisma/schema.prisma
```

## Customising

- **Add/rename a stage** → edit `lib/options.ts` (`STAGES`, `STAGE_LABELS`, `STAGE_COLORS`).
- **Add a product** → append to `PRODUCTS` in `lib/options.ts`.
- **Add a field to the inquiry** → add it to `prisma/schema.prisma`, run `npx prisma db push`, then expose it in `components/InquiryForm.tsx`.

## IndiaMART Gmail lead capture

The IndiaMART lead flow uses direct Gmail sync:

- Sign in as the Owner and open **IndiaMART**.
- Click **Connect Gmail** and connect `Azaterracrop@gmail.com`.
- Click **Check Gmail**. This calls `POST /api/indiamart/gmail-sync`, searches Gmail with `INDIAMART_GMAIL_QUERY`, parses matching buyer emails, stores/dedupes the leads, and creates CRM inquiries.

The Vercel cron at `/api/auth/sync-indiamart-gmail-cron` runs the direct Gmail pull for connected accounts. Set `CRON_SECRET` if you want to require a bearer token outside Vercel cron.

## Roadmap candidates (not in v1)

- Auth + multi-rep login (NextAuth + Postgres)
- Dashboard charts (inquiries by country / product / stage, conversion %)
- CSV / Excel export
- File attachments (PDFs, COAs, photos)
- Email/WhatsApp activity log

---

## New Inquiry module (RBAC, Supabase-backed)

`/inquiries/new` now renders **two completely different UIs** based on the logged-in user's role:

| Role | UI | Behaviour |
|---|---|---|
| **Owner** | Full desktop form (5 sections — Contact, Classification, Product, Pipeline & Deal, Notes) | All fields visible, free choice of all dropdowns |
| **Sales Rep** | Mobile-first wizard (5 steps with large tap targets) | Country auto-set to India, Currency to INR, rep auto-assigned. Regulatory & Inquiry Source fields hidden. Offline submissions saved to `localStorage` and synced later. |

### Supabase setup

1. Create a project at [supabase.com](https://supabase.com).
2. Run [supabase/migrations/20260518000000_inquiries.sql](supabase/migrations/20260518000000_inquiries.sql) in the Supabase SQL editor. This creates:
   - `profiles` table (extends `auth.users` with a `role` enum: `Owner` | `SalesRep`)
   - `inquiries` table with all enums (`customer_type`, `inquiry_stage`, `quantity_unit`)
   - Auto-trigger that creates a profile row on every signup
   - RLS policies: Owners read/write everything; Reps see only inquiries they created or are assigned to
3. Copy `.env.example` → `.env.local` and fill in:
   ```bash
   NEXT_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=...
   ```
4. Restart dev server. Sign up a user in Supabase Auth, then promote them to Owner in SQL:
   ```sql
   update public.profiles set role = 'Owner' where id = '<auth-uid>';
   ```

### Demo mode (no Supabase configured)

If the Supabase env vars are not set, `/inquiries/new` shows a yellow banner with a role toggle so you can preview both UIs immediately. Submissions are saved to the legacy SQLite DB (with a best-effort stage mapping: `Quotation` → `Quoted`, `Closed Won` → `Won`, `Closed Lost` → `Lost`).

### Schema note

The new Supabase enums are intentionally different from the legacy SQLite `customer_type` / `stage` / `unit` values used by the Pipeline page. The legacy and new schemas coexist for now. When you're ready, migrate the Pipeline and the rest of the app to Supabase by repointing those pages at the new table.

### File layout (added)

```
supabase/migrations/        # SQL migration
lib/
├── supabase/client.ts      # Browser Supabase client
├── supabase/server.ts      # Server Supabase client (cookies-aware)
├── auth.ts                 # getSessionUser() server helper
├── inquiryOptions.ts       # New enums + InquiryInsert type
└── draftStorage.ts         # Offline localStorage drafts
components/inquiry/
├── NewInquiryRouter.tsx    # Role switcher (real auth + demo)
├── OwnerInquiryForm.tsx    # Desktop form
├── RepInquiryWizard.tsx    # Mobile wizard shell
├── SuccessScreen.tsx       # Big green tick + Done
├── submit.ts               # Supabase OR legacy fallback + offline draft
└── wizard/                 # StepContact, StepProduct, StepQuantity, StepNextAction, StepNotes
```
