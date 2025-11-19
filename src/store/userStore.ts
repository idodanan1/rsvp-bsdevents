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

      signUp: async (email: string, password: string, name: string) => {
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
              name: name.trim()
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

            set({ user: adminUser, isAuthenticated: true, isLoading: false });
            return;
          }

          // התחברות דרך Backend API
          const backendUrl = import.meta.env.VITE_BACKEND_URL || 'https://whatsapp-backend-enfz.onrender.com';
          
          console.log('🔐 Login attempt:', {
            email: email,
            backendUrl: backendUrl,
            fullUrl: `${backendUrl}/api/users/login`
          });
          console.log('🔐 Full login details:', JSON.stringify({
            email: email.trim(),
            passwordLength: password.trim().length
          }, null, 2));
          
          let response: Response;
          let data: any;
          
          try {
            // Add timeout to prevent hanging
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 seconds timeout
            
            response = await fetch(`${backendUrl}/api/users/login`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                email: email.trim(),
                password: password.trim()
              }),
              signal: controller.signal
            });
            
            clearTimeout(timeoutId);

            console.log('📡 Response status:', response.status);
            console.log('📡 Response headers:', Object.fromEntries(response.headers.entries()));
            
            // Try to parse JSON, but handle errors
            const responseText = await response.text();
            console.log('📡 Response text:', responseText);
            
            try {
              data = JSON.parse(responseText);
            } catch (parseError) {
              console.error('❌ Failed to parse JSON response:', parseError);
              throw new Error(`שגיאה בתגובת השרת: ${responseText.substring(0, 100)}`);
            }

            console.log('📡 Parsed response data:', data);
          } catch (fetchError: any) {
            console.error('❌ Fetch error details:', {
              name: fetchError.name,
              message: fetchError.message,
              stack: fetchError.stack,
              type: typeof fetchError
            });
            
            // Handle timeout
            if (fetchError.name === 'AbortError') {
              console.error('❌ Request timeout - server took too long to respond');
              throw new Error('השרת לא מגיב. נסה שוב בעוד כמה רגעים או בדוק שהשרת רץ.');
            }
            
            if (fetchError.message) {
              throw fetchError;
            }
            // Network error or CORS error
            if (fetchError.name === 'TypeError' && fetchError.message.includes('fetch')) {
              console.error('❌ Network/CORS error detected');
              throw new Error('לא ניתן להתחבר לשרת. בדוק את החיבור לאינטרנט או שהשרת לא רץ. אם זה מחשב חדש, ייתכן שהמשתמש לא קיים ב-backend - נסה להירשם מחדש.');
            }
            throw new Error(`שגיאה בהתחברות לשרת: ${fetchError.message || 'שגיאה לא ידועה'}`);
          }

          if (!response.ok) {
            console.error('❌ Login failed:', {
              status: response.status,
              statusText: response.statusText,
              data: data
            });
            throw new Error(data?.error || `שגיאה בהתחברות (${response.status}): ${response.statusText}`);
          }

          if (!data.success || !data.user) {
            console.error('❌ Invalid response format:', data);
            throw new Error('שגיאה בהתחברות - תגובה לא תקינה מהשרת');
          }

          // Convert dates from ISO strings to Date objects
          const user: User = {
            ...data.user,
            createdAt: new Date(data.user.createdAt),
            updatedAt: new Date(data.user.updatedAt)
          };
          
          console.log('✅ Login successful:', { id: user.id, email: user.email, name: user.name });

          set({ user, isAuthenticated: true, isLoading: false });
        } catch (error: any) {
          set({ error: error.message || 'שגיאה בהתחברות', isLoading: false });
          throw error;
        }
      },

      logout: () => {
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
            throw new Error(data.error || 'שגיאה בטעינת משתמשים');
          }

          if (!data.success || !data.users) {
            throw new Error('שגיאה בטעינת משתמשים - תגובה לא תקינה מהשרת');
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
        // CRITICAL FIX: Prevent auto-login - always require explicit login
        // Clear any authentication state on page load to force login
        if (state) {
          console.log('🔄 Rehydrating user state...');
          
          // Always clear authentication on page load to prevent auto-login
          // Users must explicitly log in each time
          if (state.user || state.isAuthenticated) {
            console.warn('⚠️ Clearing authentication state on page load - user must log in explicitly');
            state.isAuthenticated = false;
            state.user = null;
          }
        }
      },
    }
  )
);

