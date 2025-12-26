const BACKEND_URL = (process.env as any).NEXT_PUBLIC_BACKEND_URL || (process.env as any).VITE_BACKEND_URL || 'http://localhost:3002';

export interface GrowPaymentRequest {
  amount: number;
  credits: number;
  userId: string;
  currency?: string;
  customerName?: string;
  customerEmail?: string;
  customerPhone?: string;
}

export interface GrowPaymentResponse {
  success: boolean;
  paymentUrl?: string;
  transactionId?: string;
  error?: string;
}

export interface Transaction {
  id: string;
  userId: string;
  amount: number;
  credits: number;
  status: 'pending' | 'success' | 'failed';
  growTransactionId?: string;
  stripePaymentId?: string;
  createdAt: Date;
}

class GrowService {
  /**
   * יוצר תשלום חדש דרך Grow
   */
  async createPayment(request: GrowPaymentRequest): Promise<GrowPaymentResponse> {
    try {
      const response = await fetch(`${BACKEND_URL}/api/payments/grow/create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          amount: request.amount,
          credits: request.credits,
          userId: request.userId,
          currency: request.currency || 'ILS',
          customerName: request.customerName,
          customerEmail: request.customerEmail,
          customerPhone: request.customerPhone,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'שגיאה ביצירת תשלום');
      }

      const data = await response.json();
      return data;
    } catch (error: any) {
      console.error('❌ Error creating Grow payment:', error);
      throw new Error(error.message || 'שגיאה ביצירת תשלום');
    }
  }

  /**
   * בודק סטטוס תשלום
   */
  async checkPaymentStatus(transactionId: string): Promise<Transaction> {
    try {
      const response = await fetch(`${BACKEND_URL}/api/payments/grow/status/${transactionId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'שגיאה בבדיקת סטטוס תשלום');
      }

      const data = await response.json();
      return data.transaction;
    } catch (error: any) {
      console.error('❌ Error checking payment status:', error);
      throw new Error(error.message || 'שגיאה בבדיקת סטטוס תשלום');
    }
  }

  /**
   * מקבל היסטוריית תשלומים של משתמש
   */
  async getTransactions(userId: string): Promise<Transaction[]> {
    try {
      const response = await fetch(`${BACKEND_URL}/api/payments/grow/transactions/${userId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        return [];
      }

      const data = await response.json();
      return data.transactions || [];
    } catch (error: any) {
      console.error('❌ Error fetching transactions:', error);
      return [];
    }
  }

  /**
   * מקבל את כל התשלומים (למנהל)
   */
  async getAllTransactions(): Promise<Transaction[]> {
    try {
      const response = await fetch(`${BACKEND_URL}/api/payments/grow/transactions`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        if (response.status === 404) {
          console.warn('⚠️ Backend לא זמין או endpoint לא קיים - מחזיר רשימה ריקה');
          return [];
        }
        return [];
      }

      const data = await response.json();
      return data?.transactions || [];
    } catch (error: any) {
      console.warn('⚠️ Backend לא זמין או endpoint לא קיים - מחזיר רשימה ריקה');
      console.error('❌ Error fetching all transactions:', error);
      return [];
    }
  }
}

export const growService = new GrowService();

