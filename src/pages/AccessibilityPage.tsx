import React, { useState } from 'react';
import AccessibilityStatement from '../components/AccessibilityStatement';
import Footer from '../components/Footer';
import { Shield } from 'lucide-react';

const AccessibilityPage: React.FC = () => {
  const [showStatement, setShowStatement] = useState(false);

  return (
    <>
      <div className="min-h-screen bg-gradient-to-br from-teal-50 to-yellow-50 p-8">
        <div className="max-w-4xl mx-auto bg-white rounded-2xl shadow-xl p-8">
          <div className="text-center mb-8">
            <Shield className="w-16 h-16 text-teal-600 mx-auto mb-4" />
            <h1 className="text-3xl font-bold text-gray-800 mb-2">הצהרת נגישות</h1>
            <p className="text-gray-600">מידע על נגישות האתר</p>
          </div>

          <div className="space-y-6">
            <section className="bg-gray-50 rounded-lg p-6">
              <h2 className="text-xl font-semibold text-gray-700 mb-3">מידע כללי</h2>
              <p className="text-gray-600 mb-4">
                בס"ד אירועים מחויבת לספק שירות נגיש לכלל המשתמשים, 
                בהתאם לחוק שוויון זכויות לאנשים עם מוגבלות, התשנ"ח-1998.
              </p>
              <p className="text-gray-600">
                האתר תואם לתקן WCAG 2.1 ברמה AA.
              </p>
            </section>

            <section className="bg-green-50 border border-green-200 rounded-lg p-6">
              <h2 className="text-xl font-semibold text-gray-700 mb-3">רמת הנגישות</h2>
              <p className="text-gray-700 mb-2">
                <strong>תואם חלקית</strong> - האתר תואם לתקן WCAG 2.1 ברמה AA.
              </p>
              <p className="text-gray-600 text-sm">
                חלק מהתכנים עדיין לא נגישים במלואם ואנו עובדים על שיפורם.
              </p>
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
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-700 mb-3">דיווח על בעיות נגישות</h2>
              <p className="text-gray-600 mb-4">
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
              </div>
            </section>

            <div className="text-center">
              <button
                onClick={() => setShowStatement(true)}
                className="bg-teal-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-teal-700 transition-colors"
              >
                הצג הצהרת נגישות מלאה
              </button>
            </div>
          </div>
        </div>

        <AccessibilityStatement
          isOpen={showStatement}
          onClose={() => setShowStatement(false)}
        />
        <Footer />
      </div>
    </>
  );
};

export default AccessibilityPage;
