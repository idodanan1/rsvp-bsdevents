import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { User, UserStore } from '../types';
import { generateId, createTimeoutSignal } from '../utils/helpers';

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
          
          // Check backend health first
          try {
            const healthResponse = await fetch(`${backendUrl}/api/health`, {
              signal: createTimeoutSignal(5000) // 5 second timeout
            });
            if (healthResponse.ok) {
              const healthData = await healthResponse.json();
              if (!healthData.mongodb?.connected) {
                console.warn('⚠️ Backend is running but MongoDB is not connected');
                throw new Error('מסד הנתונים לא זמין כרגע. השרת מנסה להתחבר. אנא נסה שוב בעוד כמה שניות.');
              }
            }
          } catch (healthError: any) {
            // If health check fails, still try signup (might be temporary)
            console.warn('⚠️ Health check failed, proceeding with signup:', healthError.message);
          }
          
          // Retry logic for 503 errors (database unavailable)
          let lastError: any = null;
          const maxRetries = 3;
          const retryDelay = 2000; // 2 seconds
          
          for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
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
                }),
                signal: createTimeoutSignal(15000) // 15 second timeout
              });

              const data = await response.json();

              if (!response.ok) {
                // If it's a 503 error and we have retries left, wait and retry
                if (response.status === 503 && attempt < maxRetries) {
                  console.log(`🔄 Database unavailable (attempt ${attempt}/${maxRetries}), retrying in ${retryDelay/1000} seconds...`);
                  await new Promise(resolve => setTimeout(resolve, retryDelay * attempt));
                  lastError = new Error(data.error || 'מסד הנתונים לא זמין. מנסה שוב...');
                  continue;
                }
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
              return; // Success, exit retry loop
            } catch (error: any) {
              lastError = error;
              // If it's a network error or 503 and we have retries left, continue
              if ((error.name === 'TypeError' || error.message?.includes('מסד הנתונים לא זמין')) && attempt < maxRetries) {
                console.log(`🔄 Network/database error (attempt ${attempt}/${maxRetries}), retrying in ${retryDelay/1000} seconds...`);
                await new Promise(resolve => setTimeout(resolve, retryDelay * attempt));
                continue;
              }
              // Otherwise, throw immediately
              throw error;
            }
          }
          
          // If we exhausted all retries, throw the last error
          throw lastError || new Error('שגיאה בהרשמה - נכשל לאחר מספר ניסיונות');
        } catch (error: any) {
          console.error('❌ Signup error:', error);
          let errorMessage = error.message || 'שגיאה בהרשמה';
          
          // Provide more helpful error messages
          if (errorMessage.includes('מסד הנתונים לא זמין')) {
            errorMessage = 'מסד הנתונים לא זמין כרגע. אנא נסה שוב בעוד כמה דקות. אם הבעיה נמשכת, אנא צור קשר עם התמיכה.';
          } else if (error.name === 'AbortError' || errorMessage.includes('timeout')) {
            errorMessage = 'הבקשה ארכה זמן רב מדי. אנא בדוק את החיבור לאינטרנט ונסה שוב.';
          } else if (error.name === 'TypeError' && errorMessage.includes('Failed to fetch')) {
            errorMessage = 'לא ניתן להתחבר לשרת. אנא בדוק את החיבור לאינטרנט ונסה שוב.';
          }
          
          set({ error: errorMessage, isLoading: false });
          throw new Error(errorMessage);
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

            // Get or create session ID for admin login - use localStorage so it persists
            let sessionId = localStorage.getItem('rsvp-session-id') || sessionStorage.getItem('rsvp-session-id');
            if (!sessionId) {
              sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            }
            localStorage.setItem('rsvp-session-id', sessionId);
            localStorage.setItem('rsvp-last-session-id', sessionId);
            sessionStorage.setItem('rsvp-session-id', sessionId);
            
            set({ user: adminUser, isAuthenticated: true, isLoading: false });
            return;
          }

          // CRITICAL SECURITY FIX: Always check backend first (source of truth)
          // Only use localStorage as fallback if backend is unavailable
          // This prevents logging in as wrong user if localStorage has stale data
          const normalizedEmail = email.toLowerCase().trim();
          
          console.log('🔐 Login attempt:', { email: normalizedEmail });
          
          const backendUrl = import.meta.env.VITE_BACKEND_URL || 'https://whatsapp-backend-enfz.onrender.com';
          
          // CRITICAL: Always try backend first (source of truth)
          try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 seconds timeout
            
            // Get existing sessionId if available (to reuse same session for same device)
            // Check localStorage first (persists across browser restarts)
            const existingSessionId = localStorage.getItem('rsvp-session-id') || sessionStorage.getItem('rsvp-session-id') || localStorage.getItem('rsvp-last-session-id');
            
            const response = await fetch(`${backendUrl}/api/users/login`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ 
                email: email.trim(), 
                password: password.trim(),
                sessionId: existingSessionId || undefined // Send existing sessionId if available
              }),
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
                
                // CRITICAL: Verify the user email matches what was requested
                // This prevents logging in as wrong user if backend returns wrong data
                if (user.email.toLowerCase().trim() !== normalizedEmail) {
                  console.error('❌ SECURITY ERROR: Backend returned different user!', {
                    requested: normalizedEmail,
                    returned: user.email.toLowerCase().trim()
                  });
                  throw new Error('שגיאת אבטחה: השרת החזיר משתמש אחר. אנא נסה שוב.');
                }
                
                // Use sessionId from response if provided, otherwise use existing or create new one
                const sessionId = data.sessionId || existingSessionId || `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
                // Save to both localStorage (persists) and sessionStorage (current session)
                localStorage.setItem('rsvp-session-id', sessionId);
                localStorage.setItem('rsvp-last-session-id', sessionId);
                sessionStorage.setItem('rsvp-session-id', sessionId);
                
                // CRITICAL: Clear any old localStorage user data to prevent conflicts
                // Only keep passwords for offline fallback, but don't use them if backend works
                const passwords: Record<string, string> = JSON.parse(localStorage.getItem('rsvp-passwords') || '{}');
                passwords[normalizedEmail] = password; // Update password for offline fallback
                localStorage.setItem('rsvp-passwords', JSON.stringify(passwords));
                
                set({ user, isAuthenticated: true, isLoading: false });
                return;
              } else {
                // Backend returned error - don't try localStorage, throw error
                throw new Error('אימייל או סיסמה שגויים');
              }
            } else {
              // Backend returned error status
              const errorData = await response.json().catch(() => ({}));
              throw new Error(errorData.error || 'אימייל או סיסמה שגויים');
            }
          } catch (error: any) {
            // Backend failed - don't use localStorage fallback for security reasons
            // localStorage might contain stale data from wrong user, especially on new devices
            console.log('⚠️ Backend unavailable or error:', error.message);
            
            // If backend is truly unavailable (network error), provide helpful error message
            if (error.name === 'AbortError' || error.message?.includes('Failed to fetch') || error.message?.includes('NetworkError')) {
              throw new Error('השרת לא זמין כרגע. אנא בדוק את החיבור לאינטרנט ונסה שוב. אם הבעיה נמשכת, אנא צור קשר עם התמיכה.');
            }
            
            // For auth errors or other errors, throw the original error
            throw error;
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
        // CRITICAL SECURITY FIX: Always verify user from backend on page load
        // Don't trust localStorage user data - it might be stale or from wrong user
        // This prevents auto-logging in as wrong user when switching devices/computers
        
        if (state && state.user && state.isAuthenticated) {
          // User is stored in localStorage - verify it's still valid
          // Don't auto-login - require explicit login to prevent security issues
          console.log('🔒 User found in localStorage - clearing for security (require explicit login)');
          
          // Clear authentication state - require explicit login
          // This prevents logging in as wrong user when switching devices
          state.user = null;
          state.isAuthenticated = false;
          
          // Generate new session ID for this browser/device
          const newSessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
          localStorage.setItem('rsvp-session-id', newSessionId);
          localStorage.setItem('rsvp-last-session-id', newSessionId);
          sessionStorage.setItem('rsvp-session-id', newSessionId);
          
          // Clear old session IDs to prevent conflicts
          const oldSessionId = localStorage.getItem('rsvp-session-id');
          if (oldSessionId && oldSessionId !== newSessionId) {
            console.log('🔒 Cleared old session ID:', oldSessionId);
          }
        } else {
          // No user in state - ensure we have a fresh session ID
          const sessionIdFromStorage = localStorage.getItem('rsvp-session-id') || sessionStorage.getItem('rsvp-session-id');
          if (!sessionIdFromStorage) {
            const newSessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            localStorage.setItem('rsvp-session-id', newSessionId);
            localStorage.setItem('rsvp-last-session-id', newSessionId);
            sessionStorage.setItem('rsvp-session-id', newSessionId);
          }
        }
      },
    }
  )
);

