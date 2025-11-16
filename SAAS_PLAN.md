# 💰 תוכנית להפיכת המערכת ל-SaaS עם תשלומים

## המטרה
להפוך את המערכת ל-SaaS (Software as a Service) שבו:
- כל משתמש יכול להירשם ולהתחבר לחשבון שלו
- כל אירוע דורש תשלום לפי כמות רשומות
- מחיר: 1.5 ש"ח לרשומה
- מינימום: 50 רשומות
- קפיצות של 50 רשומות (50, 100, 150, 200...)
- חיוב אוטומטי והעברת כסף לחשבון שלך

---

## חלקים שצריך לבנות:

### 1. מערכת אימות (Authentication) 🔐
- **Sign Up** - רישום משתמשים חדשים
- **Login** - התחברות
- **Logout** - התנתקות
- **Password Reset** - איפוס סיסמה
- **Session Management** - ניהול סשנים

**טכנולוגיות:**
- JWT (JSON Web Tokens) לניהול סשנים
- bcrypt להצפנת סיסמאות
- React Router לניהול routes מוגנים

---

### 2. מערכת משתמשים (Multi-tenancy) 👥
- **User Model** - מודל משתמש
- **User Store** - ניהול מצב משתמשים
- **Data Isolation** - הפרדה בין משתמשים
- **User Dashboard** - דשבורד אישי לכל משתמש

**שינויים נדרשים:**
- הוספת `userId` לכל אירוע ואורח
- סינון נתונים לפי משתמש נוכחי
- הפרדה מלאה בין משתמשים

---

### 3. מערכת תשלומים (Payment Gateway) 💳
- **Stripe Integration** (מומלץ) או PayPal
- **Checkout Page** - מסך תשלום
- **Payment Processing** - עיבוד תשלומים
- **Webhook Handling** - עדכונים מ-Stripe
- **Transaction History** - היסטוריית תשלומים

**Stripe Setup:**
1. יצירת חשבון Stripe
2. קבלת API Keys (Publishable Key + Secret Key)
3. הגדרת Webhook לקבלת עדכונים
4. אינטגרציה עם המערכת

---

### 4. מסך בחירת כמות רשומות 📊
- **Pricing Page** - מסך תמחור
- **Package Selection** - בחירת חבילה
  - 50 רשומות = 75 ש"ח
  - 100 רשומות = 150 ש"ח
  - 150 רשומות = 225 ש"ח
  - 200 רשומות = 300 ש"ח
  - וכו'...
- **Visual Display** - תצוגה ויזואלית של המחירים

---

### 5. לוגיקת חיוב לפני יצירת אירוע 💰
- **Credit Balance** - יתרת רשומות לכל משתמש
- **Pre-event Check** - בדיקה לפני יצירת אירוע
- **Automatic Deduction** - ניכוי אוטומטי
- **Insufficient Credits** - הודעת שגיאה אם אין מספיק

**Flow:**
1. משתמש בוחר ליצור אירוע
2. בוחר כמות רשומות (מינימום 50)
3. המערכת בודקת אם יש מספיק יתרה
4. אם לא - מעביר למסך תשלום
5. אחרי תשלום - ממשיך ליצירת אירוע
6. ניכוי מהחשבון

---

### 6. דשבורד למנהל המערכת 👨‍💼
- **Admin Dashboard** - דשבורד מנהל
- **User Management** - ניהול משתמשים
- **Payment Overview** - סקירת תשלומים
- **Revenue Tracking** - מעקב הכנסות
- **Transaction Logs** - לוגים של תשלומים

---

## מבנה מסד נתונים חדש:

### Users Table
```sql
- id (UUID)
- email (string, unique)
- password (hashed)
- name (string)
- credits (number) - יתרת רשומות
- createdAt (date)
- updatedAt (date)
```

### Events Table (עדכון)
```sql
- id (UUID)
- userId (UUID, foreign key) - NEW!
- name (string)
- ... (שאר השדות)
```

### Transactions Table (חדש)
```sql
- id (UUID)
- userId (UUID, foreign key)
- amount (number) - סכום התשלום
- credits (number) - כמות רשומות שנרכשו
- stripePaymentId (string) - מזהה תשלום מ-Stripe
- status (string) - pending/success/failed
- createdAt (date)
```

---

## שלבי פיתוח מומלצים:

### שלב 1: מערכת אימות בסיסית
- [ ] Sign Up page
- [ ] Login page
- [ ] User Store (Zustand)
- [ ] Protected Routes
- [ ] Logout functionality

### שלב 2: מערכת תשלומים
- [ ] Stripe Account Setup
- [ ] Stripe Integration
- [ ] Checkout Page
- [ ] Webhook Handler
- [ ] Transaction Storage

### שלב 3: מסך בחירת כמות רשומות
- [ ] Pricing Page
- [ ] Package Selection UI
- [ ] Payment Flow Integration

### שלב 4: לוגיקת חיוב
- [ ] Credit Balance System
- [ ] Pre-event Check
- [ ] Automatic Deduction
- [ ] Insufficient Credits Handling

### שלב 5: דשבורד מנהל
- [ ] Admin Dashboard
- [ ] User Management
- [ ] Payment Overview
- [ ] Revenue Tracking

---

## טכנולוגיות מומלצות:

### Frontend:
- **React** (כבר יש)
- **Zustand** (כבר יש) - לניהול מצב משתמשים
- **React Router** (כבר יש) - לניהול routes
- **Stripe.js** - לאינטגרציה עם Stripe

### Backend:
- **Node.js + Express** (כבר יש)
- **JWT** - לניהול סשנים
- **bcrypt** - להצפנת סיסמאות
- **Stripe SDK** - לעיבוד תשלומים

### Database:
- **PostgreSQL** או **MongoDB** - למסד נתונים מרכזי
- או **localStorage** (זמני) - לפיתוח ראשוני

---

## הערות חשובות:

1. **אבטחה:**
   - הצפנת סיסמאות (bcrypt)
   - HTTPS בלבד
   - Validation של קלטים
   - Rate limiting

2. **תשלומים:**
   - Stripe הוא הכי פופולרי ונוח
   - תמיכה בכרטיסי אשראי
   - תמיכה ב-SEPA (אירופה)
   - תמיכה ב-Apple Pay / Google Pay

3. **מחירים:**
   - 1.5 ש"ח לרשומה
   - מינימום 50 רשומות = 75 ש"ח
   - קפיצות של 50

4. **ניהול:**
   - דשבורד מנהל לניהול הכל
   - היסטוריית תשלומים
   - דוחות הכנסות

---

## שאלות לבדיקה:

1. **איזה payment gateway תרצה?**
   - Stripe (מומלץ)
   - PayPal
   - אחר?

2. **איזה מסד נתונים?**
   - PostgreSQL (מומלץ)
   - MongoDB
   - אחר?

3. **איך תרצה לנהל את הכסף?**
   - העברה ישירה לחשבון בנק?
   - דרך Stripe Connect?
   - אחר?

---

## התחלה:

אני יכול להתחיל עם:
1. ✅ מערכת אימות בסיסית (Sign Up / Login)
2. ✅ מערכת תשלומים עם Stripe
3. ✅ מסך בחירת כמות רשומות
4. ✅ לוגיקת חיוב

**תגיד לי מאיפה להתחיל!**

