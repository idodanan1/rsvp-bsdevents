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
          // בדיקה אם זה ניסיון להירשם כמנהל
          if (email.toLowerCase() === ADMIN_EMAIL.toLowerCase()) {
            throw new Error('לא ניתן להירשם עם אימייל זה. אנא השתמש בדף ההתחברות למנהל.');
          }

          // בדיקה אם המשתמש כבר קיים
          const stored = localStorage.getItem('rsvp-users-storage');
          if (stored) {
            const parsed = JSON.parse(stored);
            if (parsed.state && parsed.state.users) {
              const existingUser = parsed.state.users.find((u: User) => u.email === email);
              if (existingUser) {
                throw new Error('משתמש עם אימייל זה כבר קיים');
              }
            }
          }

          // יצירת משתמש חדש (לא מנהל)
          const newUser: User = {
            id: generateId(),
            email,
            name,
            credits: 0, // מתחיל עם 0 רשומות
            createdAt: new Date(),
            updatedAt: new Date(),
            isAdmin: false, // אף משתמש חדש לא יכול להיות מנהל
          };

          // שמירה ב-localStorage (זמני - בפועל זה יהיה ב-backend)
          const usersStorage = localStorage.getItem('rsvp-users-storage');
          let users: User[] = [];
          if (usersStorage) {
            const parsed = JSON.parse(usersStorage);
            users = parsed.state?.users || [];
          }
          users.push(newUser);
          localStorage.setItem('rsvp-users-storage', JSON.stringify({ state: { users } }));

          // שמירת סיסמה (בפועל זה יהיה מוצפן ב-backend)
          const passwords: Record<string, string> = JSON.parse(localStorage.getItem('rsvp-passwords') || '{}');
          passwords[email] = password; // בפועל: bcrypt.hash(password)
          localStorage.setItem('rsvp-passwords', JSON.stringify(passwords));

          set({ user: newUser, isAuthenticated: true, isLoading: false });
        } catch (error: any) {
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

          // התחברות משתמש רגיל
          const passwords: Record<string, string> = JSON.parse(localStorage.getItem('rsvp-passwords') || '{}');
          if (passwords[email] !== password) {
            throw new Error('אימייל או סיסמה שגויים');
          }

          // מציאת המשתמש
          const stored = localStorage.getItem('rsvp-users-storage');
          if (!stored) {
            throw new Error('משתמש לא נמצא');
          }

          const parsed = JSON.parse(stored);
          const users: User[] = parsed.state?.users || [];
          const user = users.find((u: User) => u.email === email);

          if (!user) {
            throw new Error('משתמש לא נמצא');
          }

          // ודא שמשתמש רגיל לא יכול להיות מנהל
          const regularUser = { ...user, isAdmin: false };
          set({ user: regularUser, isAuthenticated: true, isLoading: false });
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
    }),
    {
      name: 'rsvp-user-storage',
      partialize: (state) => ({ user: state.user, isAuthenticated: state.isAuthenticated }),
    }
  )
);

