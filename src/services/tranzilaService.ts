import axios from 'axios';

const BACKEND_URL = (process.env as any).NEXT_PUBLIC_BACKEND_URL || (process.env as any).VITE_BACKEND_URL || 'http://localhost:3002';

export interface TranzilaPaymentRequest {
  amount: number;
  credits: number;
  userId: string;
  currency?: string;
}

export interface TranzilaPaymentResponse {
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
  tranzilaTransactionId?: string;
  createdAt: Date;
}

class TranzilaService {
  /**
   * יוצר תשלום חדש דרך Tranzila
   */
  async createPayment(request: TranzilaPaymentRequest): Promise<TranzilaPaymentResponse> {
    try {
      const response = await axios.post(`${BACKEND_URL}/api/payments/tranzila/create`, {
        amount: request.amount,
        credits: request.credits,
        userId: request.userId,
        currency: request.currency || 'ILS',
      });

      return response.data;
    } catch (error: any) {
      console.error('❌ Error creating Tranzila payment:', error);
      throw new Error(error.response?.data?.error || 'שגיאה ביצירת תשלום');
    }
  }

  /**
   * בודק סטטוס תשלום
   */
  async checkPaymentStatus(transactionId: string): Promise<Transaction> {
    try {
      const response = await axios.get(`${BACKEND_URL}/api/payments/tranzila/status/${transactionId}`);
      return response.data.transaction;
    } catch (error: any) {
      console.error('❌ Error checking payment status:', error);
      throw new Error(error.response?.data?.error || 'שגיאה בבדיקת סטטוס תשלום');
    }
  }

  /**
   * מקבל היסטוריית תשלומים של משתמש
   */
  async getTransactions(userId: string): Promise<Transaction[]> {
    try {
      const response = await axios.get(`${BACKEND_URL}/api/payments/tranzila/transactions/${userId}`);
      return response.data.transactions || [];
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
      const response = await axios.get(`${BACKEND_URL}/api/payments/tranzila/transactions`);
      return response.data?.transactions || [];
    } catch (error: any) {
      if (error.code === 'ERR_NETWORK' || error.response?.status === 404) {
        console.warn('⚠️ Backend לא זמין או endpoint לא קיים - מחזיר רשימה ריקה');
        return [];
      }
      console.error('❌ Error fetching all transactions:', error);
      return [];
    }
  }
}

export const tranzilaService = new TranzilaService();

