import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useUserStore } from '../store/userStore';
import { Mail, Lock, LogIn, UserPlus } from 'lucide-react';
import toast from 'react-hot-toast';
import TermsAndPrivacy from './TermsAndPrivacy';
import Footer from './Footer';

const Login: React.FC = () => {
  // Load saved email from localStorage if exists
  const savedEmail = localStorage.getItem('rsvp-saved-email') || '';
  const [email, setEmail] = useState(savedEmail);
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(!!savedEmail);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [showTermsModal, setShowTermsModal] = useState(false);
  const [showPrivacyModal, setShowPrivacyModal] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const login = useUserStore(state => state.login);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // CRITICAL: Check if terms are accepted
    if (!acceptedTerms) {
      toast.error('אנא אשר את תנאי השימוש ומדיניות הפרטיות');
      return;
    }
    
    setIsLoading(true);

    try {
      await login(email, password);
      
      // Save email if "remember me" is checked
      if (rememberMe) {
        localStorage.setItem('rsvp-saved-email', email);
      } else {
        localStorage.removeItem('rsvp-saved-email');
      }
      
      toast.success('התחברת בהצלחה!');
      navigate('/');
    } catch (error: any) {
      toast.error(error.message || 'שגיאה בהתחברות');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-teal-50 to-yellow-50 px-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8">
        <header className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">ברוכים הבאים למערכת אישורי ההגעה של בס"ד אירועים</h1>
          <p className="text-gray-600">התחבר לחשבון שלך</p>
        </header>

        <form onSubmit={handleSubmit} className="space-y-6" aria-label="טופס התחברות">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              אימייל
            </label>
            <div className="relative">
              <Mail className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="email"
                id="email-input"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                aria-required="true"
                aria-label="כתובת אימייל"
                className="w-full pr-10 pl-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                placeholder="הכנס אימייל"
                dir="ltr"
                autoComplete="email"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              סיסמה
            </label>
            <div className="relative">
              <Lock className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="password"
                id="password-input"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                aria-required="true"
                aria-label="סיסמה"
                className="w-full pr-10 pl-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                placeholder="הכנס סיסמה"
                dir="ltr"
                autoComplete="current-password"
              />
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center">
              <label className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="checkbox"
                  id="remember-me"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  aria-label="זכור את פרטי ההתחברות"
                  className="w-4 h-4 text-teal-600 border-gray-300 rounded focus:ring-teal-500"
                />
                <span className="text-sm text-gray-600">זכור את פרטי ההתחברות</span>
              </label>
            </div>

            <div className="flex items-start space-x-2 p-3 bg-gray-50 rounded-lg border border-gray-200" role="group" aria-labelledby="terms-label">
              <input
                type="checkbox"
                id="acceptTerms"
                checked={acceptedTerms}
                onChange={(e) => setAcceptedTerms(e.target.checked)}
                required
                aria-required="true"
                aria-describedby="terms-description"
                className="mt-1 w-4 h-4 text-teal-600 border-gray-300 rounded focus:ring-teal-500"
              />
              <label htmlFor="acceptTerms" id="terms-label" className="text-sm text-gray-700 cursor-pointer flex-1">
                <span id="terms-description">אני מאשר שקראתי והבנתי את{' '}</span>
                <button
                  type="button"
                  onClick={() => setShowTermsModal(true)}
                  className="text-teal-600 hover:text-teal-700 underline font-semibold focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2 rounded"
                  aria-label="קרא תנאי שימוש"
                >
                  תנאי השימוש
                </button>
                {' '}ואת{' '}
                <button
                  type="button"
                  onClick={() => setShowPrivacyModal(true)}
                  className="text-teal-600 hover:text-teal-700 underline font-semibold focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2 rounded"
                  aria-label="קרא מדיניות פרטיות"
                >
                  מדיניות הפרטיות
                </button>
                {' '}ומסכים להם. אני מבין שהמערכת אוספת ומעבדת את המידע שלי בהתאם למדיניות הפרטיות.
              </label>
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            aria-label={isLoading ? 'מתחבר...' : 'התחבר למערכת'}
            className="w-full bg-teal-600 text-white py-3 rounded-lg font-semibold hover:bg-teal-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isLoading ? (
              'מתחבר...'
            ) : (
              <>
                <LogIn className="w-5 h-5" />
                התחבר
              </>
            )}
          </button>
        </form>

        <div className="mt-6 text-center">
          <p className="text-gray-600">
            עדיין אין לך חשבון?{' '}
            <Link 
              to="/signup" 
              className="text-teal-600 hover:text-teal-700 font-semibold focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2 rounded"
              aria-label="הירשם למערכת"
            >
              הירשם עכשיו
            </Link>
          </p>
        </div>

        {/* Terms and Privacy Modals */}
        <TermsAndPrivacy
          isOpen={showTermsModal}
          onClose={() => setShowTermsModal(false)}
          type="terms"
        />
        <TermsAndPrivacy
          isOpen={showPrivacyModal}
          onClose={() => setShowPrivacyModal(false)}
          type="privacy"
        />
        </div>
        <Footer />
      </div>
    </>
  );
};

export default Login;

