import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { generateId } from '../utils/helpers';

// Type definitions
type Budget = any;
type Vendor = any;
type PaymentSchedule = any;
type BudgetStore = any;
type VendorCategory = any;

const mockBudgets: Budget[] = [];

export const useBudgetStore = create<BudgetStore>()(
  persist(
    (set, get) => ({
      budgets: mockBudgets,
      currentBudget: null,
      isLoading: false,
      error: null,

      createBudget: async (eventId: string, totalBudget: number) => {
        set({ isLoading: true, error: null });
        try {
          const newBudget: Budget = {
            id: generateId(),
            eventId,
            totalBudget,
            allocated: 0,
            spent: 0,
            remaining: totalBudget,
            vendors: [],
            createdAt: new Date(),
            updatedAt: new Date(),
          };

          set(state => ({
            budgets: [...state.budgets, newBudget],
            currentBudget: newBudget,
            isLoading: false,
          }));
        } catch (error) {
          set({ error: 'שגיאה ביצירת תקציב', isLoading: false });
        }
      },

      updateBudget: async (budgetId: string, updates: Partial<Budget>) => {
        set({ isLoading: true, error: null });
        try {
          set(state => {
            const updatedBudgets = state.budgets.map(budget => {
              if (budget.id === budgetId) {
                const updated = { ...budget, ...updates, updatedAt: new Date() };
                // Recalculate remaining
                updated.remaining = updated.totalBudget - updated.spent;
                return updated;
              }
              return budget;
            });

            const updatedBudget = updatedBudgets.find(b => b.id === budgetId);
            return {
              budgets: updatedBudgets,
              currentBudget: updatedBudget || state.currentBudget,
              isLoading: false,
            };
          });
        } catch (error) {
          set({ error: 'שגיאה בעדכון תקציב', isLoading: false });
        }
      },

      deleteBudget: async (budgetId: string) => {
        set({ isLoading: true, error: null });
        try {
          set(state => ({
            budgets: state.budgets.filter(b => b.id !== budgetId),
            currentBudget: state.currentBudget?.id === budgetId ? null : state.currentBudget,
            isLoading: false,
          }));
        } catch (error) {
          set({ error: 'שגיאה במחיקת תקציב', isLoading: false });
        }
      },

      getBudgetByEventId: (eventId: string) => {
        const state = get();
        // SECURITY: This function should be used with filtered events only
        // The component should verify user has access to the event before calling this
        return state.budgets.find(b => b.eventId === eventId) || null;
      },

      setCurrentBudget: (budget: Budget | null) => {
        set({ currentBudget: budget });
      },

      addVendor: async (budgetId: string, vendorData: Omit<Vendor, 'id' | 'eventId' | 'remaining' | 'createdAt' | 'updatedAt'>) => {
        set({ isLoading: true, error: null });
        try {
          const newVendor: Vendor = {
            ...vendorData,
            id: generateId(),
            eventId: get().budgets.find(b => b.id === budgetId)?.eventId || '',
            remaining: vendorData.budget - vendorData.paid,
            createdAt: new Date(),
            updatedAt: new Date(),
          };

          set(state => {
            const updatedBudgets = state.budgets.map(budget => {
              if (budget.id === budgetId) {
                const updated = {
                  ...budget,
                  vendors: [...budget.vendors, newVendor],
                  allocated: budget.allocated + newVendor.budget,
                  remaining: budget.totalBudget - budget.spent - (budget.allocated + newVendor.budget),
                  updatedAt: new Date(),
                };
                return updated;
              }
              return budget;
            });

            const updatedBudget = updatedBudgets.find(b => b.id === budgetId);
            return {
              budgets: updatedBudgets,
              currentBudget: updatedBudget || state.currentBudget,
              isLoading: false,
            };
          });
        } catch (error) {
          set({ error: 'שגיאה בהוספת ספק', isLoading: false });
        }
      },

      updateVendor: async (budgetId: string, vendorId: string, updates: Partial<Vendor>) => {
        set({ isLoading: true, error: null });
        try {
          set(state => {
            const updatedBudgets = state.budgets.map(budget => {
              if (budget.id === budgetId) {
                const vendorIndex = budget.vendors.findIndex(v => v.id === vendorId);
                if (vendorIndex === -1) return budget;

                const oldVendor = budget.vendors[vendorIndex];
                const updatedVendor = {
                  ...oldVendor,
                  ...updates,
                  remaining: (updates.budget ?? oldVendor.budget) - (updates.paid ?? oldVendor.paid),
                  updatedAt: new Date(),
                };

                const newVendors = [...budget.vendors];
                newVendors[vendorIndex] = updatedVendor;

                // Recalculate allocated and spent
                const allocated = newVendors.reduce((sum, v) => sum + v.budget, 0);
                const spent = newVendors.reduce((sum, v) => sum + v.paid, 0);

                return {
                  ...budget,
                  vendors: newVendors,
                  allocated,
                  spent,
                  remaining: budget.totalBudget - spent,
                  updatedAt: new Date(),
                };
              }
              return budget;
            });

            const updatedBudget = updatedBudgets.find(b => b.id === budgetId);
            return {
              budgets: updatedBudgets,
              currentBudget: updatedBudget || state.currentBudget,
              isLoading: false,
            };
          });
        } catch (error) {
          set({ error: 'שגיאה בעדכון ספק', isLoading: false });
        }
      },

      deleteVendor: async (budgetId: string, vendorId: string) => {
        set({ isLoading: true, error: null });
        try {
          set(state => {
            const updatedBudgets = state.budgets.map(budget => {
              if (budget.id === budgetId) {
                const vendor = budget.vendors.find(v => v.id === vendorId);
                if (!vendor) return budget;

                const newVendors = budget.vendors.filter(v => v.id !== vendorId);
                const allocated = newVendors.reduce((sum, v) => sum + v.budget, 0);
                const spent = newVendors.reduce((sum, v) => sum + v.paid, 0);

                return {
                  ...budget,
                  vendors: newVendors,
                  allocated,
                  spent,
                  remaining: budget.totalBudget - spent,
                  updatedAt: new Date(),
                };
              }
              return budget;
            });

            const updatedBudget = updatedBudgets.find(b => b.id === budgetId);
            return {
              budgets: updatedBudgets,
              currentBudget: updatedBudget || state.currentBudget,
              isLoading: false,
            };
          });
        } catch (error) {
          set({ error: 'שגיאה במחיקת ספק', isLoading: false });
        }
      },

      addPayment: async (budgetId: string, vendorId: string, amount: number, notes?: string) => {
        set({ isLoading: true, error: null });
        try {
          set(state => {
            const updatedBudgets = state.budgets.map(budget => {
              if (budget.id === budgetId) {
                const vendorIndex = budget.vendors.findIndex(v => v.id === vendorId);
                if (vendorIndex === -1) return budget;

                const vendor = budget.vendors[vendorIndex];
                const updatedVendor = {
                  ...vendor,
                  paid: vendor.paid + amount,
                  remaining: vendor.budget - (vendor.paid + amount),
                  updatedAt: new Date(),
                };

                const newVendors = [...budget.vendors];
                newVendors[vendorIndex] = updatedVendor;

                const spent = newVendors.reduce((sum, v) => sum + v.paid, 0);

                return {
                  ...budget,
                  vendors: newVendors,
                  spent,
                  remaining: budget.totalBudget - spent,
                  updatedAt: new Date(),
                };
              }
              return budget;
            });

            const updatedBudget = updatedBudgets.find(b => b.id === budgetId);
            return {
              budgets: updatedBudgets,
              currentBudget: updatedBudget || state.currentBudget,
              isLoading: false,
            };
          });
        } catch (error) {
          set({ error: 'שגיאה בהוספת תשלום', isLoading: false });
        }
      },

      addPaymentSchedule: async (budgetId: string, vendorId: string, payment: Omit<PaymentSchedule, 'id'>) => {
        set({ isLoading: true, error: null });
        try {
          set(state => {
            const updatedBudgets = state.budgets.map(budget => {
              if (budget.id === budgetId) {
                const vendorIndex = budget.vendors.findIndex(v => v.id === vendorId);
                if (vendorIndex === -1) return budget;

                const vendor = budget.vendors[vendorIndex];
                const newPayment: PaymentSchedule = {
                  ...payment,
                  id: generateId(),
                };

                const paymentSchedule = vendor.paymentSchedule || [];
                const updatedVendor = {
                  ...vendor,
                  paymentSchedule: [...paymentSchedule, newPayment],
                  updatedAt: new Date(),
                };

                const newVendors = [...budget.vendors];
                newVendors[vendorIndex] = updatedVendor;

                return {
                  ...budget,
                  vendors: newVendors,
                  updatedAt: new Date(),
                };
              }
              return budget;
            });

            const updatedBudget = updatedBudgets.find(b => b.id === budgetId);
            return {
              budgets: updatedBudgets,
              currentBudget: updatedBudget || state.currentBudget,
              isLoading: false,
            };
          });
        } catch (error) {
          set({ error: 'שגיאה בהוספת לוח תשלומים', isLoading: false });
        }
      },

      markPaymentAsPaid: async (budgetId: string, vendorId: string, paymentId: string, paidDate?: Date) => {
        set({ isLoading: true, error: null });
        try {
          set(state => {
            const updatedBudgets = state.budgets.map(budget => {
              if (budget.id === budgetId) {
                const vendorIndex = budget.vendors.findIndex(v => v.id === vendorId);
                if (vendorIndex === -1) return budget;

                const vendor = budget.vendors[vendorIndex];
                const paymentSchedule = vendor.paymentSchedule || [];
                const paymentIndex = paymentSchedule.findIndex(p => p.id === paymentId);
                if (paymentIndex === -1) return budget;

                const payment = paymentSchedule[paymentIndex];
                const updatedPayment = {
                  ...payment,
                  paid: true,
                  paidDate: paidDate || new Date(),
                };

                const newPaymentSchedule = [...paymentSchedule];
                newPaymentSchedule[paymentIndex] = updatedPayment;

                // Update vendor paid amount
                const paidAmount = newPaymentSchedule
                  .filter(p => p.paid)
                  .reduce((sum, p) => sum + p.amount, 0);

                const updatedVendor = {
                  ...vendor,
                  paymentSchedule: newPaymentSchedule,
                  paid: paidAmount,
                  remaining: vendor.budget - paidAmount,
                  updatedAt: new Date(),
                };

                const newVendors = [...budget.vendors];
                newVendors[vendorIndex] = updatedVendor;

                const spent = newVendors.reduce((sum, v) => sum + v.paid, 0);

                return {
                  ...budget,
                  vendors: newVendors,
                  spent,
                  remaining: budget.totalBudget - spent,
                  updatedAt: new Date(),
                };
              }
              return budget;
            });

            const updatedBudget = updatedBudgets.find(b => b.id === budgetId);
            return {
              budgets: updatedBudgets,
              currentBudget: updatedBudget || state.currentBudget,
              isLoading: false,
            };
          });
        } catch (error) {
          set({ error: 'שגיאה בעדכון תשלום', isLoading: false });
        }
      },

      deletePaymentSchedule: async (budgetId: string, vendorId: string, paymentId: string) => {
        set({ isLoading: true, error: null });
        try {
          set(state => {
            const updatedBudgets = state.budgets.map(budget => {
              if (budget.id === budgetId) {
                const vendorIndex = budget.vendors.findIndex(v => v.id === vendorId);
                if (vendorIndex === -1) return budget;

                const vendor = budget.vendors[vendorIndex];
                const paymentSchedule = vendor.paymentSchedule || [];
                const payment = paymentSchedule.find(p => p.id === paymentId);
                if (!payment) return budget;

                const newPaymentSchedule = paymentSchedule.filter(p => p.id !== paymentId);

                // Recalculate paid amount if payment was already paid
                const paidAmount = newPaymentSchedule
                  .filter(p => p.paid)
                  .reduce((sum, p) => sum + p.amount, 0);

                const updatedVendor = {
                  ...vendor,
                  paymentSchedule: newPaymentSchedule,
                  paid: paidAmount,
                  remaining: vendor.budget - paidAmount,
                  updatedAt: new Date(),
                };

                const newVendors = [...budget.vendors];
                newVendors[vendorIndex] = updatedVendor;

                const spent = newVendors.reduce((sum, v) => sum + v.paid, 0);

                return {
                  ...budget,
                  vendors: newVendors,
                  spent,
                  remaining: budget.totalBudget - spent,
                  updatedAt: new Date(),
                };
              }
              return budget;
            });

            const updatedBudget = updatedBudgets.find(b => b.id === budgetId);
            return {
              budgets: updatedBudgets,
              currentBudget: updatedBudget || state.currentBudget,
              isLoading: false,
            };
          });
        } catch (error) {
          set({ error: 'שגיאה במחיקת תשלום', isLoading: false });
        }
      },

      calculateBudgetStats: (budgetId: string) => {
        const state = get();
        const budget = state.budgets.find(b => b.id === budgetId);
        if (!budget) {
          return {
            totalBudget: 0,
            allocated: 0,
            spent: 0,
            remaining: 0,
            percentageSpent: 0,
            percentageAllocated: 0,
          };
        }

        const percentageSpent = budget.totalBudget > 0 
          ? (budget.spent / budget.totalBudget) * 100 
          : 0;
        const percentageAllocated = budget.totalBudget > 0 
          ? (budget.allocated / budget.totalBudget) * 100 
          : 0;

        return {
          totalBudget: budget.totalBudget,
          allocated: budget.allocated,
          spent: budget.spent,
          remaining: budget.remaining,
          percentageSpent,
          percentageAllocated,
        };
      },
    }),
    {
      name: 'rsvp-budget-storage',
    }
  )
);


