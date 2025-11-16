@echo off
chcp 65001 >nul
cd /d "%~dp0whatsapp-backend"

echo ========================================
echo   Checking if phone number is registered
echo ========================================
echo.

if not exist "node_modules" (
    echo Installing dependencies...
    call npm install
    echo.
)

echo Checking if 0547377881 is registered in WhatsApp...
echo.

node -e "const axios = require('axios'); const ACCESS_TOKEN = 'EAAQ16mfCx58BPZCAepGf7EQMznC5dwYUmsun7pZCvzLPqjOjnq778EeJtXGEdemBVXdqTEt9pJ0bm2l5EyL9BZAR9kVS15kjz9rWYAcbKZCZBVOQswHeZAfmkUNv2TZAeX8KGaJ8OZCb4ZCtOaZAEZARqvG2TE7DHCmZBDWRATOKdvfHZA4j8FGluUX8NNGdsqbBEVgFjNgZDZD'; const PHONE_NUMBER_ID = '874204535776090'; const phoneNumber = '972547377881'; axios.post('https://graph.facebook.com/v22.0/' + PHONE_NUMBER_ID + '/contacts', { contacts: [phoneNumber] }, { headers: { 'Authorization': 'Bearer ' + ACCESS_TOKEN, 'Content-Type': 'application/json' } }).then(r => { console.log('Response:', JSON.stringify(r.data, null, 2)); if (r.data.contacts && r.data.contacts[0] && r.data.contacts[0].wa_id) { console.log('✅ Number is registered in WhatsApp!'); console.log('WhatsApp ID:', r.data.contacts[0].wa_id); } else { console.log('⚠️ Number might not be registered in WhatsApp'); } }).catch(e => { console.log('Error:', e.response?.data || e.message); });"

pause


