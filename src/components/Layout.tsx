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
      <div className="flex-1 flex flex-col min-h-screen w-full" style={{ width: '100%', flex: '1 1 0%', marginRight: '260px' }}>
        {/* Header */}
        <header className="bg-white border-b border-gray-200" style={{ height: '64px', padding: '0 24px' }}>
          <div className="flex items-center justify-between h-full">
            <div className="flex items-center gap-4">
              <span className="text-gray-700 font-medium text-sm">{user?.name || 'מנהל המערכת'}</span>
              <button
                onClick={handleLogout}
                className="flex items-center gap-2 px-4 py-2 text-red-600 hover:bg-red-50 transition-colors text-sm"
              >
                <LogOut className="w-4 h-4" />
                <span>התנתק</span>
              </button>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-gray-700 font-medium text-sm">בס"ד אירועים</span>
              <span className="text-gray-500 text-xs">גרסה 1.0.0</span>
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto overflow-x-hidden min-h-0 w-full" style={{ width: '100%', flex: '1 1 0%', backgroundColor: '#f9fafb', padding: '24px' }}>
          <div style={{ maxWidth: '1440px', margin: '0 auto' }}>
            {children}
          </div>
        </main>
        <Footer />
      </div>

      {/* Sidebar - Right */}
      <div className="fixed right-0 top-0 h-screen flex flex-col" style={{ width: '260px', backgroundColor: '#1f2937', padding: '16px' }}>
        <nav className="flex flex-col flex-1" role="navigation" aria-label="ניווט ראשי">
          <Link
            to="/"
            className={`flex items-center gap-2 w-full transition-colors text-sm ${
              isActive('/') 
                ? 'bg-gray-700 text-white font-medium border-r-2 border-white' 
                : 'text-gray-300 hover:bg-gray-700'
            }`}
            style={{ height: '44px', marginBottom: '8px', padding: '0 12px' }}
            aria-label="דשבורד"
            aria-current={isActive('/') ? 'page' : undefined}
          >
            <Home className="w-4 h-4" aria-hidden="true" />
            <span>דשבורד</span>
          </Link>
          
          <Link
            to="/create-event"
            className={`flex items-center gap-2 w-full transition-colors text-sm ${
              isActive('/create-event') 
                ? 'bg-gray-700 text-white font-medium border-r-2 border-white' 
                : 'text-gray-300 hover:bg-gray-700'
            }`}
            style={{ height: '44px', marginBottom: '8px', padding: '0 12px' }}
          >
            <Plus className="w-4 h-4" />
            <span>אירוע חדש</span>
          </Link>
          
          <Link
            to="/calendar"
            className={`flex items-center gap-2 w-full transition-colors text-sm ${
              isActive('/calendar') 
                ? 'bg-gray-700 text-white font-medium border-r-2 border-white' 
                : 'text-gray-300 hover:bg-gray-700'
            }`}
            style={{ height: '44px', marginBottom: '8px', padding: '0 12px' }}
          >
            <CalendarDays className="w-4 h-4" />
            <span>לוח שנה</span>
          </Link>
          
          <Link
            to="/templates"
            className={`flex items-center gap-2 w-full transition-colors text-sm ${
              isActive('/templates') 
                ? 'bg-gray-700 text-white font-medium border-r-2 border-white' 
                : 'text-gray-300 hover:bg-gray-700'
            }`}
            style={{ height: '44px', marginBottom: '8px', padding: '0 12px' }}
          >
            <FileText className="w-4 h-4" />
            <span>תבניות הודעות</span>
          </Link>
          
          <Link
            to="/clients"
            className={`flex items-center gap-2 w-full transition-colors text-sm ${
              isActive('/clients') 
                ? 'bg-gray-700 text-white font-medium border-r-2 border-white' 
                : 'text-gray-300 hover:bg-gray-700'
            }`}
            style={{ height: '44px', marginBottom: '8px', padding: '0 12px' }}
          >
            <Users className="w-4 h-4" />
            <span>ניהול לקוחות</span>
          </Link>
          
          <Link
            to="/reminders"
            className={`flex items-center gap-2 w-full transition-colors text-sm ${
              isActive('/reminders') 
                ? 'bg-gray-700 text-white font-medium border-r-2 border-white' 
                : 'text-gray-300 hover:bg-gray-700'
            }`}
            style={{ height: '44px', marginBottom: '8px', padding: '0 12px' }}
          >
            <Bell className="w-4 h-4" />
            <span>תזכורות</span>
          </Link>
          
          {user?.isAdmin && (
            <>
              <Link
                to="/admin"
                className={`flex items-center gap-2 w-full transition-colors text-sm ${
                  isActive('/admin') 
                    ? 'bg-gray-700 text-white font-medium border-r-2 border-white' 
                    : 'text-gray-300 hover:bg-gray-700'
                }`}
                style={{ height: '44px', marginBottom: '8px', padding: '0 12px' }}
              >
                <Settings className="w-4 h-4" />
                <span>דשבורד מנהל</span>
              </Link>
              <Link
                to="/users"
                className={`flex items-center gap-2 w-full transition-colors text-sm ${
                  isActive('/users') 
                    ? 'bg-gray-700 text-white font-medium border-r-2 border-white' 
                    : 'text-gray-300 hover:bg-gray-700'
                }`}
                style={{ height: '44px', marginBottom: '8px', padding: '0 12px' }}
              >
                <Users className="w-4 h-4" />
                <span>ניהול משתמשים</span>
              </Link>
            </>
          )}
          
          <Link
            to="/settings"
            className={`flex items-center gap-2 w-full transition-colors text-sm ${
              isActive('/settings') 
                ? 'bg-gray-700 text-white font-medium border-r-2 border-white' 
                : 'text-gray-300 hover:bg-gray-700'
            }`}
            style={{ height: '44px', marginBottom: '8px', padding: '0 12px' }}
          >
            <Settings className="w-4 h-4" />
            <span>הגדרות</span>
          </Link>
        </nav>
        
        {/* Logout button at bottom */}
        <button
          onClick={handleLogout}
          className="flex items-center gap-2 w-full transition-colors text-sm text-gray-300 hover:bg-gray-700"
          style={{ height: '44px', marginTop: 'auto', padding: '0 12px' }}
        >
          <LogOut className="w-4 h-4" />
          <span>התנתק</span>
        </button>
      </div>
    </div>
  );
};

export default Layout;
