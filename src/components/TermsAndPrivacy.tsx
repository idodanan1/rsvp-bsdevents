import React from 'react';
import { X } from 'lucide-react';

interface TermsAndPrivacyProps {
  isOpen: boolean;
  onClose: () => void;
  type: 'terms' | 'privacy';
}

const TermsAndPrivacy: React.FC<TermsAndPrivacyProps> = ({ isOpen, onClose, type }) => {
  if (!isOpen) return null;

  const content = type === 'terms' ? (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold text-gray-800 mb-4">תנאי שימוש</h2>
      
      <section>
        <h3 className="text-xl font-semibold text-gray-700 mb-2">1. כללי</h3>
        <p className="text-gray-600 mb-4">
          ברוכים הבאים למערכת ניהול אישורי הגעה של בס"ד אירועים ("המערכת"). השימוש במערכת כפוף לתנאי השימוש המפורטים להלן.
          על ידי השימוש במערכת, אתה מאשר כי קראת והבנת את תנאי השימוש והסכמת להם.
        </p>
      </section>

      <section>
        <h3 className="text-xl font-semibold text-gray-700 mb-2">2. שימוש במערכת</h3>
        <p className="text-gray-600 mb-4">
          המערכת מיועדת לניהול אירועים, הזמנות אורחים ושליחת הודעות דרך WhatsApp ו-SMS.
          המשתמש מתחייב להשתמש במערכת בהתאם לייעודה ולחוקי מדינת ישראל.
        </p>
      </section>

      <section>
        <h3 className="text-xl font-semibold text-gray-700 mb-2">3. אחריות המשתמש</h3>
        <p className="text-gray-600 mb-4">
          המשתמש נושא באחריות מלאה לכל המידע שהוא מזין למערכת ולכל פעולה שהוא מבצע בה.
          המשתמש מתחייב לא להשתמש במערכת למטרות בלתי חוקיות או בלתי מוסריות.
        </p>
      </section>

      <section>
        <h3 className="text-xl font-semibold text-gray-700 mb-2">4. שירותי תשלום</h3>
        <p className="text-gray-600 mb-4">
          השימוש במערכת כרוך בתשלום עבור רשומות (credits) בהתאם למחירון המפורסם במערכת.
          התשלום מתבצע מראש והרשומות נרכשות בהתאם לחבילה שנבחרה.
        </p>
      </section>

      <section>
        <h3 className="text-xl font-semibold text-gray-700 mb-2">5. זכויות קניין רוחני</h3>
        <p className="text-gray-600 mb-4">
          כל הזכויות במערכת, כולל קוד המקור, העיצוב והתוכן, שמורות לבעלי המערכת.
          אסור להעתיק, לשכפל או להשתמש במערכת ללא רשות מפורשת בכתב.
        </p>
      </section>

      <section>
        <h3 className="text-xl font-semibold text-gray-700 mb-2">6. שינויים בתנאים</h3>
        <p className="text-gray-600 mb-4">
          בעלי המערכת שומרים לעצמם את הזכות לשנות את תנאי השימוש בכל עת.
          שינויים יכנסו לתוקף עם פרסומם במערכת.
        </p>
      </section>

      <section>
        <h3 className="text-xl font-semibold text-gray-700 mb-2">7. מגבלת אחריות</h3>
        <p className="text-gray-600 mb-4">
          המערכת מסופקת "כפי שהיא" ללא כל אחריות או התחייבות.
          בעלי המערכת לא יהיו אחראים לכל נזק ישיר או עקיף שייגרם כתוצאה משימוש במערכת.
        </p>
      </section>

      <section>
        <h3 className="text-xl font-semibold text-gray-700 mb-2">8. דין ש管辖</h3>
        <p className="text-gray-600 mb-4">
          תנאי השימוש כפופים לדין הישראלי בלבד.
          כל סכסוך ייפתר בפני בתי המשפט המוסמכים בישראל.
        </p>
      </section>
    </div>
  ) : (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold text-gray-800 mb-4">מדיניות פרטיות</h2>
      
      <section>
        <h3 className="text-xl font-semibold text-gray-700 mb-2">1. כללי</h3>
        <p className="text-gray-600 mb-4">
          מערכת ניהול אישורי הגעה של בס"ד אירועים ("המערכת") מחויבת להגנה על פרטיות המשתמשים.
          מדיניות פרטיות זו מסבירה איזה מידע אנו אוספים, כיצד אנו משתמשים בו וכיצד אנו מגנים עליו,
          בהתאם לחוק הגנת הפרטיות, התשמ"א-1981 ולחוק הגנת הפרטיות (תיקון מס' 40), התשע"ח-2018.
        </p>
      </section>

      <section>
        <h3 className="text-xl font-semibold text-gray-700 mb-2">2. איסוף מידע</h3>
        <p className="text-gray-600 mb-4">
          אנו אוספים את המידע הבא:
          <ul className="list-disc list-inside mt-2 space-y-1">
            <li>פרטי התחברות: שם, אימייל וסיסמה</li>
            <li>פרטי אירועים: תאריכים, מיקומים, פרטי אורחים</li>
            <li>פרטי אורחים: שמות, מספרי טלפון, כתובות אימייל</li>
            <li>נתוני שימוש: פעולות שבוצעו במערכת, תאריכי גישה</li>
            <li>נתוני תשלום: פרטי רכישות רשומות (ללא פרטי כרטיס אשראי)</li>
          </ul>
        </p>
      </section>

      <section>
        <h3 className="text-xl font-semibold text-gray-700 mb-2">3. שימוש במידע</h3>
        <p className="text-gray-600 mb-4">
          אנו משתמשים במידע שנאסף למטרות הבאות:
          <ul className="list-disc list-inside mt-2 space-y-1">
            <li>אספקת השירותים שהמשתמש ביקש</li>
            <li>שליחת הודעות WhatsApp ו-SMS לאורחים</li>
            <li>ניהול חשבון המשתמש ותשלומים</li>
            <li>שיפור השירותים והתאמתם לצרכי המשתמש</li>
            <li>מניעת הונאות ופעילות בלתי חוקית</li>
            <li>קיום חובות משפטיות</li>
          </ul>
        </p>
      </section>

      <section>
        <h3 className="text-xl font-semibold text-gray-700 mb-2">4. אחסון מידע</h3>
        <p className="text-gray-600 mb-4">
          המידע נשמר במאגרי מידע מאובטחים בישראל ובשירותי ענן מאובטחים.
          אנו נוקטים באמצעי אבטחה טכנולוגיים וארגוניים מתקדמים להגנה על המידע,
          לרבות הצפנה, גיבויים סדירים ומגבלות גישה.
        </p>
      </section>

      <section>
        <h3 className="text-xl font-semibold text-gray-700 mb-2">5. שיתוף מידע עם צדדים שלישיים</h3>
        <p className="text-gray-600 mb-4">
          אנו לא מוכרים, משכירים או מעבירים את המידע האישי שלך לצדדים שלישיים למטרות מסחריות.
          אנו עשויים לשתף מידע עם:
          <ul className="list-disc list-inside mt-2 space-y-1">
            <li>ספקי שירותים טכנולוגיים (כגון שירותי ענן) המסייעים לנו להפעיל את המערכת</li>
            <li>Meta (WhatsApp) ו-Twilio (SMS) לצורך שליחת הודעות</li>
            <li>רשויות מוסמכות כאשר נדרש על פי חוק או צו בית משפט</li>
          </ul>
        </p>
      </section>

      <section>
        <h3 className="text-xl font-semibold text-gray-700 mb-2">6. זכויות המשתמש</h3>
        <p className="text-gray-600 mb-4">
          בהתאם לחוק הגנת הפרטיות, יש לך הזכות הבאה:
          <ul className="list-disc list-inside mt-2 space-y-1">
            <li>לעיין במידע האישי שלך השמור במערכת</li>
            <li>לדרוש תיקון או מחיקה של מידע לא מדויק או לא רלוונטי</li>
            <li>לבקש העברת המידע שלך למערכת אחרת (portability)</li>
            <li>להתנגד לעיבוד המידע שלך למטרות שיווק</li>
            <li>לבקש מחיקה של המידע שלך (right to be forgotten)</li>
          </ul>
          ניתן לממש זכויות אלה על ידי פנייה אלינו בכתובת: idodanan1@gmail.com
        </p>
      </section>

      <section>
        <h3 className="text-xl font-semibold text-gray-700 mb-2">7. Cookies וטכנולוגיות דומות</h3>
        <p className="text-gray-600 mb-4">
          המערכת משתמשת ב-localStorage לשמירת העדפות המשתמש ומידע התחברות.
          מידע זה נשמר במחשב שלך ולא מועבר לשרתים חיצוניים.
          ניתן למחוק את המידע בכל עת דרך הגדרות הדפדפן.
        </p>
      </section>

      <section>
        <h3 className="text-xl font-semibold text-gray-700 mb-2">8. אבטחת מידע</h3>
        <p className="text-gray-600 mb-4">
          אנו נוקטים באמצעי אבטחה מתקדמים להגנה על המידע, לרבות:
          <ul className="list-disc list-inside mt-2 space-y-1">
            <li>הצפנת מידע רגיש</li>
            <li>גיבויים סדירים</li>
            <li>מגבלות גישה למידע</li>
            <li>ניטור שוטף לזיהוי פעילות חשודה</li>
          </ul>
          למרות זאת, אין מערכת מאובטחת לחלוטין ואנו לא יכולים להבטיח אבטחה מוחלטת.
        </p>
      </section>

      <section>
        <h3 className="text-xl font-semibold text-gray-700 mb-2">9. שמירת מידע</h3>
        <p className="text-gray-600 mb-4">
          אנו שומרים את המידע כל עוד הוא נדרש למטרות שלשמן נאסף או כנדרש על פי חוק.
          מידע של משתמשים לא פעילים יישמר למשך תקופה של עד 3 שנים ממועד הפעילות האחרונה,
          אלא אם המשתמש מבקש למחוק את המידע קודם לכן.
        </p>
      </section>

      <section>
        <h3 className="text-xl font-semibold text-gray-700 mb-2">10. שינויים במדיניות</h3>
        <p className="text-gray-600 mb-4">
          אנו שומרים לעצמנו את הזכות לעדכן את מדיניות הפרטיות מעת לעת.
          שינויים מהותיים יפורסמו במערכת ויובאו לידיעת המשתמשים.
          המשך השימוש במערכת לאחר השינויים מהווה הסכמה למדיניות המעודכנת.
        </p>
      </section>

      <section>
        <h3 className="text-xl font-semibold text-gray-700 mb-2">11. יצירת קשר</h3>
        <p className="text-gray-600 mb-4">
          לכל שאלה או בקשה בנוגע לפרטיות, ניתן לפנות אלינו:
          <br />
          אימייל: idodanan1@gmail.com
          <br />
          אנו נשתדל להשיב לכל פנייה תוך 30 ימים.
        </p>
      </section>

      <section>
        <h3 className="text-xl font-semibold text-gray-700 mb-2">12. דין ש管辖</h3>
        <p className="text-gray-600 mb-4">
          מדיניות פרטיות זו כפופה לחוקי מדינת ישראל, לרבות חוק הגנת הפרטיות.
          כל סכסוך ייפתר בפני בתי המשפט המוסמכים בישראל.
        </p>
      </section>
    </div>
  );

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h1 className="text-2xl font-bold text-gray-800">
            {type === 'terms' ? 'תנאי שימוש' : 'מדיניות פרטיות'}
          </h1>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-6 h-6 text-gray-600" />
          </button>
        </div>
        <div className="overflow-y-auto p-6 flex-1">
          <div className="prose prose-sm max-w-none text-right">
            {content}
          </div>
        </div>
        <div className="p-6 border-t border-gray-200">
          <button
            onClick={onClose}
            className="w-full bg-teal-600 text-white py-3 rounded-lg font-semibold hover:bg-teal-700 transition-colors"
          >
            הבנתי
          </button>
        </div>
      </div>
    </div>
  );
};

export default TermsAndPrivacy;

