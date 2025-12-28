# הוראות להוספת עמודת source לטבלת guests

## הבעיה
השגיאה `Could not find the 'source' column of 'guests' in the schema cache` מתרחשת כי העמודה `source` לא קיימת בטבלת `guests` ב-Supabase.

## הפתרון

### שלב 1: פתח את Supabase SQL Editor
1. היכנס ל-Supabase Dashboard
2. בחר את הפרויקט שלך
3. לחץ על **SQL Editor** בתפריט השמאלי

### שלב 2: העתק והרץ את ה-SQL הבא

**⚠️ חשוב: העתק את התוכן של הקובץ, לא את שם הקובץ!**

```sql
-- Add source column to guests table if it doesn't exist
-- This column tracks the origin of guest updates (guest_link, manual_update, whatsapp)

-- Check if column exists, if not add it
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'guests' 
    AND column_name = 'source'
  ) THEN
    ALTER TABLE public.guests 
    ADD COLUMN source TEXT DEFAULT 'manual' 
    CHECK (source IN ('whatsapp', 'guest_link', 'manual', 'manual_add'));
    
    -- Update existing records to have default source
    UPDATE public.guests 
    SET source = 'manual' 
    WHERE source IS NULL;
    
    RAISE NOTICE 'Added source column to guests table';
  ELSE
    RAISE NOTICE 'source column already exists in guests table';
  END IF;
END $$;
```

### שלב 3: בדוק שהעמודה נוספה
הרץ את השאילתה הבאה כדי לוודא שהעמודה קיימת:

```sql
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'guests' 
  AND column_name = 'source';
```

אם אתה רואה שורה עם `source`, העמודה נוספה בהצלחה!

## מה קורה אחרי זה?
אחרי שתריץ את ה-SQL:
1. העמודה `source` תתווסף לטבלת `guests`
2. כל האורחים הקיימים יקבלו `source = 'manual'` כברירת מחדל
3. עדכונים חדשים מדף האורח יישמרו עם `source = 'guest_link'`
4. השגיאה `Could not find the 'source' column` תיעלם

## הערות
- ה-SQL הזה בטוח להרצה - הוא בודק אם העמודה כבר קיימת לפני שהוא מוסיף אותה
- אם העמודה כבר קיימת, הוא פשוט ידפיס הודעה ולא יעשה כלום
- כל האורחים הקיימים יקבלו `source = 'manual'` כברירת מחדל

