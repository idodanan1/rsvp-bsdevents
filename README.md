# RSVP SaaS Platform

A comprehensive SaaS platform for RSVP management, table seating, and WhatsApp automation in Hebrew (RTL).

## Features

- **Multi-Tenant Event Management**: Create and manage multiple events
- **Guest Management**: Filterable guest list with RSVP status, message status, and check-in status
- **Excel Import/Export**: Import and export guests with Hebrew column headers
- **WhatsApp Integration**: Send individual messages and automated campaigns via Meta WhatsApp Business API
- **Table Seating**: Interactive drag-and-drop seating chart with real-time capacity tracking
- **QR Check-in**: Generate QR codes for guests and scan them at event entrance
- **Public View**: Read-only public view with real-time statistics
- **Real-time Sync**: All data syncs in real-time across devices using Supabase Realtime
- **Full Hebrew (RTL) Support**: Complete Hebrew UI with RTL layout

## Tech Stack

- **Framework**: Next.js 14+ (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS with RTL support
- **Database**: Supabase (PostgreSQL + Auth + Realtime + Storage)
- **WhatsApp**: Meta WhatsApp Business API
- **QR Codes**: qrcode library
- **Excel**: xlsx for import/export

## Getting Started

### Prerequisites

- Node.js 18+
- Supabase account (or PostgreSQL database)
- Meta WhatsApp Business API access (optional for development)

### Installation

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```

3. Set up environment variables:
   - Copy `.env.example` to `.env.development`
   - Fill in your Supabase credentials or PostgreSQL connection string
   - Configure WhatsApp API keys (optional - can be disabled with `ENABLE_WHATSAPP_SENDING=false`)

4. Run database migrations:
   - If using Supabase: Open SQL Editor and run `supabase/schema.sql`
   - If using PostgreSQL: `psql -d your_database -f supabase/schema.sql`

5. Start the development server:
   ```bash
   npm run dev
   ```

Visit `http://localhost:3000` to see the application.

## Environment Setup

See [docs/ENVIRONMENT_SETUP.md](docs/ENVIRONMENT_SETUP.md) for detailed setup instructions for both development and production environments.

## Project Structure

```
rsvp-saas/
├── app/
│   ├── (auth)/          # Authentication pages
│   ├── (dashboard)/     # Dashboard pages
│   ├── (scanner)/       # QR scanner pages
│   ├── (public)/        # Public view pages
│   └── api/             # API routes
├── components/          # React components
├── lib/                 # Utilities and services
├── supabase/            # Database schema and migrations
└── scripts/             # Utility scripts
```

## Development/Production Workflow

The project uses separate environments for development and production. See `scripts/merge-dev-to-prod.js` for merging tested features from dev to prod.

## License

Private - All rights reserved

