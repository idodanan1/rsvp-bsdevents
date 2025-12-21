import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useUserStore } from '../store/userStore';
import { Mail, Lock, LogIn, UserPlus, X } from 'lucide-react';
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
  const [showForgotPasswordModal, setShowForgotPasswordModal] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const login = useUserStore(state => state.login);
  const { user, isAuthenticated } = useUserStore();
  
  // CRITICAL: If user is already logged in, redirect to last location or dashboard
  React.useEffect(() => {
    if (isAuthenticated && user) {
      const lastLocation = localStorage.getItem('rsvp-last-location');
      if (lastLocation && lastLocation !== '/login' && lastLocation !== '/signup') {
        navigate(lastLocation, { replace: true });
      } else {
        navigate('/', { replace: true });
      }
    }
  }, [isAuthenticated, user, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // CRITICAL: Check if terms are accepted
    if (!acceptedTerms) {
      toast.error('אנא אשר את תנאי השימוש ומדיניות הפרטיות');
      return;
    }
    
    // Normalize email (trim whitespace)
    const normalizedEmail = email.trim();
    const normalizedPassword = password.trim();
    
    if (!normalizedEmail || !normalizedPassword) {
      toast.error('אנא מלא את כל השדות');
      return;
    }
    
    setIsLoading(true);

    try {
      console.log('🔐 Login attempt:', {
        email: normalizedEmail,
        passwordLength: normalizedPassword.length,
        rememberMe: rememberMe
      });
      
      await login(normalizedEmail, normalizedPassword);
      
      // Save email if "remember me" is checked
      if (rememberMe) {
        localStorage.setItem('rsvp-saved-email', normalizedEmail);
      } else {
        localStorage.removeItem('rsvp-saved-email');
      }
      
      toast.success('התחברת בהצלחה!');
      
      // CRITICAL: Redirect to last location if exists, otherwise go to dashboard
      const lastLocation = localStorage.getItem('rsvp-last-location');
      if (lastLocation && lastLocation !== '/login' && lastLocation !== '/signup') {
        navigate(lastLocation);
      } else {
        navigate('/');
      }
    } catch (error: any) {
      console.error('❌ Login error:', error);
      const errorMessage = error.message || 'שגיאה בהתחברות';
      toast.error(errorMessage);
      
      // Show more detailed error in console for debugging
      if (errorMessage.includes('אימייל או סיסמה שגויים') || errorMessage.includes('משתמש לא נמצא')) {
        console.error('💡 Troubleshooting tips:');
        console.error('1. אם זה מחשב חדש, המשתמש לא קיים ב-backend');
        console.error('2. פתרון: הירשם מחדש עם אותו אימייל וסיסמה');
        console.error('3. האירועים יתחברו אוטומטית לפי האימייל');
        console.error('4. אם זה לא עובד, בדוק שהאימייל והסיסמה נכונים');
        
        // Show helpful message to user
        if (errorMessage.includes('משתמש לא נמצא')) {
          toast.error('המשתמש לא קיים במערכת. אם זה מחשב חדש, אנא הירשם מחדש עם אותו אימייל וסיסמה.', {
            duration: 5000
          });
        }
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-teal-50 to-yellow-50">
      <div className="flex-1 flex items-center justify-center px-4 py-8">
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
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium text-gray-700">
                  סיסמה
                </label>
                <button
                  type="button"
                  onClick={() => setShowForgotPasswordModal(true)}
                  className="text-sm text-teal-600 hover:text-teal-700 font-medium focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2 rounded"
                  aria-label="שכחתי סיסמה"
                >
                  שכחתי סיסמה?
                </button>
              </div>
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
              {isLoading && 'מתחבר...'}
              {!isLoading && (
                <span className="flex items-center gap-2">
                  <LogIn className="w-5 h-5" />
                  התחבר
                </span>
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

          {/* Forgot Password Modal */}
          {showForgotPasswordModal && (
            <ForgotPasswordModal
              isOpen={showForgotPasswordModal}
              onClose={() => setShowForgotPasswordModal(false)}
            />
          )}
        </div>
      </div>
      <Footer />
    </div>
  );
};

// Forgot Password Modal Component
interface ForgotPasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const ForgotPasswordModal: React.FC<ForgotPasswordModalProps> = ({ isOpen, onClose }) => {
  const [resetEmail, setResetEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [codeSent, setCodeSent] = useState(false);
  const [codeVerified, setCodeVerified] = useState(false);
  const [sendingCode, setSendingCode] = useState(false);
  const [verifyingCode, setVerifyingCode] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [step, setStep] = useState<'email' | 'verify' | 'password'>('email');

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!resetEmail.trim()) {
      toast.error('אנא הכנס אימייל');
      return;
    }

    setIsLoading(true);
    try {
      const backendUrl = import.meta.env.VITE_BACKEND_URL || 'https://whatsapp-backend-enfz.onrender.com';
      const response = await fetch(`${backendUrl}/api/users/check-email`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email: resetEmail.trim() })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'שגיאה בבדיקת אימייל');
      }

      if (data.exists) {
        setStep('verify');
        toast.success('אימייל נמצא במערכת. אנא אמת את מספר הטלפון');
      } else {
        toast.error('אימייל זה לא קיים במערכת');
      }
    } catch (error: any) {
      console.error('❌ Check email error:', error);
      toast.error(error.message || 'שגיאה בבדיקת אימייל');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendVerificationCode = async () => {
    setSendingCode(true);
    try {
      const backendUrl = import.meta.env.VITE_BACKEND_URL || 'https://whatsapp-backend-enfz.onrender.com';
      const response = await fetch(`${backendUrl}/api/users/check-email`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email: resetEmail.trim() })
      });

      const data = await response.json();

      if (!response.ok || !data.exists) {
        throw new Error('אימייל לא נמצא במערכת');
      }

      // Get user's phone number from backend
      const userResponse = await fetch(`${backendUrl}/api/users`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      const usersData = await userResponse.json();
      const user = usersData.users?.find((u: any) => u.email.toLowerCase() === resetEmail.toLowerCase().trim());
      
      if (!user || !user.phoneNumber) {
        throw new Error('מספר טלפון לא נמצא לחשבון זה');
      }

      // Send verification code
      const codeResponse = await fetch(`${backendUrl}/api/users/send-verification-code`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          phoneNumber: user.phoneNumber,
          purpose: 'reset-password'
        })
      });

      const codeData = await codeResponse.json();

      if (!codeResponse.ok) {
        throw new Error(codeData.error || 'שגיאה בשליחת קוד אימות');
      }

      setCodeSent(true);
      toast.success('קוד אימות נשלח לחשבון WhatsApp שלך');
    } catch (error: any) {
      console.error('❌ Send verification code error:', error);
      toast.error(error.message || 'שגיאה בשליחת קוד אימות');
    } finally {
      setSendingCode(false);
    }
  };

  const handleVerifyCode = async () => {
    if (!verificationCode.trim()) {
      toast.error('אנא הכנס קוד אימות');
      return;
    }

    setVerifyingCode(true);
    try {
      const backendUrl = import.meta.env.VITE_BACKEND_URL || 'https://whatsapp-backend-enfz.onrender.com';
      
      // Get user's phone number
      const userResponse = await fetch(`${backendUrl}/api/users`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      const usersData = await userResponse.json();
      const user = usersData.users?.find((u: any) => u.email.toLowerCase() === resetEmail.toLowerCase().trim());
      
      if (!user || !user.phoneNumber) {
        throw new Error('מספר טלפון לא נמצא');
      }

      const response = await fetch(`${backendUrl}/api/users/verify-code`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          phoneNumber: user.phoneNumber,
          code: verificationCode.trim(),
          purpose: 'reset-password'
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'שגיאה באימות קוד');
      }

      setCodeVerified(true);
      setStep('password');
      toast.success('קוד אימות תקין! אנא הכנס סיסמה חדשה');
    } catch (error: any) {
      console.error('❌ Verify code error:', error);
      toast.error(error.message || 'שגיאה באימות קוד');
    } finally {
      setVerifyingCode(false);
    }
  };

  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!codeVerified) {
      toast.error('אנא אמת את מספר הטלפון תחילה');
      return;
    }

    if (!newPassword || !confirmPassword) {
      toast.error('אנא מלא את כל השדות');
      return;
    }

    if (newPassword.length < 6) {
      toast.error('סיסמה חייבת להכיל לפחות 6 תווים');
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error('הסיסמאות לא תואמות');
      return;
    }

    setIsLoading(true);
    try {
      const backendUrl = import.meta.env.VITE_BACKEND_URL || 'https://whatsapp-backend-enfz.onrender.com';
      const response = await fetch(`${backendUrl}/api/users/reset-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: resetEmail.trim(),
          newPassword: newPassword.trim(),
          verificationCode: verificationCode.trim()
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'שגיאה באיפוס סיסמה');
      }

      toast.success('הסיסמה עודכנה בהצלחה!');
      onClose();
      setStep('email');
      setResetEmail('');
      setNewPassword('');
      setConfirmPassword('');
      setVerificationCode('');
      setCodeSent(false);
      setCodeVerified(false);
    } catch (error: any) {
      console.error('❌ Reset password error:', error);
      toast.error(error.message || 'שגיאה באיפוס סיסמה');
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6 relative">
        <button
          onClick={onClose}
          className="absolute top-4 left-4 text-gray-400 hover:text-gray-600 transition-colors"
          aria-label="סגור"
        >
          <X className="w-6 h-6" />
        </button>

        <h2 className="text-2xl font-bold text-gray-800 mb-6 text-center">
          איפוס סיסמה
        </h2>

        {step === 'email' ? (
          <form onSubmit={handleEmailSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                אימייל
              </label>
              <div className="relative">
                <Mail className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="email"
                  value={resetEmail}
                  onChange={(e) => setResetEmail(e.target.value)}
                  required
                  className="w-full pr-10 pl-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                  placeholder="הכנס את האימייל שלך"
                  dir="ltr"
                  autoComplete="email"
                />
              </div>
              <p className="text-sm text-gray-500 mt-2">
                נבדוק אם האימייל קיים במערכת
              </p>
            </div>

            <div className="flex space-x-3">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                ביטול
              </button>
              <button
                type="submit"
                disabled={isLoading}
                className="flex-1 px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? 'בודק...' : 'המשך'}
              </button>
            </div>
          </form>
        ) : step === 'verify' ? (
          <div className="space-y-4">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm text-blue-800">
                קוד אימות נשלח לחשבון WhatsApp שלך. אנא הכנס את הקוד שקיבלת.
              </p>
            </div>

            {!codeSent ? (
              <button
                type="button"
                onClick={handleSendVerificationCode}
                disabled={sendingCode}
                className="w-full px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {sendingCode ? 'שולח...' : 'שלח קוד אימות'}
              </button>
            ) : (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    קוד אימות
                  </label>
                  <input
                    type="text"
                    value={verificationCode}
                    onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    placeholder="הכנס קוד אימות (6 ספרות)"
                    className="w-full pr-4 pl-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent text-center text-2xl tracking-widest"
                    dir="ltr"
                    maxLength={6}
                  />
                </div>

                <div className="flex space-x-3">
                  <button
                    type="button"
                    onClick={() => {
                      setStep('email');
                      setVerificationCode('');
                      setCodeSent(false);
                    }}
                    className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    חזור
                  </button>
                  <button
                    type="button"
                    onClick={handleVerifyCode}
                    disabled={verifyingCode || verificationCode.length !== 6}
                    className="flex-1 px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {verifyingCode ? 'מאמת...' : 'אמת קוד'}
                  </button>
                </div>

                <p className="text-xs text-gray-500 text-center">
                  לא קיבלת קוד? <button type="button" onClick={handleSendVerificationCode} className="text-teal-600 hover:underline">שלח שוב</button>
                </p>
              </div>
            )}
          </div>
        ) : (
          <form onSubmit={handlePasswordReset} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                סיסמה חדשה
              </label>
              <div className="relative">
                <Lock className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  minLength={6}
                  className="w-full pr-10 pl-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                  placeholder="הכנס סיסמה חדשה (לפחות 6 תווים)"
                  dir="ltr"
                  autoComplete="new-password"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                אימות סיסמה
              </label>
              <div className="relative">
                <Lock className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  minLength={6}
                  className="w-full pr-10 pl-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                  placeholder="הכנס שוב את הסיסמה"
                  dir="ltr"
                  autoComplete="new-password"
                />
              </div>
            </div>

            <div className="flex space-x-3">
              <button
                type="button"
                onClick={() => {
                  setStep('verify');
                  setNewPassword('');
                  setConfirmPassword('');
                }}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                חזור
              </button>
              <button
                type="submit"
                disabled={isLoading}
                className="flex-1 px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? 'מעדכן...' : 'אפס סיסמה'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default Login;
