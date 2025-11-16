# 🚀 מדריך שליחה המונית דרך WhatsApp

## 📋 מה עשינו:

### ✅ 1. שיפרו את השרת
- הוספנו הגדרות ברירת מחדל למפתחות API
- שיפרו את הלוגים לבדיקה טובה יותר
- הוספנו בדיקת חיבור אוטומטית

### ✅ 2. שיפרו את ה-WhatsApp Service
- הוספנו לוגים מפורטים יותר
- הוספנו בדיקת חיבור לשרת
- שיפרו את הטיפול בשגיאות

## 🚀 איך להפעיל את המערכת:

### שלב 1: הפעלת השרת
```bash
# פתח טרמינל חדש
cd whatsapp-backend
node server.js
```

**תראה:**
```
🔧 WhatsApp Backend Configuration:
📱 WaNotifier API Key: Set
📱 CallMeBot API Key: Set
🌐 Port: 3002
🚀 WhatsApp Backend running on port 3002
📱 Ready to send WhatsApp messages!
```

### שלב 2: הפעלת המערכת
```bash
# בטרמינל אחר
npm run dev
```

### שלב 3: בדיקה
1. לך לדף ניהול האירוע
2. לחץ על "שלח הודעה" לאורח
3. בדוק את הקונסול (F12)

## 🔍 מה תראה בקונסול:

### ✅ הצלחה:
```
✅ Backend server is running
📱 Trying WaNotifier...
📊 WaNotifier response status: 200
✅ WaNotifier sent successfully!
✅ WhatsApp sent successfully via backend!
📱 Used API: WaNotifier
```

### ❌ אם השרת לא רץ:
```
❌ Backend server is not running or not accessible
💡 Make sure to run: cd whatsapp-backend && node server.js
❌ WhatsApp Backend Error: ERR_CONNECTION_REFUSED
📞 WhatsApp failed, trying SMS...
```

## 🎯 איך המערכת עובדת:

1. **המערכת מנסה WhatsApp קודם** דרך השרת
2. **השרת מנסה 3 APIs:** WaNotifier → CallMeBot → GreenAPI
3. **אם WhatsApp נכשל** → נופל ל-SMS
4. **שולח עם עיכוב** של שנייה בין הודעות

## 🚨 פתרון בעיות:

### בעיה: "ERR_CONNECTION_REFUSED"
**פתרון:** ודא שהשרת רץ
```bash
cd whatsapp-backend
node server.js
```

### בעיה: "All WhatsApp APIs failed"
**פתרון:** בדוק את הלוגים בקונסול השרת

### בעיה: "biz_link_on_prem_reg_blocked"
**פתרון:** WaNotifier חוסם קישורים - המערכת תנסה CallMeBot

## 📱 APIs שמופעלים:

1. **WaNotifier** - API ראשי
2. **CallMeBot** - גיבוי
3. **GreenAPI** - גיבוי נוסף

## 🎉 אחרי שהכל עובד:

- ההודעות נשלחות דרך WhatsApp
- כל אורח מקבל קישור אישי
- המערכת מעדכנת סטטוסים
- יש גיבוי ל-SMS אם WhatsApp נכשל
