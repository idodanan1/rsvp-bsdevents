import React, { useState, useEffect } from 'react';
import { 
  Settings as SettingsIcon, 
  User, 
  Bell, 
  Globe, 
  Eye, 
  Palette, 
  Save,
  Mail,
  Phone,
  MessageSquare,
  Calendar,
  Moon,
  Sun,
  Type,
  Shield,
  RefreshCw
} from 'lucide-react';
import { useUserStore } from '../store/userStore';
import toast from 'react-hot-toast';

interface UserSettings {
  // Profile
  displayName: string;
  email: string;
  
  // Notifications
  emailNotifications: boolean;
  smsNotifications: boolean;
  whatsappNotifications: boolean;
  reminderNotifications: boolean;
  
  // Language & Date
  language: 'he' | 'en';
  dateFormat: 'dd/mm/yyyy' | 'mm/dd/yyyy' | 'yyyy-mm-dd';
  timeFormat: '12h' | '24h';
  
  // Privacy
  showEmail: boolean;
  showPhone: boolean;
  
  // Display
  theme: 'light' | 'dark' | 'auto';
  fontSize: 'small' | 'medium' | 'large';
  
  // Automation
  autoSync: boolean;
  autoBackup: boolean;
}

const defaultSettings: UserSettings = {
  displayName: '',
  email: '',
  emailNotifications: true,
  smsNotifications: false,
  whatsappNotifications: true,
  reminderNotifications: true,
  language: 'he',
  dateFormat: 'dd/mm/yyyy',
  timeFormat: '24h',
  showEmail: false,
  showPhone: false,
  theme: 'light',
  fontSize: 'medium',
  autoSync: true,
  autoBackup: false,
};

const Settings: React.FC = () => {
  const { user } = useUserStore();
  const [settings, setSettings] = useState<UserSettings>(defaultSettings);
  const [isLoading, setIsLoading] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    // Load settings from localStorage
    const savedSettings = localStorage.getItem('rsvp-user-settings');
    if (savedSettings) {
      try {
        const parsed = JSON.parse(savedSettings);
        setSettings({ ...defaultSettings, ...parsed });
      } catch (error) {
        console.error('Error loading settings:', error);
      }
    } else {
      // Initialize with user data
      if (user) {
        setSettings({
          ...defaultSettings,
          displayName: user.name || '',
          email: user.email || '',
        });
      }
    }
  }, [user]);

  useEffect(() => {
    // Check if settings have changed
    const savedSettings = localStorage.getItem('rsvp-user-settings');
    if (savedSettings) {
      try {
        const parsed = JSON.parse(savedSettings);
        setHasChanges(JSON.stringify(parsed) !== JSON.stringify(settings));
      } catch {
        setHasChanges(true);
      }
    } else {
      setHasChanges(true);
    }
  }, [settings]);

  const handleSave = () => {
    setIsLoading(true);
    try {
      localStorage.setItem('rsvp-user-settings', JSON.stringify(settings));
      toast.success('ההגדרות נשמרו בהצלחה');
      setHasChanges(false);
      
      // Apply theme if changed
      if (settings.theme === 'dark') {
        document.documentElement.classList.add('dark');
      } else if (settings.theme === 'light') {
        document.documentElement.classList.remove('dark');
      } else {
        // Auto theme based on system preference
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        if (prefersDark) {
          document.documentElement.classList.add('dark');
        } else {
          document.documentElement.classList.remove('dark');
        }
      }
    } catch (error) {
      console.error('Error saving settings:', error);
      toast.error('שגיאה בשמירת ההגדרות');
    } finally {
      setIsLoading(false);
    }
  };

  const handleReset = () => {
    if (window.confirm('האם אתה בטוח שברצונך לאפס את כל ההגדרות לברירת המחדל?')) {
      const resetSettings = {
        ...defaultSettings,
        displayName: user?.name || '',
        email: user?.email || '',
      };
      setSettings(resetSettings);
      toast.success('ההגדרות אופסו לברירת המחדל');
    }
  };

  const updateSetting = <K extends keyof UserSettings>(key: K, value: UserSettings[K]) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-lg p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3 space-x-reverse">
            <SettingsIcon className="w-8 h-8 text-teal-600" />
            <div>
              <h1 className="text-2xl font-bold text-gray-800">הגדרות</h1>
              <p className="text-gray-600">נהל את ההגדרות וההעדפות שלך</p>
            </div>
          </div>
          <div className="flex items-center space-x-2 space-x-reverse">
            <button
              onClick={handleReset}
              className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors flex items-center space-x-2 space-x-reverse"
            >
              <RefreshCw className="w-4 h-4" />
              <span>איפוס</span>
            </button>
            <button
              onClick={handleSave}
              disabled={!hasChanges || isLoading}
              className="px-6 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2 space-x-reverse"
            >
              <Save className="w-4 h-4" />
              <span>{isLoading ? 'שומר...' : 'שמור שינויים'}</span>
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Profile Settings */}
        <div className="bg-white rounded-lg shadow-lg p-6">
          <div className="flex items-center space-x-2 space-x-reverse mb-6">
            <User className="w-5 h-5 text-teal-600" />
            <h2 className="text-xl font-semibold text-gray-800">פרופיל</h2>
          </div>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                שם תצוגה
              </label>
              <input
                type="text"
                value={settings.displayName}
                onChange={(e) => updateSetting('displayName', e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                placeholder="הזן שם תצוגה"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                אימייל
              </label>
              <input
                type="email"
                value={settings.email}
                onChange={(e) => updateSetting('email', e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                placeholder="הזן אימייל"
                dir="ltr"
              />
            </div>
          </div>
        </div>

        {/* Notification Settings */}
        <div className="bg-white rounded-lg shadow-lg p-6">
          <div className="flex items-center space-x-2 space-x-reverse mb-6">
            <Bell className="w-5 h-5 text-teal-600" />
            <h2 className="text-xl font-semibold text-gray-800">התראות</h2>
          </div>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2 space-x-reverse">
                <Mail className="w-5 h-5 text-gray-400" />
                <span className="text-gray-700">התראות אימייל</span>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.emailNotifications}
                  onChange={(e) => updateSetting('emailNotifications', e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-teal-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:right-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-teal-600"></div>
              </label>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2 space-x-reverse">
                <Phone className="w-5 h-5 text-gray-400" />
                <span className="text-gray-700">התראות SMS</span>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.smsNotifications}
                  onChange={(e) => updateSetting('smsNotifications', e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-teal-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:right-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-teal-600"></div>
              </label>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2 space-x-reverse">
                <MessageSquare className="w-5 h-5 text-gray-400" />
                <span className="text-gray-700">התראות WhatsApp</span>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.whatsappNotifications}
                  onChange={(e) => updateSetting('whatsappNotifications', e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-teal-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:right-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-teal-600"></div>
              </label>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2 space-x-reverse">
                <Bell className="w-5 h-5 text-gray-400" />
                <span className="text-gray-700">תזכורות אוטומטיות</span>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.reminderNotifications}
                  onChange={(e) => updateSetting('reminderNotifications', e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-teal-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:right-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-teal-600"></div>
              </label>
            </div>
          </div>
        </div>

        {/* Language & Date Settings */}
        <div className="bg-white rounded-lg shadow-lg p-6">
          <div className="flex items-center space-x-2 space-x-reverse mb-6">
            <Globe className="w-5 h-5 text-teal-600" />
            <h2 className="text-xl font-semibold text-gray-800">שפה ותאריך</h2>
          </div>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                שפה
              </label>
              <select
                value={settings.language}
                onChange={(e) => updateSetting('language', e.target.value as 'he' | 'en')}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
              >
                <option value="he">עברית</option>
                <option value="en">English</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                פורמט תאריך
              </label>
              <select
                value={settings.dateFormat}
                onChange={(e) => updateSetting('dateFormat', e.target.value as UserSettings['dateFormat'])}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
              >
                <option value="dd/mm/yyyy">יום/חודש/שנה (31/12/2024)</option>
                <option value="mm/dd/yyyy">חודש/יום/שנה (12/31/2024)</option>
                <option value="yyyy-mm-dd">שנה-חודש-יום (2024-12-31)</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                פורמט שעה
              </label>
              <select
                value={settings.timeFormat}
                onChange={(e) => updateSetting('timeFormat', e.target.value as '12h' | '24h')}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
              >
                <option value="24h">24 שעות (14:30)</option>
                <option value="12h">12 שעות (2:30 PM)</option>
              </select>
            </div>
          </div>
        </div>

        {/* Privacy Settings */}
        <div className="bg-white rounded-lg shadow-lg p-6">
          <div className="flex items-center space-x-2 space-x-reverse mb-6">
            <Shield className="w-5 h-5 text-teal-600" />
            <h2 className="text-xl font-semibold text-gray-800">פרטיות</h2>
          </div>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-gray-700">הצג אימייל בפרופיל</span>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.showEmail}
                  onChange={(e) => updateSetting('showEmail', e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-teal-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:right-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-teal-600"></div>
              </label>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-gray-700">הצג טלפון בפרופיל</span>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.showPhone}
                  onChange={(e) => updateSetting('showPhone', e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-teal-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:right-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-teal-600"></div>
              </label>
            </div>
          </div>
        </div>

        {/* Display Settings */}
        <div className="bg-white rounded-lg shadow-lg p-6">
          <div className="flex items-center space-x-2 space-x-reverse mb-6">
            <Palette className="w-5 h-5 text-teal-600" />
            <h2 className="text-xl font-semibold text-gray-800">תצוגה</h2>
          </div>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                ערכת נושא
              </label>
              <div className="grid grid-cols-3 gap-3">
                <button
                  type="button"
                  onClick={() => updateSetting('theme', 'light')}
                  className={`p-3 rounded-lg border-2 flex flex-col items-center space-y-2 ${
                    settings.theme === 'light'
                      ? 'border-teal-500 bg-teal-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <Sun className="w-5 h-5" />
                  <span className="text-sm">בהיר</span>
                </button>
                <button
                  type="button"
                  onClick={() => updateSetting('theme', 'dark')}
                  className={`p-3 rounded-lg border-2 flex flex-col items-center space-y-2 ${
                    settings.theme === 'dark'
                      ? 'border-teal-500 bg-teal-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <Moon className="w-5 h-5" />
                  <span className="text-sm">כהה</span>
                </button>
                <button
                  type="button"
                  onClick={() => updateSetting('theme', 'auto')}
                  className={`p-3 rounded-lg border-2 flex flex-col items-center space-y-2 ${
                    settings.theme === 'auto'
                      ? 'border-teal-500 bg-teal-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <SettingsIcon className="w-5 h-5" />
                  <span className="text-sm">אוטומטי</span>
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                גודל טקסט
              </label>
              <div className="flex items-center space-x-2 space-x-reverse">
                <Type className="w-5 h-5 text-gray-400" />
                <select
                  value={settings.fontSize}
                  onChange={(e) => updateSetting('fontSize', e.target.value as UserSettings['fontSize'])}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                >
                  <option value="small">קטן</option>
                  <option value="medium">בינוני</option>
                  <option value="large">גדול</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Automation Settings */}
        <div className="bg-white rounded-lg shadow-lg p-6">
          <div className="flex items-center space-x-2 space-x-reverse mb-6">
            <RefreshCw className="w-5 h-5 text-teal-600" />
            <h2 className="text-xl font-semibold text-gray-800">אוטומציה</h2>
          </div>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-gray-700">סנכרון אוטומטי</span>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.autoSync}
                  onChange={(e) => updateSetting('autoSync', e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-teal-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:right-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-teal-600"></div>
              </label>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-gray-700">גיבוי אוטומטי</span>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.autoBackup}
                  onChange={(e) => updateSetting('autoBackup', e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-teal-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:right-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-teal-600"></div>
              </label>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Settings;

