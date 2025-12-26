# Supabase Migration - Final Status

## ✅ Completed Core Migration

### 1. MongoDB Removal
- ✅ Removed `mongoose` import
- ✅ Removed all MongoDB connection logic
- ✅ Removed MongoDB schemas (User, VerificationCode, UserSession)
- ✅ Removed MongoDB reconnection intervals
- ✅ Removed `mongodb` and `mongoose` from package.json
- ✅ Updated health check route

### 2. File-based Storage Removal
- ✅ Removed `events.json` file reading/writing
- ✅ Removed `loadEvents()` and `saveEvents()` functions
- ✅ Removed `eventsData` in-memory storage declaration

### 3. Supabase Integration
- ✅ Added environment variable checks (exits if missing)
- ✅ Initialized Supabase client at startup
- ✅ Added helper functions to `supabase-db.js`:
  - `getPendingGuestUpdates()`
  - `addPendingGuestUpdate()`
  - `deletePendingGuestUpdates()`
- ✅ Created `addPendingUpdate()` helper function in server.js

### 4. Updated Routes
- ✅ `GET /api/events` - Uses Supabase only
- ✅ `POST /api/events/sync` - Uses Supabase only
- ✅ `GET /api/guests/pending-updates` - Uses Supabase only
- ✅ `POST /api/guests/add-pending-update` - Uses Supabase only
- ✅ Health check route - Shows Supabase status

## ⚠️ Remaining Work

The following locations still reference the old `pendingUpdates` array or `eventsData`:

### High Priority (Critical Routes):
1. **POST /api/events** (line ~5353)
   - Still uses `eventsData.events.findIndex()`
   - Still has complex merging logic with `eventsData`
   - **Action**: Replace with Supabase `upsertEvent()` and `upsertGuests()`

2. **WhatsApp Webhook Handler** (multiple locations)
   - Uses `loadEvents()` and `eventsData.events`
   - **Action**: Use `supabaseDb.getEventById()` and `supabaseDb.upsertGuest()`

3. **DELETE /api/events/:eventId** (line ~6267)
   - Uses `eventsData.events`
   - **Action**: Use `supabaseDb.deleteEvent()`

4. **POST /api/events/:eventId/guests** (line ~6325)
   - Uses file operations
   - **Action**: Use `supabaseDb.upsertGuests()`

### Medium Priority (Internal Functions):
5. **`updateGuestStatusByPhone()` function** (line ~2435)
   - Still uses `pendingUpdates` array
   - **Action**: Replace `pendingUpdates.push()` with `await addPendingUpdate()`

6. **Guest count update handler** (line ~1949)
   - Already updated to use `addPendingUpdate()`

7. **Guest link update handler** (line ~5618)
   - Partially updated, some references remain

### Low Priority (Cleanup):
8. **All remaining `pendingUpdates.push()` calls**
   - Replace with `await addPendingUpdate()`
   - Search for: `pendingUpdates.push(`

9. **All remaining `eventsData.events` references**
   - Replace with Supabase queries
   - Search for: `eventsData.events`

## 📋 Required Supabase Table

**IMPORTANT**: You must create the `pending_guest_updates` table before deploying!

Run this SQL in your Supabase SQL Editor:

```sql
-- See whatsapp-backend/CREATE_PENDING_UPDATES_TABLE.sql
```

The table structure:
- `id` (UUID, primary key)
- `guest_id` (UUID, references guests)
- `event_id` (UUID, references events)
- `phone_number` (TEXT)
- `rsvp_status` (TEXT: 'confirmed', 'declined', 'maybe')
- `guest_count` (INTEGER)
- `actual_attendance` (TEXT)
- `source` (TEXT: 'whatsapp', 'guest_link', 'manual')
- `response_date` (TIMESTAMPTZ)
- `notes` (TEXT)
- `created_at`, `updated_at` (TIMESTAMPTZ)

## 🔧 Environment Variables

**CRITICAL**: Set these in Render Environment Variables:

1. `SUPABASE_URL` - Your Supabase project URL (e.g., `https://xxxxx.supabase.co`)
2. `SUPABASE_SERVICE_ROLE_KEY` - Service role key from Supabase Dashboard → Settings → API

The server will **exit with error** if these are missing, preventing startup with broken database.

## 📝 Column Name Mapping

The code uses these Supabase column names (snake_case):
- `user_id` (not `userId`)
- `event_id` (not `eventId`)
- `guest_id` (not `guestId`)
- `phone_number` (not `phoneNumber`)
- `rsvp_status` (not `rsvpStatus`)
- `guest_count` (not `guestCount`)
- `actual_attendance` (not `actualAttendance`)
- `response_date` (not `responseDate`)

## 🚀 Deployment Checklist

1. ✅ Run `CREATE_PENDING_UPDATES_TABLE.sql` in Supabase
2. ✅ Set `SUPABASE_URL` in Render
3. ✅ Set `SUPABASE_SERVICE_ROLE_KEY` in Render
4. ⚠️ Update remaining routes (see above)
5. ⚠️ Test all endpoints
6. ⚠️ Deploy to Render

## 💡 Notes

- The `supabase-db.js` file handles all conversions between frontend format (camelCase) and Supabase format (snake_case)
- The `addPendingUpdate()` helper function in server.js wraps `supabaseDb.addPendingGuestUpdate()` for convenience
- All routes should check `supabaseDb.isSupabaseConfigured()` before database operations
- The server exits on startup if Supabase credentials are missing (prevents silent failures)

