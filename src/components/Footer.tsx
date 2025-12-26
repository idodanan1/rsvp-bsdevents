import React from 'react';
import { Mail, Phone, MapPin, FileText, Shield } from 'lucide-react';
import Link from 'next/link';

const Footer: React.FC = () => {
  return (
    <footer className="bg-gray-800 text-white mt-auto flex-shrink-0 w-full" role="contentinfo">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* פרטי יצירת קשר */}
          <div>
            <h3 className="text-lg font-semibold mb-4">פרטי יצירת קשר</h3>
            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2">
                <Mail className="w-4 h-4" aria-hidden="true" />
                <a 
                  href="mailto:idodanan1@gmail.com" 
                  className="hover:text-teal-400 transition-colors"
                  aria-label="שלח אימייל"
                >
                  idodanan1@gmail.com
                </a>
              </div>
              <div className="flex items-center gap-2">
                <Phone className="w-4 h-4" aria-hidden="true" />
                <span>לפרטים נוספים - צור קשר</span>
              </div>
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4" aria-hidden="true" />
                <span>ישראל</span>
              </div>
            </div>
          </div>

          {/* קישורים משפטיים */}
          <div>
            <h3 className="text-lg font-semibold mb-4">מידע משפטי</h3>
            <nav className="space-y-2 text-sm" aria-label="קישורים משפטיים">
              <div>
                <Link 
                  href="/terms" 
                  className="flex items-center gap-2 hover:text-teal-400 transition-colors"
                  aria-label="תנאי שימוש"
                >
                  <FileText className="w-4 h-4" aria-hidden="true" />
                  תנאי שימוש
                </Link>
              </div>
              <div>
                <Link 
                  href="/privacy" 
                  className="flex items-center gap-2 hover:text-teal-400 transition-colors"
                  aria-label="מדיניות פרטיות"
                >
                  <Shield className="w-4 h-4" aria-hidden="true" />
                  מדיניות פרטיות
                </Link>
              </div>
              <div>
                <Link 
                  href="/accessibility" 
                  className="flex items-center gap-2 hover:text-teal-400 transition-colors"
                  aria-label="הצהרת נגישות"
                >
                  <Shield className="w-4 h-4" aria-hidden="true" />
                  הצהרת נגישות
                </Link>
              </div>
            </nav>
          </div>

          {/* מידע על החברה */}
          <div>
            <h3 className="text-lg font-semibold mb-4">אודות</h3>
            <div className="text-sm space-y-2">
              <p>בס"ד אירועים</p>
              <p>מערכת ניהול הזמנות ואישורי הגעה</p>
              <p className="text-gray-400 text-xs mt-4">
                כל הזכויות שמורות © {new Date().getFullYear()}
              </p>
            </div>
          </div>

          {/* מדיניות החזרים */}
          <div>
            <h3 className="text-lg font-semibold mb-4">מדיניות החזרים</h3>
            <div className="text-sm space-y-2">
              <p>
                רכישת רשומות (credits) היא סופית ואינה ניתנת להחזר, 
                אלא אם כן נדרש על פי חוק.
              </p>
              <p className="text-gray-400 text-xs">
                לשאלות בנוגע להחזרים, אנא צור קשר בכתובת האימייל למעלה.
              </p>
            </div>
          </div>
        </div>

        {/* שורת תחתונה */}
        <div className="border-t border-gray-700 mt-8 pt-6 text-center text-sm text-gray-400">
          <p>
            האתר פועל בהתאם לחוקי מדינת ישראל | 
            {' '}
            <a 
              href="mailto:idodanan1@gmail.com" 
              className="hover:text-teal-400 transition-colors"
            >
              דיווח על בעיות נגישות
            </a>
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;

