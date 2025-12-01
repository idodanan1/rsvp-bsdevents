import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { User, UserStore } from '../types';
import { generateId } from '../utils/helpers';

// Mock users database (בפועל זה יהיה ב-backend)
const mockUsers: User[] = [];

// מנהל קבוע - לא ניתן להירשם למנהל, רק להתחבר עם הפרטים הקבועים
const ADMIN_EMAIL = 'idodanan1@gmail.com';
const ADMIN_PASSWORD = 'QPwo1029';

export const useUserStore = create<UserStore>()(
  persist(
    (set, get) => ({
      user: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,

      signUp: async (email: string, password: string, name: string, phoneNumber: string) => {
        set({ isLoading: true, error: null });
        try {
          const backendUrl = import.meta.env.VITE_BACKEND_URL || 'https://whatsapp-backend-enfz.onrender.com';
          
          const response = await fetch(`${backendUrl}/api/users/signup`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              email: email.trim(),
              password: password.trim(),
              name: name.trim(),
              phoneNumber: phoneNumber.trim()
            })
          });

          const data = await response.json();

          if (!response.ok) {
            throw new Error(data.error || 'שגיאה בהרשמה');
          }

          if (!data.success || !data.user) {
            throw new Error('שגיאה בהרשמה - תגובה לא תקינה מהשרת');
          }

          // Convert dates from ISO strings to Date objects
          const newUser: User = {
            ...data.user,
            createdAt: new Date(data.user.createdAt),
            updatedAt: new Date(data.user.updatedAt)
          };

          set({ user: newUser, isAuthenticated: true, isLoading: false });
        } catch (error: any) {
          console.error('❌ Signup error:', error);
          set({ error: error.message || 'שגיאה בהרשמה', isLoading: false });
          throw error;
        }
      },

      login: async (email: string, password: string) => {
        set({ isLoading: true, error: null });
        try {
          // בדיקה אם זה המנהל הקבוע
          if (email.toLowerCase() === ADMIN_EMAIL.toLowerCase()) {
            if (password !== ADMIN_PASSWORD) {
              throw new Error('אימייל או סיסמה שגויים');
            }

            // יצירת/טעינת מנהל קבוע
            const adminUser: User = {
              id: 'admin-fixed-id', // ID קבוע למנהל
              email: ADMIN_EMAIL,
              name: 'מנהל המערכת',
              credits: 999999, // למנהל יש רשומות בלתי מוגבלות
              createdAt: new Date('2024-01-01'),
              updatedAt: new Date(),
              isAdmin: true,
            };

            // Create session ID for admin login
            const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            sessionStorage.setItem('rsvp-session-id', sessionId);
            localStorage.setItem('rsvp-last-session-id', sessionId);
            
            set({ user: adminUser, isAuthenticated: true, isLoading: false });
            return;
          }

          // התחברות - נסה localStorage קודם (מהיר), ואז backend אם צריך
          const normalizedEmail = email.toLowerCase().trim();
          
          console.log('🔐 Login attempt:', { email: normalizedEmail });
          
          // נסה localStorage קודם (מהיר מאוד)
          const passwords: Record<string, string> = JSON.parse(localStorage.getItem('rsvp-passwords') || '{}');
          const storedPassword = passwords[normalizedEmail];
          
          if (storedPassword && storedPassword === password) {
            // נמצא ב-localStorage - השתמש בו (מהיר)
            const stored = localStorage.getItem('rsvp-users-storage');
            if (stored) {
              const parsed = JSON.parse(stored);
              const users: User[] = parsed.state?.users || [];
              const user = users.find((u: User) => u.email.toLowerCase().trim() === normalizedEmail);
              
              if (user) {
                console.log('✅ Login successful via localStorage (fast):', { id: user.id, email: user.email, name: user.name });
                // Create session ID for this login
                const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
                sessionStorage.setItem('rsvp-session-id', sessionId);
                localStorage.setItem('rsvp-last-session-id', sessionId);
                
                set({ user: { ...user, isAdmin: false }, isAuthenticated: true, isLoading: false });
                
                // נסה לסנכרן עם backend ברקע (לא חוסם)
                const backendUrl = import.meta.env.VITE_BACKEND_URL || 'https://whatsapp-backend-enfz.onrender.com';
                fetch(`${backendUrl}/api/users/login`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ email: email.trim(), password: password.trim() })
                }).catch(() => {
                  // Ignore - just trying to sync in background
                });
                
                return;
              }
            }
          }
          
          // לא נמצא ב-localStorage - נסה backend
          const backendUrl = import.meta.env.VITE_BACKEND_URL || 'https://whatsapp-backend-enfz.onrender.com';
          
          try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 3000); // רק 3 שניות - אם זה לא עובד מהר, זה לא עובד
            
            const response = await fetch(`${backendUrl}/api/users/login`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ email: email.trim(), password: password.trim() }),
              signal: controller.signal
            });
            
            clearTimeout(timeoutId);
            
            if (response.ok) {
              const data = await response.json();
              if (data.success && data.user) {
                const user: User = {
                  ...data.user,
                  createdAt: new Date(data.user.createdAt),
                  updatedAt: new Date(data.user.updatedAt)
                };
                
                console.log('✅ Login successful via backend:', { id: user.id, email: user.email, name: user.name });
                // Create session ID for this login
                const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
                sessionStorage.setItem('rsvp-session-id', sessionId);
                localStorage.setItem('rsvp-last-session-id', sessionId);
                
                set({ user, isAuthenticated: true, isLoading: false });
                return;
              }
            }
          } catch (error: any) {
            // Backend failed - ignore and continue to error
            console.log('⚠️ Backend unavailable:', error.message);
          }
          
          // אם הגענו לכאן - לא נמצא בשום מקום
          throw new Error('אימייל או סיסמה שגויים. אם זה מחשב חדש, אנא הירשם מחדש.');

        } catch (error: any) {
          set({ error: error.message || 'שגיאה בהתחברות', isLoading: false });
          throw error;
        }
      },

      logout: () => {
        // Clear session ID on logout
        sessionStorage.removeItem('rsvp-session-id');
        localStorage.removeItem('rsvp-last-session-id');
        set({ user: null, isAuthenticated: false, error: null });
      },

      updateCredits: (credits: number) => {
        const { user } = get();
        if (user) {
          const updatedUser = { ...user, credits, updatedAt: new Date() };
          
          // עדכון ב-localStorage
          const stored = localStorage.getItem('rsvp-users-storage');
          if (stored) {
            const parsed = JSON.parse(stored);
            const users: User[] = parsed.state?.users || [];
            const index = users.findIndex((u: User) => u.id === user.id);
            if (index !== -1) {
              users[index] = updatedUser;
              localStorage.setItem('rsvp-users-storage', JSON.stringify({ state: { users } }));
            }
          }

          set({ user: updatedUser });
        }
      },

      deductCredits: async (amount: number) => {
        const { user, checkCredits } = get();
        if (!user) {
          throw new Error('לא מחובר');
        }

        if (!checkCredits(amount)) {
          return false; // אין מספיק רשומות
        }

        const newCredits = user.credits - amount;
        get().updateCredits(newCredits);
        return true;
      },

      checkCredits: (required: number) => {
        const { user } = get();
        if (!user) {
          return false;
        }
        return user.credits >= required;
      },

      makeAdmin: () => {
        // פונקציה זו הוסרה - לא ניתן להפוך משתמש למנהל
        // רק המנהל הקבוע יכול להתחבר כמנהל
        throw new Error('לא ניתן להפוך משתמש למנהל. רק המנהל הקבוע יכול להתחבר כמנהל.');
      },

      getAllUsers: () => {
        const { user } = get();
        // רק מנהל יכול לראות את כל המשתמשים
        if (!user || !user.isAdmin) {
          throw new Error('רק מנהל יכול לראות את כל המשתמשים');
        }

        const stored = localStorage.getItem('rsvp-users-storage');
        if (!stored) {
          return [];
        }

        const parsed = JSON.parse(stored);
        const users: User[] = parsed.state?.users || [];
        
        // הוספת המנהל לרשימה
        const adminUser: User = {
          id: 'admin-fixed-id',
          email: ADMIN_EMAIL,
          name: 'מנהל המערכת',
          credits: 999999,
          createdAt: new Date('2024-01-01'),
          updatedAt: new Date(),
          isAdmin: true,
        };

        return [adminUser, ...users];
      },

      getAllUsersWithPasswords: async () => {
        const { user } = get();
        // רק מנהל יכול לראות את כל המשתמשים עם הסיסמאות
        if (!user || !user.isAdmin) {
          throw new Error('רק מנהל יכול לראות את כל המשתמשים עם הסיסמאות');
        }

        try {
          const backendUrl = import.meta.env.VITE_BACKEND_URL || 'https://whatsapp-backend-enfz.onrender.com';
          
          const response = await fetch(`${backendUrl}/api/users`, {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
            }
          });

          const data = await response.json();

          if (!response.ok) {
            // If we get a warning about MongoDB but still have users, show warning but continue
            if (data.warning && data.users && data.users.length > 0) {
              console.warn('⚠️ MongoDB warning:', data.warning);
            } else {
              throw new Error(data.error || 'שגיאה בטעינת משתמשים');
            }
          }

          if (!data.success || !data.users) {
            throw new Error('שגיאה בטעינת משתמשים - תגובה לא תקינה מהשרת');
          }
          
          // Show warning if MongoDB is not available
          if (data.warning && !data.mongoDbAvailable) {
            console.warn('⚠️ MongoDB לא זמין:', data.warning);
          }

          // Convert dates from ISO strings to Date objects
          const usersWithPasswords = data.users.map((u: any) => ({
            ...u,
            createdAt: new Date(u.createdAt),
            updatedAt: new Date(u.updatedAt)
          }));

          return usersWithPasswords;
        } catch (error: any) {
          console.error('❌ Get users error:', error);
          throw error;
        }
      },

      addCreditsToUser: async (userEmailOrName: string, creditsToAdd: number) => {
        const { user } = get();
        // רק מנהל יכול להוסיף רשומות למשתמש אחר
        if (!user || !user.isAdmin) {
          throw new Error('רק מנהל יכול להוסיף רשומות למשתמש אחר');
        }

        // אם זה המנהל, לא ניתן להוסיף רשומות
        if (userEmailOrName.toLowerCase() === ADMIN_EMAIL.toLowerCase() || userEmailOrName === 'מנהל המערכת') {
          throw new Error('לא ניתן להוסיף רשומות למנהל המערכת');
        }

        try {
          // First, get all users to find the user ID
          const backendUrl = import.meta.env.VITE_BACKEND_URL || 'https://whatsapp-backend-enfz.onrender.com';
          const usersResponse = await fetch(`${backendUrl}/api/users`);
          const usersData = await usersResponse.json();
          
          if (!usersData.success || !usersData.users) {
            throw new Error('שגיאה בטעינת משתמשים');
          }
          
          // Find user by email, name, or ID
          const targetUser = usersData.users.find((u: any) => 
            u.email.toLowerCase() === userEmailOrName.toLowerCase() ||
            u.name?.toLowerCase().includes(userEmailOrName.toLowerCase()) ||
            userEmailOrName.toLowerCase().includes(u.name?.toLowerCase() || '') ||
            u.id === userEmailOrName
          );

          if (!targetUser) {
            throw new Error(`משתמש "${userEmailOrName}" לא נמצא`);
          }

          // Add credits via API
          const response = await fetch(`${backendUrl}/api/users/${targetUser.id}/credits`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ creditsToAdd })
          });

          const data = await response.json();

          if (!response.ok) {
            throw new Error(data.error || 'שגיאה בהוספת רשומות');
          }

          if (!data.success || !data.user) {
            throw new Error('שגיאה בהוספת רשומות - תגובה לא תקינה מהשרת');
          }

          console.log(`✅ הוספו ${creditsToAdd} רשומות למשתמש ${data.user.name} (${data.user.email})`);
          console.log(`📊 רשומות קודמות: ${data.previousCredits}`);
          console.log(`📊 רשומות חדשות: ${data.newCredits}`);

          return {
            success: true,
            user: {
              ...data.user,
              createdAt: new Date(data.user.createdAt),
              updatedAt: new Date(data.user.updatedAt)
            },
            previousCredits: data.previousCredits,
            newCredits: data.newCredits
          };
        } catch (error: any) {
          console.error('❌ Add credits error:', error);
          throw error;
        }
      },
    }),
    {
      name: 'rsvp-user-storage',
      partialize: (state) => ({ user: state.user, isAuthenticated: state.isAuthenticated }),
      onRehydrateStorage: () => (state) => {
        // CRITICAL SECURITY FIX: Check if this is a new session
        // If sessionStorage doesn't have the session ID, clear authentication
        // This prevents sharing links from auto-logging in as the previous user
        const sessionId = sessionStorage.getItem('rsvp-session-id');
        const storedSessionId = localStorage.getItem('rsvp-last-session-id');
        
        if (state) {
          // If no session ID in sessionStorage, this is a new browser session
          // OR if session ID doesn't match, this is a different browser/device
          if (!sessionId || sessionId !== storedSessionId) {
            console.log('🔒 New session detected - clearing authentication state for security');
            // Clear authentication state for security
            state.user = null;
            state.isAuthenticated = false;
            
            // Generate new session ID
            const newSessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            sessionStorage.setItem('rsvp-session-id', newSessionId);
            localStorage.setItem('rsvp-last-session-id', newSessionId);
          } else {
            console.log('🔄 Rehydrating user state for existing session...');
            // Session matches - keep authentication state
          }
        }
      },
    }
  )
);

