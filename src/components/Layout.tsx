import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Calendar, Plus, Home, Settings, MessageSquare, Users, Bell, CalendarDays, LogOut, CreditCard, User, Wallet, FileText } from 'lucide-react';
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
    <div className="min-h-screen flex w-full max-w-none" style={{ width: '100%', margin: 0 }}>
      {/* Main Content */}
      <div className="flex-1 flex flex-col min-h-screen w-full" style={{ width: '100%', flex: '1 1 0%' }}>
        <main className="flex-1 overflow-y-auto overflow-x-hidden min-h-0 w-full" style={{ width: '100%', flex: '1 1 0%' }}>
          <div className="w-full max-w-none" style={{ width: '100%', maxWidth: 'none' }}>
            {children}
          </div>
        </main>
        <Footer />
      </div>

      {/* Sidebar - Right */}
      <div className="w-64 bg-green-100 shadow-xl border-r border-gray-200 flex flex-col">
        {/* Logout button at top */}
        <div className="p-4 border-b border-gray-200">
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center space-x-2 px-4 py-2 rounded-lg transition-colors text-red-600 hover:bg-red-50 font-medium"
          >
            <LogOut className="w-5 h-5 rotate-180" />
            <span>התנתק</span>
          </button>
        </div>

        <div className="p-6 flex-1">
          <h1 className="text-2xl font-bold text-gray-800 mb-8 text-center">
            בס"ד אירועים
          </h1>
          
          <nav className="space-y-2" role="navigation" aria-label="ניווט ראשי">
            <Link
              to="/"
              className={`flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-teal-500 ${
                isActive('/') 
                  ? 'bg-green-200 text-green-800 font-medium' 
                  : 'text-gray-700 hover:bg-green-50'
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
                  ? 'bg-green-200 text-green-800 font-medium' 
                  : 'text-gray-700 hover:bg-green-50'
              }`}
            >
              <Plus className="w-5 h-5" />
              <span>אירוע חדש</span>
            </Link>
            
            <Link
              to="/calendar"
              className={`flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors ${
                isActive('/calendar') 
                  ? 'bg-green-200 text-green-800 font-medium' 
                  : 'text-gray-700 hover:bg-green-50'
              }`}
            >
              <CalendarDays className="w-5 h-5" />
              <span>לוח שנה</span>
            </Link>
            
            <Link
              to="/templates"
              className={`flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors ${
                isActive('/templates') 
                  ? 'bg-green-200 text-green-800 font-medium' 
                  : 'text-gray-700 hover:bg-green-50'
              }`}
            >
              <FileText className="w-5 h-5" />
              <span>תבניות הודעות</span>
            </Link>
            
            <Link
              to="/clients"
              className={`flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors ${
                isActive('/clients') 
                  ? 'bg-green-200 text-green-800 font-medium' 
                  : 'text-gray-700 hover:bg-green-50'
              }`}
            >
              <Users className="w-5 h-5" />
              <span>ניהול לקוחות</span>
            </Link>
            
            <Link
              to="/reminders"
              className={`flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors ${
                isActive('/reminders') 
                  ? 'bg-green-200 text-green-800 font-medium' 
                  : 'text-gray-700 hover:bg-green-50'
              }`}
            >
              <Bell className="w-5 h-5" />
              <span>תזכורות</span>
            </Link>
            
            <Link
              to="/budget"
              className={`flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors ${
                isActive('/budget') 
                  ? 'bg-green-200 text-green-800 font-medium' 
                  : 'text-gray-700 hover:bg-green-50'
              }`}
            >
              <Settings className="w-5 h-5" />
              <span>ניהול תקציב וספקים</span>
            </Link>
            
            {user?.isAdmin && (
              <>
                <Link
                  to="/admin"
                  className={`flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors ${
                    isActive('/admin') 
                      ? 'bg-green-200 text-green-800 font-medium' 
                      : 'text-gray-700 hover:bg-green-50'
                  }`}
                >
                  <Settings className="w-5 h-5" />
                  <span>דשבורד מנהל</span>
                </Link>
                <Link
                  to="/users"
                  className={`flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors ${
                    isActive('/users') 
                      ? 'bg-green-200 text-green-800 font-medium' 
                      : 'text-gray-700 hover:bg-green-50'
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
                  ? 'bg-green-200 text-green-800 font-medium' 
                  : 'text-gray-700 hover:bg-green-50'
              }`}
            >
              <Settings className="w-5 h-5" />
              <span>הגדרות</span>
            </Link>
          </nav>
        </div>
        
        {/* Logout button at bottom */}
        <div className="p-4 border-t border-gray-200">
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center space-x-2 px-4 py-2 rounded-lg transition-colors text-red-600 hover:bg-red-50 font-medium"
          >
            <LogOut className="w-5 h-5 rotate-180" />
            <span>התנתק</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default Layout;
