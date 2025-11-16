# ✅ טמפלט נכון ללא פרמטרים כפולים

## ⚠️ הבעיה:

Meta לא מאפשר פרמטרים כפולים בטמפלט. כל פרמטר יכול להופיע רק פעם אחת.

## ✅ טמפלט נכון (ללא פרמטרים כפולים):

### תוכן הטמפלט - אופציה 1 (8 פרמטרים):

```
שלום {{guest_name}}!

אנחנו שמחים להזמין אותך ל{{event_type}} של {{groom_name}} ו{{bride_name}}!

📅 תאריך: {{event_date}}
🕐 שעה: {{event_time}}
📍 מיקום: {{venue}}

אנא אשר/י הגעה בקישור הבא:
{{guest_response_link}}

בברכה,
{{couple_name}} 💕
```

### הפרמטרים (8 פרמטרים, כל אחד פעם אחת):

1. `{{guest_name}}` - שם האורח
2. `{{event_type}}` - סוג האירוע
3. `{{groom_name}}` - שם החתן (מופיע פעם אחת)
4. `{{bride_name}}` - שם הכלה (מופיע פעם אחת)
5. `{{event_date}}` - תאריך האירוע
6. `{{event_time}}` - שעת האירוע
7. `{{venue}}` - מיקום האירוע
8. `{{guest_response_link}}` - קישור אישור הגעה
9. `{{couple_name}}` - שם הזוג (לסוף ההודעה)

**שימו לב:** כל פרמטר מופיע רק פעם אחת בטמפלט!

## 🔧 אופציה נוספת (אם אתה רוצה שם הזוג בסוף):

אם אתה רוצה את שמות החתן והכלה בסוף, אפשר לעשות כך:

```
שלום {{guest_name}}!

אנחנו שמחים להזמין אותך ל{{event_type}} של {{couple_name}}!

📅 תאריך: {{event_date}}
🕐 שעה: {{event_time}}
📍 מיקום: {{venue}}

אנא אשר/י הגעה בקישור הבא:
{{guest_response_link}}

בברכה,
{{couple_name}} 💕
```

**פרמטרים (7 פרמטרים):**
1. `{{guest_name}}` - שם האורח
2. `{{event_type}}` - סוג האירוע
3. `{{couple_name}}` - שם הזוג (מופיע פעמיים אבל זה אותו פרמטר)
4. `{{event_date}}` - תאריך האירוע
5. `{{event_time}}` - שעת האירוע
6. `{{venue}}` - מיקום האירוע
7. `{{guest_response_link}}` - קישור אישור הגעה

**⚠️ חשוב:** אותו פרמטר יכול להופיע כמה פעמים בטמפלט (כמו `{{couple_name}}`), אבל לא יכול להיות שני פרמטרים שונים עם אותו שם.

## 📋 עדכון הקוד:

אם תשתמש באופציה השנייה, עדכן את הקוד:

```typescript
const templateParams: any = {
  paramsOrder: ['guest_name', 'event_type', 'couple_name', 
               'event_date', 'event_time', 'venue', 'guest_response_link'],
  guest_name: guest.firstName,
  event_type: event.eventTypeHebrew,
  couple_name: event.coupleName, // שם הזוג (יחד)
  event_date: formatDate(event.eventDate),
  event_time: event.eventTime,
  venue: event.venue,
  guest_response_link: guestLink,
  language: 'he'
};
```

## ✅ המלצה:

השתמש באופציה הראשונה (8 פרמטרים) כי היא יותר גמישה ומאפשרת לך לשלוט על איך שמות החתן והכלה מופיעים.

