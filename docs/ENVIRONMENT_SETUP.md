# Environment Setup Guide

This guide explains how to set up development and production environments for the RSVP SaaS platform.

## Overview

The project uses separate environments for development and production to ensure safe testing and deployment.

## Prerequisites

- Node.js 18+ installed
- Supabase account (create separate projects for dev and prod)
- Meta WhatsApp Business API access
- Git repository

## Development Environment Setup

### 1. Clone and Install

```bash
git clone <repository-url>
cd rsvp-saas
npm install
```

### 2. Create Supabase Projects

1. Go to [Supabase Dashboard](https://app.supabase.com)
2. Create a new project for **Development**
3. Note down:
   - Project URL
   - Anon/Public Key
   - Service Role Key

### 3. Set Up Database Schema

1. Open your Supabase project SQL Editor
2. Copy and run the contents of `supabase/schema.sql`
3. Verify all tables and policies are created

### 4. Configure Environment Variables

Create `.env.development` file:

```bash
cp .env.example .env.development
```

Fill in the values:

```env
# Supabase Development
NEXT_PUBLIC_SUPABASE_URL=https://your-dev-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_dev_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_dev_service_role_key

# Environment
NODE_ENV=development
NEXT_PUBLIC_APP_URL=http://localhost:3000

# WhatsApp (use test credentials)
WHATSAPP_ACCESS_TOKEN=your_test_token
WHATSAPP_PHONE_NUMBER_ID=your_test_phone_id
WHATSAPP_BUSINESS_ACCOUNT_ID=your_test_business_id
WHATSAPP_APP_ID=your_test_app_id
WHATSAPP_APP_SECRET=your_test_app_secret
WHATSAPP_VERIFY_TOKEN=dev_verify_token_123
WHATSAPP_WEBHOOK_URL=http://localhost:3000/api/whatsapp/webhook

# Security
QR_CODE_SECRET=dev_secret_key_change_in_production
PUBLIC_VIEW_PASSWORD_ENABLED=false
```

### 5. Run Development Server

```bash
npm run dev
```

Visit `http://localhost:3000`

## Production Environment Setup

### 1. Create Production Supabase Project

1. Create a **separate** Supabase project for production
2. Run the same schema migration
3. Note down production credentials

### 2. Configure Production Environment

Create `.env.production` file:

```bash
cp .env.example .env.production
```

Fill in **production** values:

```env
# Supabase Production
NEXT_PUBLIC_SUPABASE_URL=https://your-prod-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_prod_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_prod_service_role_key

# Environment
NODE_ENV=production
NEXT_PUBLIC_APP_URL=https://your-production-domain.com

# WhatsApp Production
WHATSAPP_ACCESS_TOKEN=your_prod_token
WHATSAPP_PHONE_NUMBER_ID=your_prod_phone_id
WHATSAPP_BUSINESS_ACCOUNT_ID=your_prod_business_id
WHATSAPP_APP_ID=your_prod_app_id
WHATSAPP_APP_SECRET=your_prod_app_secret
WHATSAPP_VERIFY_TOKEN=strong_random_production_token
WHATSAPP_WEBHOOK_URL=https://your-production-domain.com/api/whatsapp/webhook

# Security (use strong, unique values)
QR_CODE_SECRET=strong_random_secret_for_qr_encryption
PUBLIC_VIEW_PASSWORD_ENABLED=true
PUBLIC_VIEW_DEFAULT_PASSWORD=optional_default_password
```

### 3. Set Up WhatsApp Webhook

1. Configure webhook URL in Meta Developer Console
2. Use the production webhook URL
3. Set verify token to match `WHATSAPP_VERIFY_TOKEN`

## Merging Dev to Prod

### Before Merging

1. **Test thoroughly** in development
2. **Backup production** database:
   ```bash
   node scripts/backup-prod.js
   ```
3. **Review changes** in `supabase/migrations/`

### Merge Process

1. Run merge script:
   ```bash
   node scripts/merge-dev-to-prod.js
   ```

2. Apply database migrations to production:
   - Copy migration files to production Supabase
   - Run migrations in order

3. Update production environment variables if needed

4. Deploy to production:
   ```bash
   npm run build
   # Deploy using your hosting platform
   ```

5. Verify production deployment

## Environment Variables Reference

| Variable | Description | Dev | Prod |
|----------|-------------|-----|------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL | Dev project | Prod project |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon key | Dev key | Prod key |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key | Dev key | Prod key |
| `NEXT_PUBLIC_APP_URL` | Application URL | localhost:3000 | Production domain |
| `WHATSAPP_ACCESS_TOKEN` | WhatsApp API token | Test token | Production token |
| `WHATSAPP_WEBHOOK_URL` | Webhook endpoint | localhost | Production domain |
| `QR_CODE_SECRET` | QR encryption secret | Dev secret | Strong prod secret |

## Security Best Practices

1. **Never commit** `.env.development` or `.env.production` to git
2. **Use strong secrets** in production
3. **Rotate secrets** periodically
4. **Limit service role key** access
5. **Enable RLS** on all Supabase tables
6. **Use HTTPS** in production

## Troubleshooting

### Database Connection Issues

- Verify Supabase URL and keys
- Check network connectivity
- Verify RLS policies are set correctly

### WhatsApp Webhook Issues

- Verify webhook URL is accessible
- Check verify token matches
- Review webhook logs in Meta Console

### Environment Variable Issues

- Ensure `.env` files are in project root
- Restart dev server after changes
- Check for typos in variable names

## Support

For issues, check:
- Supabase documentation
- Meta WhatsApp Business API docs
- Next.js documentation

