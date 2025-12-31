import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Calendar, Plus, Home, Settings, MessageSquare, Users, Bell, CalendarDays, LogOut, CreditCard, User, Wallet } from 'lucide-react';
import { useUserStore } from '../store/userStore';
import toast from 'react-hot-toast';
import Footer from './Footer';

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const user = useUserStore(state => state.user);
  const logout = useUserStore(state => state.logout);

  const isActive = (path: string) => {
    return location.pathname === path || location.pathname.startsWith(path + '/');
  };

  const handleLogout = () => {
    logout();
    toast.success('התנתקת בהצלחה');
    navigate('/login');
  };

  return (
    <div className="min-h-screen flex">
      {/* Sidebar */}
      <div className="w-64 bg-gradient-to-b from-white to-gray-50 shadow-xl border-l border-gray-200">
        <div className="p-6">
          <h1 className="text-2xl font-bold bg-gradient-to-r from-yellow-500 to-teal-500 bg-clip-text text-transparent mb-8">
            בס"ד אירועים
          </h1>
          
          <nav className="space-y-2" role="navigation" aria-label="ניווט ראשי">
            <Link
              to="/"
              className={`flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-teal-500 ${
                isActive('/') 
                  ? 'bg-teal-100 text-teal-700 font-medium' 
                  : 'text-gray-600 hover:bg-yellow-50'
              }`}
              aria-label="דשבורד"
              aria-current={isActive('/') ? 'page' : undefined}
            >
              <Home className="w-5 h-5" aria-hidden="true" />
              <span>דשבורד</span>
            </Link>
            
            <Link
              to="/create-event"
              className={`flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors ${
                isActive('/create-event') 
                  ? 'bg-teal-100 text-teal-700 font-medium' 
                  : 'text-gray-600 hover:bg-yellow-50'
              }`}
            >
              <Plus className="w-5 h-5" />
              <span>אירוע חדש</span>
            </Link>
            
            <Link
              to="/calendar"
              className={`flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors ${
                isActive('/calendar') 
                  ? 'bg-teal-100 text-teal-700 font-medium' 
                  : 'text-gray-600 hover:bg-yellow-50'
              }`}
            >
              <CalendarDays className="w-5 h-5" />
              <span>לוח שנה</span>
            </Link>
            
            <Link
              to="/templates"
              className={`flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors ${
                isActive('/templates') 
                  ? 'bg-teal-100 text-teal-700 font-medium' 
                  : 'text-gray-600 hover:bg-yellow-50'
              }`}
            >
              <MessageSquare className="w-5 h-5" />
              <span>תבניות הודעות</span>
            </Link>
            
            <Link
              to="/clients"
              className={`flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors ${
                isActive('/clients') 
                  ? 'bg-teal-100 text-teal-700 font-medium' 
                  : 'text-gray-600 hover:bg-yellow-50'
              }`}
            >
              <Users className="w-5 h-5" />
              <span>ניהול לקוחות</span>
            </Link>
            
            <Link
              to="/reminders"
              className={`flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors ${
                isActive('/reminders') 
                  ? 'bg-teal-100 text-teal-700 font-medium' 
                  : 'text-gray-600 hover:bg-yellow-50'
              }`}
            >
              <Bell className="w-5 h-5" />
              <span>תזכורות</span>
            </Link>
            
            <Link
              to="/budget"
              className={`flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors ${
                isActive('/budget') 
                  ? 'bg-teal-100 text-teal-700 font-medium' 
                  : 'text-gray-600 hover:bg-yellow-50'
              }`}
            >
              <Wallet className="w-5 h-5" />
              <span>ניהול תקציב וספקים</span>
            </Link>
            
            {user?.isAdmin && (
              <>
                <Link
                  to="/admin"
                  className={`flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors ${
                    isActive('/admin') 
                      ? 'bg-teal-100 text-teal-700 font-medium' 
                      : 'text-gray-600 hover:bg-yellow-50'
                  }`}
                >
                  <Settings className="w-5 h-5" />
                  <span>דשבורד מנהל</span>
                </Link>
                <Link
                  to="/users"
                  className={`flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors ${
                    isActive('/users') 
                      ? 'bg-teal-100 text-teal-700 font-medium' 
                      : 'text-gray-600 hover:bg-yellow-50'
                  }`}
                >
                  <Users className="w-5 h-5" />
                  <span>ניהול משתמשים</span>
                </Link>
              </>
            )}
            
            <Link
              to="/settings"
              className={`flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors ${
                isActive('/settings') 
                  ? 'bg-teal-100 text-teal-700 font-medium' 
                  : 'text-gray-600 hover:bg-yellow-50'
              }`}
            >
              <Settings className="w-5 h-5" />
              <span>הגדרות</span>
            </Link>
            
            {/* כפתור התנתקות בתפריט הצד */}
            <button
              onClick={handleLogout}
              className="w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors text-red-600 hover:bg-red-50 mt-4"
            >
              <LogOut className="w-5 h-5" />
              <span>התנתק</span>
            </button>
          </nav>
        </div>
        
        <div className="absolute bottom-0 left-0 right-0 p-6 border-t border-gray-200">
          <div className="text-sm text-gray-500 text-center">
            גרסה {typeof window !== 'undefined' && (window as any).__APP_VERSION__ ? (window as any).__APP_VERSION__ : '1.0.211'}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-h-screen w-full">
        {/* Header */}
        <header className="bg-gradient-to-r from-white to-gray-50 shadow-md border-b border-gray-200 px-6 lg:px-8 py-4 flex-shrink-0 w-full">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              {user && (
                <>
                  <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-lg border border-gray-200 shadow-sm">
                    <User className="w-5 h-5 text-gray-600" />
                    <span className="text-gray-700 font-semibold">{user.name}</span>
                  </div>
                  <div className="flex items-center gap-2 bg-gradient-to-r from-teal-50 to-blue-50 px-4 py-2 rounded-lg border border-teal-200 shadow-sm">
                    <CreditCard className="w-5 h-5 text-teal-600" />
                    <span className="text-teal-700 font-bold">{user.credits} רשומות</span>
                  </div>
                  <Link
                    to="/pricing"
                    className="bg-gradient-to-r from-yellow-500 to-yellow-600 text-white px-5 py-2 rounded-lg hover:from-yellow-600 hover:to-yellow-700 transition-all font-semibold shadow-md hover:shadow-lg"
                  >
                    רכוש רשומות
                  </Link>
                </>
              )}
            </div>
            {user && (
              <button
                onClick={handleLogout}
                className="flex items-center gap-2 px-4 py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-all font-semibold border border-red-200 shadow-sm hover:shadow"
              >
                <LogOut className="w-5 h-5" />
                <span>התנתק</span>
              </button>
            )}
          </div>
        </header>
        <main className="flex-1 p-6 lg:p-8 overflow-y-auto overflow-x-hidden min-h-0 w-full bg-gradient-to-br from-teal-50 to-yellow-50">
          <div className="w-full max-w-full">
            {children}
          </div>
        </main>
        <Footer />
      </div>
    </div>
  );
};

export default Layout;
