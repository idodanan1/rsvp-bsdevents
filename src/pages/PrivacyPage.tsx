import React, { useState } from 'react';
import TermsAndPrivacy from '../components/TermsAndPrivacy';
import Footer from '../components/Footer';
import { Shield } from 'lucide-react';

const PrivacyPage: React.FC = () => {
  const [showModal, setShowModal] = useState(true);

  return (
    <>
      <div className="min-h-screen bg-gradient-to-br from-teal-50 to-yellow-50 p-8">
        <div className="max-w-4xl mx-auto bg-white rounded-2xl shadow-xl p-8">
          <div className="text-center mb-8">
            <Shield className="w-16 h-16 text-teal-600 mx-auto mb-4" />
            <h1 className="text-3xl font-bold text-gray-800 mb-2">מדיניות פרטיות</h1>
            <p className="text-gray-600">קרא את מדיניות הפרטיות המלאה</p>
          </div>

          <div className="text-center">
            <button
              onClick={() => setShowModal(true)}
              className="bg-teal-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-teal-700 transition-colors"
            >
              הצג מדיניות פרטיות מלאה
            </button>
          </div>
        </div>

        <TermsAndPrivacy
          isOpen={showModal}
          onClose={() => setShowModal(false)}
          type="privacy"
        />
        <Footer />
      </div>
    </>
  );
};

export default PrivacyPage;
