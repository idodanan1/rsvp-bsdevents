# Database Schema Analysis - Events Table

## Summary of Findings

### 1. Table Name
- **Exact table name**: `events` (lowercase)
- **Schema**: `public.events`
- **Location**: Supabase PostgreSQL database

### 2. Column Name for User Identification
- **Column name**: `user_id` (snake_case, not camelCase)
- **Query used**: `.eq('user_id', userId)` (line 754 in server.js)
- **NOT using**: `email`, `id`, or `userId`

### 3. Data Type Mismatch Issue ⚠️
**CRITICAL PROBLEM FOUND:**

- **Supabase Schema** (`supabase/schema.sql` line 17):
  ```sql
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE
  ```
  - Defines `user_id` as **UUID** type
  - References `public.users(id)` which is also UUID

- **Prisma Schema** (`prisma/schema.prisma` line 68):
  ```prisma
  user_id String
  ```
  - Defines `user_id` as **String** type

- **Frontend sends**: `user_1764676518284_u57burtnn` (String, not UUID format)

- **Backend query** (`whatsapp-backend/server.js` line 754):
  ```javascript
  .eq('user_id', userId)  // userId is string like "user_1764676518284_u57burtnn"
  ```

### 4. The Problem
The database expects a **UUID** (format: `550e8400-e29b-41d4-a716-446655440000`), but the frontend is sending a **String** (format: `user_1764676518284_u57burtnn`).

This type mismatch causes:
- Events to be saved with `user_id` as TEXT (if PostgreSQL allows it)
- Queries to fail or return 0 results because UUID comparison fails
- The `.eq('user_id', userId)` query to not match even if data exists

### 5. GET Endpoint Details
**Location**: `whatsapp-backend/server.js` line 720

**Query Logic**:
```javascript
let { data, error } = await supabase
  .from('events')           // Table name: 'events'
  .select('*')
  .eq('user_id', userId)    // Column: 'user_id', Value: userId from params
  .order('created_at', { ascending: false });
```

**Fallback Logic** (lines 758-786):
- If no results, tries string comparison
- Logs all existing `user_id`s in DB for debugging
- Checks for type mismatches

### 6. POST Endpoint Details
**Location**: `whatsapp-backend/server.js` line 560

**Conversion**:
- Frontend sends: `userId: "user_1764676518284_u57burtnn"`
- Converted to: `user_id: "user_1764676518284_u57burtnn"` (via `convertFrontendEventToSupabase`)
- Saved to DB as: String (but column expects UUID)

## Recommendations

### Option 1: Change Database Schema (Recommended)
Change `user_id` column from UUID to TEXT/VARCHAR to match frontend format:

```sql
ALTER TABLE public.events 
ALTER COLUMN user_id TYPE TEXT;

ALTER TABLE public.users 
ALTER COLUMN id TYPE TEXT;
```

### Option 2: Change Frontend to Use UUID
Modify frontend to generate/use UUID format instead of custom string format.

### Option 3: Add Conversion Layer
Add a conversion function that maps frontend userId to database UUID (requires a mapping table).

## Current Status
- ✅ Table name: `events` (correct)
- ✅ Column name: `user_id` (correct)
- ❌ Data type: UUID vs String (MISMATCH - this is the root cause)

