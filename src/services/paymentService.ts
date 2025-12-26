const BACKEND_URL = (process.env as any).NEXT_PUBLIC_BACKEND_URL || (process.env as any).VITE_BACKEND_URL || 'http://localhost:3002';

export interface PaymentIntentResponse {
  clientSecret: string;
  paymentIntentId: string;
}

export interface Transaction {
  id: string;
  userId: string;
  amount: number;
  credits: number;
  status: 'pending' | 'success' | 'failed';
  stripePaymentId?: string;
  createdAt: Date;
}

class PaymentService {
  async createPaymentIntent(amount: number, credits: number, userId: string): Promise<PaymentIntentResponse> {
    try {
      const response = await fetch(`${BACKEND_URL}/api/payments/create-intent`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          amount,
          credits,
          userId,
          currency: 'ils',
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'שגיאה ביצירת תשלום');
      }

      const data = await response.json();
      return data;
    } catch (error: any) {
      console.error('❌ Error creating payment intent:', error);
      throw new Error(error.message || 'שגיאה ביצירת תשלום');
    }
  }

  async getTransactions(userId: string): Promise<Transaction[]> {
    try {
      const response = await fetch(`${BACKEND_URL}/api/payments/transactions/${userId}`, {
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

  async getAllTransactions(): Promise<Transaction[]> {
    try {
      const response = await fetch(`${BACKEND_URL}/api/payments/transactions`, {
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

export const paymentService = new PaymentService();

