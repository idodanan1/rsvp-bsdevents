import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUserStore } from '../store/userStore';
import { PricingPackage } from '../types';
import { Check, Package } from 'lucide-react';
import { growService } from '../services/growService';
import { morningInvoiceService } from '../services/morningInvoiceService';
import toast from 'react-hot-toast';

// חבילות תמחור - קפיצות של 50 רשומות, מחיר 1.5 ש"ח לרשומה
const PRICING_PACKAGES: PricingPackage[] = [
  { credits: 50, price: 75, label: '50 רשומות' },
  { credits: 100, price: 150, label: '100 רשומות' },
  { credits: 150, price: 225, label: '150 רשומות' },
  { credits: 200, price: 300, label: '200 רשומות' },
  { credits: 250, price: 375, label: '250 רשומות' },
  { credits: 300, price: 450, label: '300 רשומות' },
];

const Pricing: React.FC = () => {
  const [selectedPackage, setSelectedPackage] = useState<PricingPackage | null>(null);
  const [paymentUrl, setPaymentUrl] = useState<string | null>(null);
  const navigate = useNavigate();
  const user = useUserStore(state => state.user);

  useEffect(() => {
    // Check for success parameter
    const params = new URLSearchParams(window.location.search);
    if (params.get('success') === 'true') {
      toast.success('התשלום בוצע בהצלחה!');
      navigate('/');
    }
  }, [navigate]);

  const handlePackageSelect = async (pkg: PricingPackage) => {
    if (!user) {
      toast.error('אנא התחבר תחילה');
      navigate('/login');
      return;
    }

    setSelectedPackage(pkg);
    setPaymentUrl(null);

    try {
      // Use Grow only
      const growResponse = await growService.createPayment({
        amount: pkg.price,
        credits: pkg.credits,
        userId: user.id,
        currency: 'ILS',
        customerName: user.name,
        customerEmail: user.email,
      });
      
      if (growResponse.success && growResponse.paymentUrl) {
        setPaymentUrl(growResponse.paymentUrl);
        return;
      } else {
        throw new Error('שגיאה ביצירת תשלום ב-Grow');
      }
    } catch (error: any) {
      toast.error(error.message || 'שגיאה ביצירת תשלום');
      setSelectedPackage(null);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-50 to-yellow-50 py-12 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-800 mb-4">רכישת רשומות</h1>
          <p className="text-xl text-gray-600">
            בחר את החבילה המתאימה לך
          </p>
          {user && (
            <div className="mt-4 inline-block bg-white px-6 py-3 rounded-lg shadow-md">
              <p className="text-gray-700">
                יתרה נוכחית: <span className="font-bold text-teal-600">{user.credits} רשומות</span>
              </p>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          {PRICING_PACKAGES.map((pkg) => (
            <div
              key={pkg.credits}
              onClick={() => handlePackageSelect(pkg)}
              className={`bg-white rounded-xl shadow-lg p-6 cursor-pointer transition-all ${
                selectedPackage?.credits === pkg.credits
                  ? 'ring-4 ring-teal-500 transform scale-105'
                  : 'hover:shadow-xl hover:scale-102'
              }`}
            >
              <div className="flex items-center justify-between mb-4">
                <Package className="w-8 h-8 text-teal-600" />
                {selectedPackage?.credits === pkg.credits && (
                  <Check className="w-6 h-6 text-teal-600" />
                )}
              </div>
              <h3 className="text-2xl font-bold text-gray-800 mb-2">{pkg.label}</h3>
              <div className="mb-4">
                <span className="text-3xl font-bold text-teal-600">{pkg.price}</span>
                <span className="text-gray-600 mr-2">ש"ח</span>
              </div>
              <p className="text-gray-600 text-sm mb-4">
                מחיר לרשומה: {(pkg.price / pkg.credits).toFixed(2)} ש"ח
              </p>
              <div className="pt-4 border-t border-gray-200">
                <p className="text-sm text-gray-500">
                  {pkg.credits} רשומות זמינות
                </p>
              </div>
            </div>
          ))}
        </div>

        {selectedPackage && paymentUrl && (
          <div className="bg-white rounded-xl shadow-lg p-8 max-w-md mx-auto">
            <h2 className="text-2xl font-bold text-gray-800 mb-4 text-center">
              סיכום הזמנה
            </h2>
            <div className="space-y-4 mb-6">
              <div className="flex justify-between">
                <span className="text-gray-600">חבילה:</span>
                <span className="font-semibold">{selectedPackage.label}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">כמות רשומות:</span>
                <span className="font-semibold">{selectedPackage.credits}</span>
              </div>
              <div className="flex justify-between text-lg font-bold border-t pt-4">
                <span>סה"כ לתשלום:</span>
                <span className="text-teal-600">{selectedPackage.price} ש"ח</span>
              </div>
            </div>
            
            <div className="text-center py-4">
              <p className="text-gray-700 mb-4">תועבר לדף התשלום של Grow</p>
              <a
                href={paymentUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="bg-teal-600 text-white px-8 py-3 rounded-lg hover:bg-teal-700 transition-colors inline-block font-semibold"
              >
                המשך לתשלום
              </a>
              <p className="text-sm text-gray-500 mt-4">
                אחרי התשלום, תועבר חזרה למערכת
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Pricing;
