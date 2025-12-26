import axios from 'axios';

const BACKEND_URL = (process.env as any).NEXT_PUBLIC_BACKEND_URL || (process.env as any).VITE_BACKEND_URL || 'http://localhost:3002';

export interface MorningInvoiceRequest {
  customerName: string;
  customerEmail?: string;
  customerPhone?: string;
  customerId?: string; // תעודת זהות / ח.פ.
  amount: number;
  description: string;
  transactionId: string;
  userId: string;
}

export interface MorningInvoiceResponse {
  success: boolean;
  invoiceId?: string;
  invoiceUrl?: string;
  error?: string;
}

class MorningInvoiceService {
  /**
   * יוצר חשבונית חדשה במורנינג
   */
  async createInvoice(request: MorningInvoiceRequest): Promise<MorningInvoiceResponse> {
    try {
      const response = await axios.post(`${BACKEND_URL}/api/invoices/morning/create`, {
        customerName: request.customerName,
        customerEmail: request.customerEmail,
        customerPhone: request.customerPhone,
        customerId: request.customerId,
        amount: request.amount,
        description: request.description,
        transactionId: request.transactionId,
        userId: request.userId,
      });

      return response.data;
    } catch (error: any) {
      console.error('❌ Error creating Morning invoice:', error);
      throw new Error(error.response?.data?.error || 'שגיאה ביצירת חשבונית');
    }
  }

  /**
   * מקבל חשבונית לפי ID
   */
  async getInvoice(invoiceId: string): Promise<MorningInvoiceResponse> {
    try {
      const response = await axios.get(`${BACKEND_URL}/api/invoices/morning/${invoiceId}`);
      return response.data;
    } catch (error: any) {
      console.error('❌ Error fetching invoice:', error);
      throw new Error(error.response?.data?.error || 'שגיאה בקבלת חשבונית');
    }
  }
}

export const morningInvoiceService = new MorningInvoiceService();

