# BlackBox Logistics — Delivery Tracking System

A web-based delivery tracking application for BlackBox Logistics, a motorcycle dispatch company operating in Lagos, Nigeria. Built with Next.js, Supabase, and Tailwind CSS.

## Features

- **Customer Order Form** — Public form to place delivery orders across 18 Lagos zones (no login required)
- **Tracking System** — Unique BB-XXXXXX tracking IDs with visual progress bar and timeline
- **Rider Portal** — PIN-authenticated dashboard for dispatch riders to update delivery status step-by-step
- **Admin Dashboard** — Full management console with order management, rider management, financial overview, and CSV export
- **WhatsApp Sharing** — One-tap sharing of tracking links via WhatsApp
- **PWA** — Installable on mobile home screens

## Tech Stack

- **Framework:** Next.js 16 (App Router, TypeScript)
- **Database:** Supabase (PostgreSQL)
- **Styling:** Tailwind CSS v4
- **Auth:** JWT (admin email+password, rider PIN)
- **Deployment:** Vercel-ready

## User Roles

| Role | Access | Auth |
|------|--------|------|
| **Admin** | Full dashboard | Email + password |
| **Rider** | Rider portal | Phone + PIN |
| **Customer** | Order form + tracking | No login |
| **Recipient** | Tracking page | No login |

## Delivery Status Flow

```
Pending → Assigned → Picked Up → In Transit → Delivered → Confirmed
```

## Getting Started

### Prerequisites

- Node.js 18+
- A [Supabase](https://supabase.com) project

### Setup

1. **Clone the repository**
   ```bash
   git clone https://github.com/shegzico/BlackBoxFD.git
   cd BlackBoxFD
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up the database**
   - Go to your Supabase project → SQL Editor
   - Run the contents of `supabase-schema.sql`

4. **Configure environment variables**
   ```bash
   cp .env.local.example .env.local
   ```
   Update `.env.local` with your Supabase credentials:
   ```
   NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
   JWT_SECRET=your-jwt-secret
   NEXT_PUBLIC_APP_URL=http://localhost:3000
   ```

5. **Run the development server**
   ```bash
   npm run dev
   ```
   Open [http://localhost:3000](http://localhost:3000)

## Project Structure

```
src/
├── app/
│   ├── page.tsx                     # Landing page
│   ├── order/                       # Customer order form + confirmation
│   ├── track/                       # Tracking search + details
│   ├── rider/                       # Rider login + dashboard
│   ├── admin/                       # Admin login, dashboard, orders, riders, finances
│   └── api/                         # API routes (deliveries, riders, auth, stats, export)
├── components/                      # Shared UI components
│   ├── Logo.tsx
│   ├── Navbar.tsx
│   ├── StatusBadge.tsx
│   ├── ProgressBar.tsx
│   └── Timeline.tsx
└── lib/                             # Utilities
    ├── types.ts                     # Types, constants, Lagos zones
    ├── supabase.ts                  # Supabase client
    ├── auth.ts                      # JWT helpers
    └── tracking-id.ts              # BB-XXXXXX generator
```

## Routes

| Route | Page | Access |
|-------|------|--------|
| `/` | Landing page | Public |
| `/order` | Order form | Public |
| `/track` | Tracking search | Public |
| `/track/:id` | Tracking details | Public |
| `/rider` | Rider login | Public |
| `/rider/dashboard` | Rider dashboard | Rider auth |
| `/admin` | Admin login | Public |
| `/admin/dashboard` | Admin dashboard | Admin auth |
| `/admin/orders` | Order management | Admin auth |
| `/admin/riders` | Rider management | Admin auth |
| `/admin/finances` | Financial overview | Admin auth |

## Lagos Delivery Zones

**Mainland Core:** Yaba, Surulere, Ikeja, Ogba, Maryland, Oshodi
**Island Core:** Victoria Island, Lekki Phase 1, Ikoyi, Ajah
**Mainland Extended:** Ikorodu, Berger, Ojodu, Agege, Mushin
**Island Extended:** Lekki Phase 2, Epe, Sangotedo

## Design

- **Theme:** Dark (#0A0A0A background, #191314 surface, #F2FF66 accent)
- **Mobile-first** — optimized for phone usage
- **Large tap targets** — riders use the app on the road

## License

Private — BlackBox Logistics
