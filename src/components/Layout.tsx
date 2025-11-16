import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Calendar, Plus, Home, Settings, MessageSquare, Users, Bell, CalendarDays } from 'lucide-react';

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const location = useLocation();

  const isActive = (path: string) => {
    return location.pathname === path;
  };

  return (
    <div className="min-h-screen flex">
      {/* Sidebar */}
      <div className="w-64 bg-white shadow-lg">
        <div className="p-6">
          <h1 className="text-2xl font-bold text-yellow-500 mb-8">
            בס"ד אירועים
          </h1>
          
          <nav className="space-y-2">
            <Link
              to="/"
              className={`flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors ${
                isActive('/') 
                  ? 'bg-teal-100 text-teal-700 font-medium' 
                  : 'text-gray-600 hover:bg-yellow-50'
              }`}
            >
              <Home className="w-5 h-5" />
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
          </nav>
        </div>
        
        <div className="absolute bottom-0 left-0 right-0 p-6 border-t border-gray-200">
          <div className="text-sm text-gray-500 text-center">
            גרסה 1.0.0
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        <main className="flex-1 p-8">
          {children}
        </main>
      </div>
    </div>
  );
};

export default Layout;
