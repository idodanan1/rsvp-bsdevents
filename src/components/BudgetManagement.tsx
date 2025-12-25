import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useBudgetStore } from '../store/budgetStore';
import { useEventStore } from '../store/eventStore';
import { useUserStore } from '../store/userStore';
import { VendorCategory, Event } from '../types/index';
import {
  Plus,
  Edit,
  Trash2,
  DollarSign,
  TrendingUp,
  TrendingDown,
  Calendar,
  Phone,
  Mail,
  FileText,
  CheckCircle,
  XCircle,
  Save,
  X,
  AlertCircle,
} from 'lucide-react';
import toast from 'react-hot-toast';

const VENDOR_CATEGORIES: { value: VendorCategory; label: string; icon: string }[] = [
  { value: 'venue', label: 'אולם', icon: '🏛️' },
  { value: 'catering', label: 'קייטרינג', icon: '🍽️' },
  { value: 'photography', label: 'צילום', icon: '📸' },
  { value: 'videography', label: 'וידאו', icon: '🎥' },
  { value: 'music', label: 'מוזיקה/DJ', icon: '🎵' },
  { value: 'flowers', label: 'פרחים', icon: '🌸' },
  { value: 'decoration', label: 'קישוטים', icon: '🎨' },
  { value: 'transportation', label: 'הסעות', icon: '🚗' },
  { value: 'hair_makeup', label: 'שיער ואיפור', icon: '💄' },
  { value: 'dress', label: 'שמלה', icon: '👗' },
  { value: 'suit', label: 'חליפה', icon: '👔' },
  { value: 'rings', label: 'טבעות', icon: '💍' },
  { value: 'invitations', label: 'הזמנות', icon: '💌' },
  { value: 'other', label: 'אחר', icon: '📋' },
];

const BudgetManagement: React.FC = () => {
  const { id: eventId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { events } = useEventStore();
  const { user } = useUserStore();
  const {
    budgets,
    currentBudget,
    getBudgetByEventId,
    createBudget,
    updateBudget,
    addVendor,
    updateVendor,
    deleteVendor,
    addPayment,
    addPaymentSchedule,
    markPaymentAsPaid,
    deletePaymentSchedule,
    calculateBudgetStats,
    setCurrentBudget,
  } = useBudgetStore();

  const [showVendorModal, setShowVendorModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showPaymentScheduleModal, setShowPaymentScheduleModal] = useState(false);
  const [editingVendor, setEditingVendor] = useState<any>(null);
  const [selectedVendor, setSelectedVendor] = useState<string | null>(null);
  const [totalBudgetInput, setTotalBudgetInput] = useState('');
  const [selectedEventId, setSelectedEventId] = useState<string | null>(eventId || null);

  // CRITICAL SECURITY: Filter events by current user (admin can see all)
  const filteredEvents = useMemo(() => {
    if (!user) return [];
    const isAdmin = user.isAdmin === true || user.id === 'admin-fixed-id';
    if (isAdmin) {
      return events; // Admin sees all events
    }
    // Regular user sees only their events
    return events.filter((e: Event) => e.userId === user.id);
  }, [events, user]);

  const event = selectedEventId ? filteredEvents.find((e: Event) => e.id === selectedEventId) : null;
  const budget = selectedEventId ? getBudgetByEventId(selectedEventId) : null;
  const stats = budget ? calculateBudgetStats(budget.id) : null;

  useEffect(() => {
    if (eventId) {
      setSelectedEventId(eventId);
    }
  }, [eventId]);

  useEffect(() => {
    if (budget) {
      setCurrentBudget(budget);
    } else if (selectedEventId) {
      // Initialize budget if event exists but no budget
      setCurrentBudget(null);
    }
  }, [budget, selectedEventId, setCurrentBudget]);

  const handleCreateBudget = async () => {
    if (!selectedEventId) return;
    const total = parseFloat(totalBudgetInput);
    if (isNaN(total) || total <= 0) {
      toast.error('אנא הזן תקציב תקין');
      return;
    }
    await createBudget(selectedEventId, total);
    toast.success('תקציב נוצר בהצלחה');
    setTotalBudgetInput('');
  };

  const handleAddVendor = async (vendorData: any) => {
    if (!budget) return;
    await addVendor(budget.id, vendorData);
    toast.success('ספק נוסף בהצלחה');
    setShowVendorModal(false);
    setEditingVendor(null);
  };

  const handleUpdateVendor = async (vendorId: string, updates: any) => {
    if (!budget) return;
    await updateVendor(budget.id, vendorId, updates);
    toast.success('ספק עודכן בהצלחה');
    setShowVendorModal(false);
    setEditingVendor(null);
  };

  const handleDeleteVendor = async (vendorId: string) => {
    if (!budget) return;
    if (!window.confirm('האם אתה בטוח שברצונך למחוק את הספק?')) return;
    await deleteVendor(budget.id, vendorId);
    toast.success('ספק נמחק בהצלחה');
  };

  const handleAddPayment = async (amount: number, notes?: string) => {
    if (!budget || !selectedVendor) return;
    await addPayment(budget.id, selectedVendor, amount, notes);
    toast.success('תשלום נוסף בהצלחה');
    setShowPaymentModal(false);
    setSelectedVendor(null);
  };

  // Event Selection Screen
  if (!selectedEventId) {
    return (
      <div className="bg-white rounded-lg shadow-lg p-8">
        <h2 className="text-2xl font-bold text-gray-800 mb-6">ניהול תקציב וספקים</h2>
        <p className="text-gray-600 mb-6">בחר אירוע כדי לנהל את התקציב והספקים שלו</p>
        
        {filteredEvents.length === 0 ? (
          <div className="text-center py-12">
            <AlertCircle className="w-16 h-16 text-yellow-500 mx-auto mb-4" />
            <p className="text-lg text-gray-600 mb-4">אין אירועים במערכת</p>
            <button
              onClick={() => navigate('/create-event')}
              className="bg-teal-600 text-white px-6 py-2 rounded-lg hover:bg-teal-700 transition-colors"
            >
              צור אירוע חדש
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredEvents.map((ev) => (
              <button
                key={ev.id}
                onClick={() => {
                  setSelectedEventId(ev.id);
                  navigate(`/budget/${ev.id}`);
                }}
                className="bg-white border-2 border-gray-200 rounded-lg p-4 hover:border-teal-500 hover:shadow-md transition-all text-right"
              >
                <h3 className="text-lg font-semibold text-gray-800 mb-2">{ev.coupleName}</h3>
                <p className="text-sm text-gray-600 mb-1">
                  {new Date(ev.eventDate).toLocaleDateString('he-IL')}
                </p>
                <p className="text-sm text-gray-500">{ev.eventTypeHebrew}</p>
              </button>
            ))}
          </div>
        )}
      </div>
    );
  }

  // SECURITY CHECK: Verify user has access to this event
  if (!event) {
    // Check if event exists but user doesn't have access
    const eventExists = events.find((e: Event) => e.id === selectedEventId);
    if (eventExists && user) {
      const isAdmin = user.isAdmin === true || user.id === 'admin-fixed-id';
      if (!isAdmin && eventExists.userId !== user.id) {
        return (
          <div className="bg-white rounded-lg shadow-lg p-8 text-center">
            <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-800 mb-2">אין הרשאה</h2>
            <p className="text-gray-600 mb-4">אין לך הרשאה לגשת לאירוע זה</p>
            <button
              onClick={() => navigate('/budget')}
              className="bg-teal-600 text-white px-6 py-2 rounded-lg hover:bg-teal-700 transition-colors"
            >
              חזרה לניהול תקציב
            </button>
          </div>
        );
      }
    }
    
    return (
      <div className="bg-white rounded-lg shadow-lg p-8 text-center">
        <AlertCircle className="w-16 h-16 text-yellow-500 mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-gray-800 mb-2">אירוע לא נמצא</h2>
        <p className="text-gray-600 mb-4">האירוע המבוקש לא קיים במערכת</p>
        <button
          onClick={() => navigate('/budget')}
          className="bg-teal-600 text-white px-6 py-2 rounded-lg hover:bg-teal-700 transition-colors"
        >
          חזרה לניהול תקציב
        </button>
      </div>
    );
  }

  // SECURITY CHECK: Double-check user has access to this event
  if (user) {
    const isAdmin = user.isAdmin === true || user.id === 'admin-fixed-id';
    if (!isAdmin && event.userId !== user.id) {
      return (
        <div className="bg-white rounded-lg shadow-lg p-8 text-center">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-800 mb-2">אין הרשאה</h2>
          <p className="text-gray-600 mb-4">אין לך הרשאה לגשת לאירוע זה</p>
          <button
            onClick={() => navigate('/budget')}
            className="bg-teal-600 text-white px-6 py-2 rounded-lg hover:bg-teal-700 transition-colors"
          >
            חזרה לניהול תקציב
          </button>
        </div>
      );
    }
  }

  if (!budget) {
    return (
      <div className="bg-white rounded-lg shadow-lg p-8">
        <h2 className="text-2xl font-bold text-gray-800 mb-6">ניהול תקציב וספקים - {event.coupleName}</h2>
        <div className="max-w-md mx-auto">
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              תקציב כולל (₪)
            </label>
            <input
              type="number"
              value={totalBudgetInput}
              onChange={(e) => setTotalBudgetInput(e.target.value)}
              placeholder="הזן תקציב כולל"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
            />
          </div>
          <button
            onClick={handleCreateBudget}
            className="w-full bg-teal-600 text-white px-6 py-3 rounded-lg hover:bg-teal-700 transition-colors font-semibold flex items-center justify-center gap-2"
          >
            <Plus className="w-5 h-5" />
            צור תקציב חדש
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-lg p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-800">ניהול תקציב וספקים</h2>
            <p className="text-gray-600 mt-1">{event.coupleName} - {new Date(event.eventDate).toLocaleDateString('he-IL')}</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setSelectedEventId(null);
                navigate('/budget');
              }}
              className="bg-gray-100 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-200 transition-colors"
            >
              בחר אירוע אחר
            </button>
            <button
              onClick={() => navigate(`/event/${selectedEventId}`)}
              className="bg-gray-100 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-200 transition-colors"
            >
              חזרה לאירוע
            </button>
          </div>
        </div>

        {/* Budget Stats */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-gradient-to-br from-teal-50 to-teal-100 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-600">תקציב כולל</span>
                <DollarSign className="w-5 h-5 text-teal-600" />
              </div>
              <p className="text-2xl font-bold text-teal-700">₪{stats.totalBudget.toLocaleString()}</p>
            </div>
            <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-600">תקציב מוקצה</span>
                <TrendingUp className="w-5 h-5 text-blue-600" />
              </div>
              <p className="text-2xl font-bold text-blue-700">₪{stats.allocated.toLocaleString()}</p>
              <p className="text-xs text-gray-600 mt-1">{stats.percentageAllocated.toFixed(1)}% מהתקציב</p>
            </div>
            <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-600">שולם</span>
                <CheckCircle className="w-5 h-5 text-green-600" />
              </div>
              <p className="text-2xl font-bold text-green-700">₪{stats.spent.toLocaleString()}</p>
              <p className="text-xs text-gray-600 mt-1">{stats.percentageSpent.toFixed(1)}% מהתקציב</p>
            </div>
            <div className="bg-gradient-to-br from-yellow-50 to-yellow-100 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-600">נותר</span>
                <TrendingDown className="w-5 h-5 text-yellow-600" />
              </div>
              <p className="text-2xl font-bold text-yellow-700">₪{stats.remaining.toLocaleString()}</p>
            </div>
          </div>
        )}

        {/* Progress Bar */}
        {stats && (
          <div className="mb-6">
            <div className="flex justify-between text-sm text-gray-600 mb-2">
              <span>התקדמות תקציב</span>
              <span>{stats.percentageSpent.toFixed(1)}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-4">
              <div
                className="bg-teal-600 h-4 rounded-full transition-all duration-300"
                style={{ width: `${Math.min(stats.percentageSpent, 100)}%` }}
              />
            </div>
          </div>
        )}

        {/* Update Total Budget */}
        <div className="flex items-center gap-4 mb-6">
          <label className="text-sm font-medium text-gray-700">עדכן תקציב כולל:</label>
          <input
            type="number"
            value={totalBudgetInput}
            onChange={(e) => setTotalBudgetInput(e.target.value)}
            placeholder="תקציב חדש"
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
          />
          <button
            onClick={async () => {
              const total = parseFloat(totalBudgetInput);
              if (isNaN(total) || total <= 0) {
                toast.error('אנא הזן תקציב תקין');
                return;
              }
              await updateBudget(budget.id, { totalBudget: total });
              toast.success('תקציב עודכן בהצלחה');
              setTotalBudgetInput('');
            }}
            className="bg-teal-600 text-white px-4 py-2 rounded-lg hover:bg-teal-700 transition-colors"
          >
            עדכן
          </button>
        </div>
      </div>

      {/* Vendors List */}
      <div className="bg-white rounded-lg shadow-lg p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-bold text-gray-800">ספקים ({budget.vendors.length})</h3>
          <button
            onClick={() => {
              setEditingVendor(null);
              setShowVendorModal(true);
            }}
            className="bg-teal-600 text-white px-4 py-2 rounded-lg hover:bg-teal-700 transition-colors flex items-center gap-2"
          >
            <Plus className="w-5 h-5" />
            הוסף ספק
          </button>
        </div>

        {budget.vendors.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <FileText className="w-16 h-16 mx-auto mb-4 text-gray-300" />
            <p className="text-lg">אין ספקים עדיין</p>
            <p className="text-sm mt-2">הוסף ספק ראשון כדי להתחיל לנהל את התקציב</p>
          </div>
        ) : (
          <div className="space-y-4">
            {budget.vendors.map((vendor) => {
              const category = VENDOR_CATEGORIES.find(c => c.value === vendor.category);
              return (
                <div key={vendor.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <span className="text-2xl">{category?.icon || '📋'}</span>
                        <div>
                          <h4 className="text-lg font-semibold text-gray-800">{vendor.name}</h4>
                          <p className="text-sm text-gray-600">{category?.label || 'אחר'}</p>
                        </div>
                      </div>
                      {vendor.contactName && (
                        <p className="text-sm text-gray-600 mb-1">
                          <span className="font-medium">איש קשר:</span> {vendor.contactName}
                        </p>
                      )}
                      {vendor.phoneNumber && (
                        <p className="text-sm text-gray-600 mb-1 flex items-center gap-1">
                          <Phone className="w-4 h-4" />
                          {vendor.phoneNumber}
                        </p>
                      )}
                      {vendor.email && (
                        <p className="text-sm text-gray-600 mb-1 flex items-center gap-1">
                          <Mail className="w-4 h-4" />
                          {vendor.email}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => {
                          setEditingVendor(vendor);
                          setShowVendorModal(true);
                        }}
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        title="ערוך"
                      >
                        <Edit className="w-5 h-5" />
                      </button>
                      <button
                        onClick={() => handleDeleteVendor(vendor.id)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="מחק"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-4 mb-4">
                    <div className="bg-gray-50 rounded-lg p-3">
                      <p className="text-xs text-gray-600 mb-1">תקציב</p>
                      <p className="text-lg font-bold text-gray-800">₪{vendor.budget.toLocaleString()}</p>
                    </div>
                    <div className="bg-green-50 rounded-lg p-3">
                      <p className="text-xs text-gray-600 mb-1">שולם</p>
                      <p className="text-lg font-bold text-green-700">₪{vendor.paid.toLocaleString()}</p>
                    </div>
                    <div className="bg-yellow-50 rounded-lg p-3">
                      <p className="text-xs text-gray-600 mb-1">נותר</p>
                      <p className="text-lg font-bold text-yellow-700">₪{vendor.remaining.toLocaleString()}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        setSelectedVendor(vendor.id);
                        setShowPaymentModal(true);
                      }}
                      className="flex-1 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors text-sm"
                    >
                      הוסף תשלום
                    </button>
                    <button
                      onClick={() => {
                        setSelectedVendor(vendor.id);
                        setShowPaymentScheduleModal(true);
                      }}
                      className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors text-sm"
                    >
                      לוח תשלומים
                    </button>
                  </div>

                  {vendor.paymentSchedule && vendor.paymentSchedule.length > 0 && (
                    <div className="mt-4 pt-4 border-t border-gray-200">
                      <p className="text-sm font-medium text-gray-700 mb-2">לוח תשלומים:</p>
                      <div className="space-y-2">
                        {vendor.paymentSchedule.map((payment) => (
                          <div
                            key={payment.id}
                            className={`flex items-center justify-between p-2 rounded-lg ${
                              payment.paid ? 'bg-green-50' : 'bg-gray-50'
                            }`}
                          >
                            <div className="flex items-center gap-2">
                              {payment.paid ? (
                                <CheckCircle className="w-4 h-4 text-green-600" />
                              ) : (
                                <XCircle className="w-4 h-4 text-gray-400" />
                              )}
                              <span className="text-sm text-gray-700">
                                ₪{payment.amount.toLocaleString()} - {new Date(payment.dueDate).toLocaleDateString('he-IL')}
                              </span>
                            </div>
                            {!payment.paid && (
                              <button
                                onClick={async () => {
                                  await markPaymentAsPaid(budget.id, vendor.id, payment.id);
                                  toast.success('תשלום סומן כשולם');
                                }}
                                className="text-xs bg-green-600 text-white px-2 py-1 rounded hover:bg-green-700 transition-colors"
                              >
                                סמן כשולם
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {vendor.notes && (
                    <div className="mt-4 pt-4 border-t border-gray-200">
                      <p className="text-sm font-medium text-gray-700 mb-1">הערות:</p>
                      <p className="text-sm text-gray-600">{vendor.notes}</p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Vendor Modal */}
      {showVendorModal && (
        <VendorModal
          vendor={editingVendor}
          onSave={editingVendor
            ? (data) => handleUpdateVendor(editingVendor.id, data)
            : handleAddVendor}
          onClose={() => {
            setShowVendorModal(false);
            setEditingVendor(null);
          }}
        />
      )}

      {/* Payment Modal */}
      {showPaymentModal && selectedVendor && (
        <PaymentModal
          vendorName={budget.vendors.find(v => v.id === selectedVendor)?.name || ''}
          onSave={(amount, notes) => handleAddPayment(amount, notes)}
          onClose={() => {
            setShowPaymentModal(false);
            setSelectedVendor(null);
          }}
        />
      )}

      {/* Payment Schedule Modal */}
      {showPaymentScheduleModal && selectedVendor && (
        <PaymentScheduleModal
          vendorName={budget.vendors.find(v => v.id === selectedVendor)?.name || ''}
          onSave={(payment) => {
            if (budget) {
              addPaymentSchedule(budget.id, selectedVendor, payment);
              toast.success('תשלום נוסף ללוח התשלומים');
              setShowPaymentScheduleModal(false);
              setSelectedVendor(null);
            }
          }}
          onClose={() => {
            setShowPaymentScheduleModal(false);
            setSelectedVendor(null);
          }}
        />
      )}
    </div>
  );
};

// Vendor Modal Component
const VendorModal: React.FC<{
  vendor: any;
  onSave: (data: any) => void;
  onClose: () => void;
}> = ({ vendor, onSave, onClose }) => {
  const [formData, setFormData] = useState({
    name: vendor?.name || '',
    category: vendor?.category || 'other',
    contactName: vendor?.contactName || '',
    phoneNumber: vendor?.phoneNumber || '',
    email: vendor?.email || '',
    budget: vendor?.budget || 0,
    paid: vendor?.paid || 0,
    notes: vendor?.notes || '',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || formData.budget <= 0) {
      toast.error('אנא מלא את כל השדות הנדרשים');
      return;
    }
    onSave(formData);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-2xl font-bold text-gray-800">
              {vendor ? 'ערוך ספק' : 'הוסף ספק חדש'}
            </h3>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                שם הספק *
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                קטגוריה *
              </label>
              <select
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value as VendorCategory })}
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
              >
                {VENDOR_CATEGORIES.map((cat) => (
                  <option key={cat.value} value={cat.value}>
                    {cat.icon} {cat.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  שם איש קשר
                </label>
                <input
                  type="text"
                  value={formData.contactName}
                  onChange={(e) => setFormData({ ...formData, contactName: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  טלפון
                </label>
                <input
                  type="tel"
                  value={formData.phoneNumber}
                  onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                אימייל
              </label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  תקציב (₪) *
                </label>
                <input
                  type="number"
                  value={formData.budget}
                  onChange={(e) => setFormData({ ...formData, budget: parseFloat(e.target.value) || 0 })}
                  required
                  min="0"
                  step="0.01"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                />
              </div>
              {vendor && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    שולם (₪)
                  </label>
                  <input
                    type="number"
                    value={formData.paid}
                    onChange={(e) => setFormData({ ...formData, paid: parseFloat(e.target.value) || 0 })}
                    min="0"
                    step="0.01"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                  />
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                הערות
              </label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                rows={3}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
              />
            </div>

            <div className="flex items-center justify-end gap-4 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
              >
                ביטול
              </button>
              <button
                type="submit"
                className="px-6 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors flex items-center gap-2"
              >
                <Save className="w-5 h-5" />
                שמור
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

// Payment Modal Component
const PaymentModal: React.FC<{
  vendorName: string;
  onSave: (amount: number, notes?: string) => void;
  onClose: () => void;
}> = ({ vendorName, onSave, onClose }) => {
  const [amount, setAmount] = useState('');
  const [notes, setNotes] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const paymentAmount = parseFloat(amount);
    if (isNaN(paymentAmount) || paymentAmount <= 0) {
      toast.error('אנא הזן סכום תקין');
      return;
    }
    onSave(paymentAmount, notes);
    setAmount('');
    setNotes('');
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-bold text-gray-800">הוסף תשלום - {vendorName}</h3>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                סכום (₪) *
              </label>
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                required
                min="0"
                step="0.01"
                placeholder="0.00"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                הערות
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
              />
            </div>

            <div className="flex items-center justify-end gap-4 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
              >
                ביטול
              </button>
              <button
                type="submit"
                className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
              >
                הוסף תשלום
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

// Payment Schedule Modal Component
const PaymentScheduleModal: React.FC<{
  vendorName: string;
  onSave: (payment: Omit<any, 'id'>) => void;
  onClose: () => void;
}> = ({ vendorName, onSave, onClose }) => {
  const [amount, setAmount] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [notes, setNotes] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const paymentAmount = parseFloat(amount);
    if (isNaN(paymentAmount) || paymentAmount <= 0) {
      toast.error('אנא הזן סכום תקין');
      return;
    }
    if (!dueDate) {
      toast.error('אנא בחר תאריך תשלום');
      return;
    }
    onSave({
      amount: paymentAmount,
      dueDate: new Date(dueDate),
      paid: false,
      notes: notes || undefined,
    });
    setAmount('');
    setDueDate('');
    setNotes('');
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-bold text-gray-800">הוסף ללוח תשלומים - {vendorName}</h3>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                סכום (₪) *
              </label>
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                required
                min="0"
                step="0.01"
                placeholder="0.00"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                תאריך תשלום *
              </label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                הערות
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
              />
            </div>

            <div className="flex items-center justify-end gap-4 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
              >
                ביטול
              </button>
              <button
                type="submit"
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                הוסף ללוח תשלומים
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default BudgetManagement;

