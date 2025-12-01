import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useUserStore } from '../store/userStore';
import { Mail, Lock, User, UserPlus, Phone, Send } from 'lucide-react';
import toast from 'react-hot-toast';
import TermsAndPrivacy from './TermsAndPrivacy';
import Footer from './Footer';

const SignUp: React.FC = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [codeSent, setCodeSent] = useState(false);
  const [codeVerified, setCodeVerified] = useState(false);
  const [sendingCode, setSendingCode] = useState(false);
  const [verifyingCode, setVerifyingCode] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [showTermsModal, setShowTermsModal] = useState(false);
  const [showPrivacyModal, setShowPrivacyModal] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const signUp = useUserStore(state => state.signUp);

  const handleSendCode = async () => {
    if (!phoneNumber.trim()) {
      toast.error('אנא הכנס מספר טלפון');
      return;
    }

    // Validate Israeli phone number
    const normalizedPhone = phoneNumber.replace(/[\s\-\(\)]/g, '');
    if (!/^0?5[0-9]{8}$/.test(normalizedPhone)) {
      toast.error('מספר טלפון לא תקין. אנא הכנס מספר טלפון ישראלי (05X-XXX-XXXX)');
      return;
    }

    setSendingCode(true);
    try {
      const backendUrl = import.meta.env.VITE_BACKEND_URL || 'https://whatsapp-backend-enfz.onrender.com';
      const response = await fetch(`${backendUrl}/api/users/send-verification-code`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          phoneNumber: normalizedPhone,
          purpose: 'signup'
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'שגיאה בשליחת קוד אימות');
      }

      setCodeSent(true);
      toast.success('קוד אימות נשלח בהצלחה! בדוק את ה-WhatsApp שלך');
    } catch (error: any) {
      console.error('❌ Send code error:', error);
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
      const normalizedPhone = phoneNumber.replace(/[\s\-\(\)]/g, '');
      const response = await fetch(`${backendUrl}/api/users/verify-code`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          phoneNumber: normalizedPhone,
          code: verificationCode.trim(),
          purpose: 'signup'
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'שגיאה באימות קוד');
      }

      setCodeVerified(true);
      toast.success('קוד אימות תקין!');
    } catch (error: any) {
      console.error('❌ Verify code error:', error);
      toast.error(error.message || 'שגיאה באימות קוד');
    } finally {
      setVerifyingCode(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // CRITICAL: Check if terms are accepted
    if (!acceptedTerms) {
      toast.error('אנא אשר את תנאי השימוש ומדיניות הפרטיות');
      return;
    }

    if (!codeVerified) {
      toast.error('אנא אמת את מספר הטלפון תחילה');
      return;
    }

    if (password !== confirmPassword) {
      toast.error('הסיסמאות לא תואמות');
      return;
    }

    if (password.length < 6) {
      toast.error('הסיסמה חייבת להכיל לפחות 6 תווים');
      return;
    }

    setIsLoading(true);

    try {
      const normalizedPhone = phoneNumber.replace(/[\s\-\(\)]/g, '');
      await signUp(email, password, name, normalizedPhone, verificationCode);
      toast.success('נרשמת בהצלחה!');
      navigate('/');
    } catch (error: any) {
      toast.error(error.message || 'שגיאה בהרשמה');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-teal-50 to-yellow-50">
      <div className="flex-1 flex items-center justify-center px-4 py-8">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-800 mb-2">הרשמה</h1>
            <p className="text-gray-600">צור חשבון חדש</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                שם מלא
              </label>
              <div className="relative">
                <User className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  className="w-full pr-10 pl-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                  placeholder="הכנס שם מלא"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                אימייל
              </label>
              <div className="relative">
                <Mail className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full pr-10 pl-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                  placeholder="הכנס אימייל"
                  dir="ltr"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                מספר טלפון <span className="text-red-500">*</span>
              </label>
              <div className="space-y-2">
                <div className="relative">
                  <Phone className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <input
                    type="tel"
                    value={phoneNumber}
                    onChange={(e) => {
                      setPhoneNumber(e.target.value);
                      setCodeSent(false);
                      setCodeVerified(false);
                    }}
                    required
                    disabled={codeVerified}
                    className="w-full pr-10 pl-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent disabled:bg-gray-100"
                    placeholder="05X-XXX-XXXX"
                    dir="ltr"
                    pattern="0?5[0-9]{8}"
                  />
                </div>
                {!codeSent && !codeVerified && (
                  <button
                    type="button"
                    onClick={handleSendCode}
                    disabled={sendingCode || !phoneNumber.trim()}
                    className="w-full px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {sendingCode ? (
                      'שולח...'
                    ) : (
                      <>
                        <Send className="w-4 h-4" />
                        שלח קוד אימות
                      </>
                    )}
                  </button>
                )}
                {codeSent && !codeVerified && (
                  <div className="space-y-2">
                    <div className="relative">
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
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={handleVerifyCode}
                        disabled={verifyingCode || verificationCode.length !== 6}
                        className="flex-1 px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {verifyingCode ? 'מאמת...' : 'אמת קוד'}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setCodeSent(false);
                          setVerificationCode('');
                        }}
                        className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                      >
                        ביטול
                      </button>
                    </div>
                    <p className="text-xs text-gray-500 text-center">
                      לא קיבלת קוד? <button type="button" onClick={handleSendCode} className="text-teal-600 hover:underline">שלח שוב</button>
                    </p>
                  </div>
                )}
                {codeVerified && (
                  <div className="px-4 py-2 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm text-center">
                    ✓ מספר טלפון מאומת
                  </div>
                )}
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
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                  className="w-full pr-10 pl-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                  placeholder="הכנס סיסמה (מינימום 6 תווים)"
                  dir="ltr"
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
                  placeholder="הכנס סיסמה שוב"
                  dir="ltr"
                />
              </div>
            </div>

            <div className="flex items-start space-x-2 p-3 bg-gray-50 rounded-lg border border-gray-200" role="group" aria-labelledby="terms-label-signup">
              <input
                type="checkbox"
                id="acceptTermsSignup"
                checked={acceptedTerms}
                onChange={(e) => setAcceptedTerms(e.target.checked)}
                required
                aria-required="true"
                aria-describedby="terms-description-signup"
                className="mt-1 w-4 h-4 text-teal-600 border-gray-300 rounded focus:ring-teal-500"
              />
              <label htmlFor="acceptTermsSignup" id="terms-label-signup" className="text-sm text-gray-700 cursor-pointer flex-1">
                <span id="terms-description-signup">אני מאשר שקראתי והבנתי את{' '}</span>
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

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-teal-600 text-white py-3 rounded-lg font-semibold hover:bg-teal-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isLoading ? (
                'נרשם...'
              ) : (
                <>
                  <UserPlus className="w-5 h-5" />
                  הירשם
                </>
              )}
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-gray-600">
              כבר יש לך חשבון?{' '}
              <Link to="/login" className="text-teal-600 hover:text-teal-700 font-semibold">
                התחבר
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
      </div>
      <Footer />
    </div>
  );
};

export default SignUp;

