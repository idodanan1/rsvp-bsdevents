import axios from 'axios';

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
      const response = await axios.post(`${BACKEND_URL}/api/payments/create-intent`, {
        amount,
        credits,
        userId,
        currency: 'ils',
      });

      return response.data;
    } catch (error: any) {
      console.error('❌ Error creating payment intent:', error);
      throw new Error(error.response?.data?.error || 'שגיאה ביצירת תשלום');
    }
  }

  async getTransactions(userId: string): Promise<Transaction[]> {
    try {
      const response = await axios.get(`${BACKEND_URL}/api/payments/transactions/${userId}`);
      return response.data.transactions || [];
    } catch (error: any) {
      console.error('❌ Error fetching transactions:', error);
      return [];
    }
  }

  async getAllTransactions(): Promise<Transaction[]> {
    try {
      const response = await axios.get(`${BACKEND_URL}/api/payments/transactions`);
      return response.data?.transactions || [];
    } catch (error: any) {
      // אם השרת לא רץ או אין endpoint, החזר רשימה ריקה
      if (error.code === 'ERR_NETWORK' || error.response?.status === 404) {
        console.warn('⚠️ Backend לא זמין או endpoint לא קיים - מחזיר רשימה ריקה');
        return [];
      }
      console.error('❌ Error fetching all transactions:', error);
      return [];
    }
  }
}

export const paymentService = new PaymentService();

