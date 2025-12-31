@echo off
chcp 65001 >nul
echo ========================================
echo הוראות לתיקון whatsapp-backend ב-Render
echo ========================================
echo.
echo זה לא קובץ אוטומטי - זה הוראות!
echo.
echo ========================================
echo מה לעשות:
echo ========================================
echo.
echo 1. פתח https://dashboard.render.com
echo.
echo 2. חפש את השירות whatsapp-backend
echo    - אם הוא לא קיים, צור אותו (ראה למטה)
echo    - אם הוא קיים, לחץ עליו
echo.
echo 3. לך ל-Settings ובדוק:
echo    - Build Command: npm install
echo    - Start Command: npm start
echo    - Root Directory: whatsapp-backend
echo.
echo 4. לך ל-Environment ובדוק שיש:
echo    - SUPABASE_URL
echo    - SUPABASE_SERVICE_ROLE_KEY
echo    - (ואחרים אם צריך)
echo.
echo 5. לך ל-Logs ובדוק:
echo    - אמור לראות: Server running on port...
echo    - אם יש שגיאות, שלח אותן
echo.
echo ========================================
echo אם השירות לא קיים - צור אותו:
echo ========================================
echo.
echo 1. New + Web Service
echo 2. בחר repository: idodanan1/-rsvp-management-system
echo 3. Name: whatsapp-backend
echo 4. Root Directory: whatsapp-backend
echo 5. Build Command: npm install
echo 6. Start Command: npm start
echo 7. Environment Variables:
echo    - SUPABASE_URL
echo    - SUPABASE_SERVICE_ROLE_KEY
echo    - (ואחרים)
echo.
echo ========================================
echo אחרי שסיימת, שלח לי:
echo ========================================
echo.
echo - מה הסטטוס של whatsapp-backend? (Live/Failed)
echo - מה ה-URL שלו?
echo - מה יש ב-Logs?
echo.
pause
