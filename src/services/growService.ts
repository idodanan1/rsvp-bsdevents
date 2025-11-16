import axios from 'axios';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3002';

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
  createdAt: Date;
}

class GrowService {
  /**
   * יוצר תשלום חדש דרך Grow
   */
  async createPayment(request: GrowPaymentRequest): Promise<GrowPaymentResponse> {
    try {
      const response = await axios.post(`${BACKEND_URL}/api/payments/grow/create`, {
        amount: request.amount,
        credits: request.credits,
        userId: request.userId,
        currency: request.currency || 'ILS',
        customerName: request.customerName,
        customerEmail: request.customerEmail,
        customerPhone: request.customerPhone,
      });

      return response.data;
    } catch (error: any) {
      console.error('❌ Error creating Grow payment:', error);
      throw new Error(error.response?.data?.error || 'שגיאה ביצירת תשלום');
    }
  }

  /**
   * בודק סטטוס תשלום
   */
  async checkPaymentStatus(transactionId: string): Promise<Transaction> {
    try {
      const response = await axios.get(`${BACKEND_URL}/api/payments/grow/status/${transactionId}`);
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
      const response = await axios.get(`${BACKEND_URL}/api/payments/grow/transactions/${userId}`);
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
      const response = await axios.get(`${BACKEND_URL}/api/payments/grow/transactions`);
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

export const growService = new GrowService();

