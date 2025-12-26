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
      const response = await fetch(`${BACKEND_URL}/api/invoices/morning/create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          customerName: request.customerName,
          customerEmail: request.customerEmail,
          customerPhone: request.customerPhone,
          customerId: request.customerId,
          amount: request.amount,
          description: request.description,
          transactionId: request.transactionId,
          userId: request.userId,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'שגיאה ביצירת חשבונית');
      }

      const data = await response.json();
      return data;
    } catch (error: any) {
      console.error('❌ Error creating Morning invoice:', error);
      throw new Error(error.message || 'שגיאה ביצירת חשבונית');
    }
  }

  /**
   * מקבל חשבונית לפי ID
   */
  async getInvoice(invoiceId: string): Promise<MorningInvoiceResponse> {
    try {
      const response = await fetch(`${BACKEND_URL}/api/invoices/morning/${invoiceId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'שגיאה בקבלת חשבונית');
      }

      const data = await response.json();
      return data;
    } catch (error: any) {
      console.error('❌ Error fetching invoice:', error);
      throw new Error(error.message || 'שגיאה בקבלת חשבונית');
    }
  }
}

export const morningInvoiceService = new MorningInvoiceService();

