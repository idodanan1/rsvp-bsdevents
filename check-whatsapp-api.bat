@echo off
chcp 65001 >nul
cd /d "%~dp0whatsapp-backend"

echo ========================================
echo   Checking WhatsApp API Credentials
echo ========================================
echo.

if not exist "node_modules" (
    echo Installing dependencies...
    call npm install
    echo.
)

echo Running verification script...
node -e "const axios = require('axios'); const ACCESS_TOKEN = 'EAAQ16mfCx58BPZB6vXpBUsqgwrdainMgFfFZBum0sLbjWSTomXsqU5ZBcFVsXeBWyYLIwIWxSj3xayz4jQ3IXZApM8lgFKY57hPSh270XrCVk7oYs1eSFn8mwpDiAM2vwcQuCmupW994qOrZCMu7PBJx3jPCZAWw1DDfE8JDQ3NATVNEelN3ZBQfSlTjxW5QlIvyQZDZD'; const PHONE_NUMBER_ID = '874204535776090'; axios.get('https://graph.facebook.com/v22.0/' + PHONE_NUMBER_ID, { params: { fields: 'id,name,display_phone_number', access_token: ACCESS_TOKEN } }).then(r => { console.log('✅ Phone Number ID is valid!'); console.log(JSON.stringify(r.data, null, 2)); }).catch(e => { console.log('❌ Error:', e.response?.data || e.message); });"

pause

