import React from 'react';
import { X, CheckCircle, AlertCircle } from 'lucide-react';

interface AccessibilityStatementProps {
  isOpen: boolean;
  onClose: () => void;
}

const AccessibilityStatement: React.FC<AccessibilityStatementProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="accessibility-statement-title"
    >
      <div
        className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h1 id="accessibility-statement-title" className="text-2xl font-bold text-gray-800">
            הצהרת נגישות
          </h1>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            aria-label="סגור"
          >
            <X className="w-6 h-6 text-gray-600" />
          </button>
        </div>
        <div className="overflow-y-auto p-6 flex-1">
          <div className="prose prose-sm max-w-none text-right space-y-6">
            <section>
              <h2 className="text-xl font-semibold text-gray-700 mb-3">מידע כללי</h2>
              <p className="text-gray-600 mb-4">
                בס"ד אירועים מחויבת לספק שירות נגיש לכלל המשתמשים, 
                בהתאם לחוק שוויון זכויות לאנשים עם מוגבלות, התשנ"ח-1998, 
                ולחוק שוויון זכויות לאנשים עם מוגבלות (תיקון מס' 2), התשע"ו-2016.
              </p>
              <p className="text-gray-600">
                האתר תואם לתקן WCAG 2.1 ברמה AA.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-700 mb-3">רמת הנגישות</h2>
              <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
                <div className="flex items-center gap-2 mb-2">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                  <span className="font-semibold text-green-800">תואם חלקית</span>
                </div>
                <p className="text-gray-700 text-sm">
                  האתר תואם לתקן WCAG 2.1 ברמה AA. חלק מהתכנים עדיין לא נגישים במלואם 
                  ואנו עובדים על שיפורם.
                </p>
              </div>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-700 mb-3">תכונות נגישות</h2>
              <ul className="list-disc list-inside space-y-2 text-gray-600">
                <li>ניווט במקלדת מלא</li>
                <li>תמיכה בקוראי מסך</li>
                <li>הגדלת טקסט עד 200%</li>
                <li>מצב ניגודיות גבוהה</li>
                <li>תוויות ARIA לכל האלמנטים</li>
                <li>קישור "דלג לתוכן הראשי"</li>
                <li>ניגודיות צבעים מינימלית של 4.5:1</li>
                <li>טקסט חלופי לתמונות</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-700 mb-3">תוכן לא נגיש</h2>
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <AlertCircle className="w-5 h-5 text-yellow-600" />
                  <span className="font-semibold text-yellow-800">תוכן שעדיין לא נגיש</span>
                </div>
                <ul className="list-disc list-inside space-y-1 text-gray-700 text-sm">
                  <li>חלק מהתמונות עדיין ללא טקסט חלופי מלא</li>
                  <li>חלק מהטבלאות דורשות שיפור לניווט בקוראי מסך</li>
                  <li>חלק מהטפסים דורשים שיפור נוסף</li>
                </ul>
                <p className="text-gray-700 text-sm mt-2">
                  אנו עובדים על שיפור הנגישות של תוכן זה.
                </p>
              </div>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-700 mb-3">כלי נגישות</h2>
              <p className="text-gray-600 mb-2">
                האתר כולל סרגל נגישות קבוע המאפשר:
              </p>
              <ul className="list-disc list-inside space-y-1 text-gray-600">
                <li>הגדלת והקטנת טקסט</li>
                <li>הפעלת מצב ניגודיות גבוהה</li>
                <li>הצגת קיצורי מקלדת</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-700 mb-3">דיווח על בעיות נגישות</h2>
              <p className="text-gray-600 mb-2">
                אם נתקלת בבעיית נגישות באתר, אנא צור קשר:
              </p>
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-gray-700">
                  <strong>אימייל:</strong>{' '}
                  <a 
                    href="mailto:idodanan1@gmail.com?subject=דיווח על בעיית נגישות" 
                    className="text-teal-600 hover:text-teal-700 underline"
                  >
                    idodanan1@gmail.com
                  </a>
                </p>
                <p className="text-gray-700 mt-2">
                  נשתדל להשיב לכל פנייה תוך 30 ימים.
                </p>
              </div>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-700 mb-3">תהליך אכיפה</h2>
              <p className="text-gray-600 mb-2">
                אם לא קיבלת תשובה מספקת, תוכל להגיש תלונה ל:
              </p>
              <ul className="list-disc list-inside space-y-1 text-gray-600">
                <li>
                  <strong>נציבות שוויון זכויות לאנשים עם מוגבלות:</strong>{' '}
                  <a 
                    href="https://www.gov.il/he/departments/nezek_shiuyon" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-teal-600 hover:text-teal-700 underline"
                  >
                    אתר הנציבות
                  </a>
                </li>
                <li>
                  <strong>טלפון:</strong> 02-508-2000
                </li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-700 mb-3">תאריך עדכון</h2>
              <p className="text-gray-600">
                הצהרת נגישות זו עודכנה לאחרונה ב-{new Date().toLocaleDateString('he-IL')}.
              </p>
            </section>
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

export default AccessibilityStatement;

