# בדיקת התאמה לדרישות Meta WhatsApp Business API

## פורמט הנדרש על ידי Meta:

```json
{
  "messaging_product": "whatsapp",
  "to": "<PHONE_NUMBER>",
  "type": "template",
  "template": {
    "name": "<TEMPLATE_NAME>",
    "language": {
      "code": "<LANGUAGE_CODE>"
    },
    "components": [
      {
        "type": "body",
        "parameters": [
          {
            "type": "text",
            "text": "<PARAMETER_VALUE>"
          }
        ]
      }
    ]
  }
}
```

## הקוד שלנו שולח:

```json
{
  "messaging_product": "whatsapp",
  "recipient_type": "individual",  // ✅ אופציונלי אבל מומלץ
  "to": "<PHONE_NUMBER>",          // ✅ תקין
  "type": "template",              // ✅ תקין
  "template": {
    "name": "<TEMPLATE_NAME>",     // ✅ תקין
    "language": {
      "code": "<LANGUAGE_CODE>"    // ✅ תקין
    },
    "components": [                // ✅ תקין
      {
        "type": "body",            // ✅ תקין
        "parameters": [             // ✅ תקין
          {
            "type": "text",         // ✅ תקין
            "text": "<VALUE>"       // ✅ תקין
          }
        ]
      }
    ]
  }
}
```

## מסקנה:

✅ **הקוד שלנו תואם לחלוטין לדרישות Meta!**

הבעיה היא **לא בקוד שלנו**, אלא בטמפלטים במטה עצמם.

## מה לבדוק במטה:

1. **טמפלט 'a'** - צריך 9 פרמטרים:
   - `{{guest_name}}`
   - `{{event_type}}`
   - `{{bride_name}}`
   - `{{groom_name}}`
   - `{{event_date}}`
   - `{{event_time}}`
   - `{{venue}}`
   - `{{est_response_link}}` ← חשוב: זה השם הנכון!
   - `{{couple_name}}`

2. **טמפלט 'reminer'** - צריך 7 פרמטרים:
   - `{{first_name}}`
   - `{{event_type}}`
   - `{{couple_name}}`
   - `{{event_date}}`
   - `{{event_time}}`
   - `{{venue}}`
   - `{{table_number}}`

3. **ודא שכל הפרמטרים ב-Variable Samples מוגדרים עם שמות** (לא ריקים)

4. **ודא שהטמפלטים מאושרים** - הסטטוס צריך להיות "Approved"

