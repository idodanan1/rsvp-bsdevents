@echo off
chcp 65001 >nul
echo ========================================
echo שמירת Environment Variables
echo ========================================
echo.
echo ⚠️ חשוב: לפני שתמחק את השירות ב-Render,
echo שמור את כל ה-Environment Variables!
echo.
echo ========================================
echo הוראות:
echo ========================================
echo.
echo 1. לך ל-Render Dashboard:
echo    https://dashboard.render.com
echo.
echo 2. חפש את rsvp-frontend ולחץ עליו
echo.
echo 3. לך ל-Settings
echo.
echo 4. גלול למטה עד "Environment Variables"
echo.
echo 5. העתק את כל המשתנים הבאים לקובץ טקסט:
echo.
echo    - NODE_ENV
echo    - NEXT_PUBLIC_SUPABASE_URL
echo    - NEXT_PUBLIC_SUPABASE_ANON_KEY
echo    - VITE_BACKEND_URL
echo    - NEXT_PUBLIC_APP_URL
echo.
echo 6. שמור את הקובץ במקום בטוח!
echo.
echo ========================================
echo אחרי ששמרת, המשך ל-RESET_RENDER_STEP_BY_STEP.md
echo ========================================
echo.
pause
