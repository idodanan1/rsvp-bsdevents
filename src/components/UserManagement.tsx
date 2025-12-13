import React, { useState, useEffect } from 'react';
import { useUserStore } from '../store/userStore';
import { useEventStore } from '../store/eventStore';
import { User } from '../types';
import { Users, Plus, Search, CreditCard, Calendar, UserCheck, Mail, Eye, EyeOff, RefreshCw, X, Phone } from 'lucide-react';
import toast from 'react-hot-toast';

interface UserWithStats extends User {
  totalEvents: number;
  totalGuests: number;
  totalCreditsUsed: number;
  password?: string;
}

const UserManagement: React.FC = () => {
  const { user: currentUser, getAllUsers, getAllUsersWithPasswords, addCreditsToUser } = useUserStore();
  const { getAllEvents, getEventStatsByUserId, getEventsByUserId, recreateCampaigns, fetchEvents } = useEventStore();
  
  const [users, setUsers] = useState<UserWithStats[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUser, setSelectedUser] = useState<UserWithStats | null>(null);
  const [creditsToAdd, setCreditsToAdd] = useState<number>(50);
  const [isLoading, setIsLoading] = useState(false);
  const [visiblePasswords, setVisiblePasswords] = useState<Record<string, boolean>>({});
  const [showRecreateCampaignsModal, setShowRecreateCampaignsModal] = useState(false);
  const [selectedUserForCampaigns, setSelectedUserForCampaigns] = useState<UserWithStats | null>(null);
  const [userEvents, setUserEvents] = useState<any[]>([]);

  useEffect(() => {
    if (!currentUser || !currentUser.isAdmin) {
      toast.error('רק מנהל יכול לגשת לדף זה');
      return;
    }

    loadUsers();
  }, [currentUser]);

  const loadUsers = async () => {
    try {
      setIsLoading(true);
      const allUsersWithPasswords = await getAllUsersWithPasswords();
      const allEvents = getAllEvents();
      
      const usersWithStats: UserWithStats[] = allUsersWithPasswords.map(user => {
        const stats = getEventStatsByUserId(user.id);
        return {
          ...user,
          ...stats,
          password: user.password
        };
      });

      setUsers(usersWithStats);
    } catch (error: any) {
      console.error('❌ Load users error:', error);
      toast.error(error.message || 'שגיאה בטעינת המשתמשים');
    } finally {
      setIsLoading(false);
    }
  };

  const togglePasswordVisibility = (userId: string) => {
    setVisiblePasswords(prev => ({
      ...prev,
      [userId]: !prev[userId]
    }));
  };

  const handleAddCredits = async (userId: string, userName: string) => {
    if (!creditsToAdd || creditsToAdd <= 0) {
      toast.error('אנא הכנס כמות רשומות תקינה');
      return;
    }

    setIsLoading(true);
    try {
      const result = await addCreditsToUser(userId, creditsToAdd);
      toast.success(`הוספו ${creditsToAdd} רשומות למשתמש ${result.user.name}`);
      await loadUsers(); // רענון הרשימה
      setSelectedUser(null);
      setCreditsToAdd(50);
    } catch (error: any) {
      console.error('❌ Add credits error:', error);
      toast.error(error.message || 'שגיאה בהוספת רשומות');
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenRecreateCampaigns = (user: UserWithStats) => {
    console.log('🔄 Opening recreate campaigns modal for user:', user.name, user.id);
    try {
      const events = getEventsByUserId(user.id);
      console.log('📅 Found events for user:', events.length, events);
      
      if (events.length === 0) {
        toast.error('למשתמש זה אין אירועים');
        return;
      }
      
      setSelectedUserForCampaigns(user);
      setUserEvents(events);
      setShowRecreateCampaignsModal(true);
      console.log('✅ Modal should be open now');
    } catch (error) {
      console.error('❌ Error opening recreate campaigns modal:', error);
      toast.error('שגיאה בפתיחת חלון שחזור קמפיינים');
    }
  };

  const handleRecreateCampaigns = async (eventId: string) => {
    if (!selectedUserForCampaigns) return;

    setIsLoading(true);
    try {
      await recreateCampaigns(eventId);
      await fetchEvents();
      toast.success('✅ קמפיינים נוצרו מחדש בהצלחה!');
      setShowRecreateCampaignsModal(false);
      setSelectedUserForCampaigns(null);
      setUserEvents([]);
    } catch (error: any) {
      console.error('❌ Error recreating campaigns:', error);
      toast.error('❌ שגיאה ביצירת קמפיינים: ' + (error.message || error));
    } finally {
      setIsLoading(false);
    }
  };

  const filteredUsers = users.filter(u =>
    u.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (!currentUser || !currentUser.isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-800 mb-4">גישה נדחתה</h1>
          <p className="text-gray-600">רק מנהל יכול לגשת לדף זה</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-50 to-yellow-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Users className="w-8 h-8 text-teal-600" />
              <div>
                <h1 className="text-2xl font-bold text-gray-800">ניהול משתמשים</h1>
                <p className="text-gray-600">צפייה וניהול כל משתמשי המערכת</p>
              </div>
            </div>
            <div className="text-right">
              <div className="text-sm text-gray-600">סה"כ משתמשים</div>
              <div className="text-2xl font-bold text-teal-600">{users.length}</div>
            </div>
          </div>
        </div>

        {/* Search */}
        <div className="bg-white rounded-lg shadow-md p-4 mb-6">
          <div className="relative">
            <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="חפש משתמש לפי שם או אימייל..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pr-10 pl-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
            />
          </div>
        </div>

        {/* Users List */}
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-teal-600 text-white">
                <tr>
                  <th className="px-6 py-4 text-right">משתמש</th>
                  <th className="px-6 py-4 text-center">סיסמה</th>
                  <th className="px-6 py-4 text-center">אירועים</th>
                  <th className="px-6 py-4 text-center">מוזמנים</th>
                  <th className="px-6 py-4 text-center">רשומות בשימוש</th>
                  <th className="px-6 py-4 text-center">רשומות נוכחיות</th>
                  <th className="px-6 py-4 text-center">פעולות</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-8 text-center text-gray-500">
                      לא נמצאו משתמשים
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map((user) => (
                    <tr key={user.id} className="hover:bg-gray-50" onClick={(e) => e.stopPropagation()}>
                      <td className="px-6 py-4">
                        <div className="flex items-center space-x-3">
                          <div className="w-10 h-10 bg-teal-100 rounded-full flex items-center justify-center">
                            <UserCheck className="w-5 h-5 text-teal-600" />
                          </div>
                          <div>
                            <div className="font-semibold text-gray-800">{user.name}</div>
                            <div className="text-sm text-gray-500 flex items-center space-x-1">
                              <Mail className="w-3 h-3" />
                              <span>{user.email}</span>
                            </div>
                            {user.phoneNumber && (
                              <div className="text-sm text-gray-500 flex items-center space-x-1 mt-1">
                                <Phone className="w-3 h-3" />
                                <span>{user.phoneNumber}</span>
                                {user.phoneVerified && (
                                  <span className="text-green-600 text-xs">✓ מאומת</span>
                                )}
                              </div>
                            )}
                            {user.isAdmin && (
                              <span className="inline-block mt-1 px-2 py-0.5 text-xs bg-purple-100 text-purple-800 rounded">
                                מנהל
                              </span>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <div className="flex items-center justify-center space-x-2">
                          <span className="font-mono text-sm text-gray-700">
                            {visiblePasswords[user.id] ? user.password || '(לא נמצאה)' : '••••••••'}
                          </span>
                          <button
                            onClick={() => togglePasswordVisibility(user.id)}
                            className="text-gray-500 hover:text-gray-700 transition-colors"
                            title={visiblePasswords[user.id] ? 'הסתר סיסמה' : 'הצג סיסמה'}
                          >
                            {visiblePasswords[user.id] ? (
                              <EyeOff className="w-4 h-4" />
                            ) : (
                              <Eye className="w-4 h-4" />
                            )}
                          </button>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <div className="flex items-center justify-center space-x-1">
                          <Calendar className="w-4 h-4 text-gray-400" />
                          <span className="font-semibold">{user.totalEvents}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <div className="flex items-center justify-center space-x-1">
                          <Users className="w-4 h-4 text-gray-400" />
                          <span className="font-semibold">{user.totalGuests}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className="text-orange-600 font-semibold">{user.totalCreditsUsed}</span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <div className="flex items-center justify-center space-x-1">
                          <CreditCard className="w-4 h-4 text-teal-600" />
                          <span className={`font-bold ${user.credits > 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {user.credits}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-center" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-center space-x-2 flex-wrap gap-2">
                          {!user.isAdmin && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                setSelectedUser(user);
                              }}
                              className="px-3 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors flex items-center space-x-2 text-sm"
                              title="הוסף רשומות למשתמש"
                            >
                              <Plus className="w-4 h-4" />
                              <span>רשומות</span>
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              console.log('🔄 Recreate campaigns button clicked for user:', user.name, 'totalEvents:', user.totalEvents, 'userId:', user.id);
                              console.log('🔄 Button element:', e.currentTarget);
                              console.log('🔄 Event details:', e);
                              
                              // Always allow clicking - check inside the handler
                              handleOpenRecreateCampaigns(user);
                            }}
                            onMouseEnter={() => console.log('🖱️ Mouse entered recreate campaigns button')}
                            onMouseLeave={() => console.log('🖱️ Mouse left recreate campaigns button')}
                            className="px-3 py-2 rounded-lg transition-colors flex items-center space-x-2 text-sm relative z-50 bg-yellow-600 text-white hover:bg-yellow-700 cursor-pointer active:bg-yellow-800 focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:ring-offset-2"
                            title="שחזר קמפיינים לשליחה מחודשת"
                            style={{ 
                              pointerEvents: 'auto',
                              position: 'relative',
                              zIndex: 50
                            }}
                          >
                            <RefreshCw className="w-4 h-4" />
                            <span>שחזר קמפיינים</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Add Credits Modal */}
        {selectedUser && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-md">
              <h2 className="text-xl font-bold text-gray-800 mb-4">
                הוספת רשומות למשתמש
              </h2>
              
              <div className="mb-4">
                <div className="text-sm text-gray-600 mb-2">משתמש:</div>
                <div className="font-semibold text-gray-800">{selectedUser.name}</div>
                <div className="text-sm text-gray-500">{selectedUser.email}</div>
              </div>

              <div className="mb-4">
                <div className="text-sm text-gray-600 mb-2">רשומות נוכחיות:</div>
                <div className="text-2xl font-bold text-teal-600">{selectedUser.credits}</div>
              </div>

              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  כמות רשומות להוספה
                </label>
                <div className="flex space-x-2 mb-2">
                  {[10, 25, 50, 100].map((amount) => (
                    <button
                      key={amount}
                      onClick={() => setCreditsToAdd(amount)}
                      className={`flex-1 px-4 py-2 rounded-lg border transition-colors ${
                        creditsToAdd === amount
                          ? 'bg-teal-600 text-white border-teal-600'
                          : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      +{amount}
                    </button>
                  ))}
                </div>
                <input
                  type="number"
                  min="1"
                  value={creditsToAdd}
                  onChange={(e) => setCreditsToAdd(parseInt(e.target.value) || 0)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                  placeholder="או הכנס כמות מותאמת אישית"
                />
              </div>

              <div className="mb-6 p-3 bg-teal-50 rounded-lg">
                <div className="text-sm text-gray-600 mb-1">רשומות חדשות:</div>
                <div className="text-xl font-bold text-teal-600">
                  {selectedUser.credits + creditsToAdd}
                </div>
              </div>

              <div className="flex space-x-3">
                <button
                  onClick={() => {
                    setSelectedUser(null);
                    setCreditsToAdd(50);
                  }}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  ביטול
                </button>
                <button
                  onClick={() => handleAddCredits(selectedUser.id, selectedUser.name)}
                  disabled={isLoading || creditsToAdd <= 0}
                  className="flex-1 px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
                >
                  {isLoading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      <span>מוסיף...</span>
                    </>
                  ) : (
                    <>
                      <Plus className="w-4 h-4" />
                      <span>הוסף רשומות</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Recreate Campaigns Modal */}
        {showRecreateCampaignsModal && selectedUserForCampaigns && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[80vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-gray-800">
                  שחזר קמפיינים לשליחה מחודשת - {selectedUserForCampaigns.name}
                </h2>
                <button
                  onClick={() => {
                    setShowRecreateCampaignsModal(false);
                    setSelectedUserForCampaigns(null);
                    setUserEvents([]);
                  }}
                  className="text-gray-500 hover:text-gray-700 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="mb-4">
                <p className="text-sm text-gray-600 mb-4">
                  בחר אירוע ספציפי של המשתמש כדי לשחזר את הקמפיינים שלו לשליחה מחודשת:
                </p>
              </div>

              {userEvents.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  למשתמש זה אין אירועים
                </div>
              ) : (
                <div className="space-y-3">
                  {userEvents.map((event) => (
                    <div
                      key={event.id}
                      className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="font-semibold text-gray-800 mb-1">
                            {event.coupleName || 'אירוע ללא שם'}
                          </div>
                          <div className="text-sm text-gray-600 space-y-1">
                            {event.eventDate && (
                              <div className="flex items-center space-x-2">
                                <Calendar className="w-4 h-4" />
                                <span>{new Date(event.eventDate).toLocaleDateString('he-IL')}</span>
                              </div>
                            )}
                            {event.guests && (
                              <div className="flex items-center space-x-2">
                                <Users className="w-4 h-4" />
                                <span>{event.guests.length} מוזמנים</span>
                              </div>
                            )}
                            {event.campaigns && (
                              <div className="text-xs text-gray-500">
                                {event.campaigns.length} קמפיינים קיימים
                              </div>
                            )}
                          </div>
                        </div>
                        <button
                          onClick={() => handleRecreateCampaigns(event.id)}
                          disabled={isLoading}
                          className="px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
                        >
                          {isLoading ? (
                            <>
                              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                              <span>משחזר...</span>
                            </>
                          ) : (
                            <>
                              <RefreshCw className="w-4 h-4" />
                              <span>שחזר קמפיינים</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default UserManagement;

