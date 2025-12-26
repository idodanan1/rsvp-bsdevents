import { Reminder } from '../types';
import type { Client } from '../types/index';

export interface ReminderNotification {
  id: string;
  reminderId: string;
  clientId: string;
  type: 'email' | 'browser' | 'whatsapp' | 'sms';
  sentAt: Date;
  status: 'sent' | 'delivered' | 'failed';
  error?: string;
}

export interface ReminderTemplate {
  id: string;
  name: string;
  type: Reminder['type'];
  subject?: string;
  message: string;
  isDefault: boolean;
  createdAt: Date;
}

class ReminderService {
  private notifications: ReminderNotification[] = [];
  private templates: ReminderTemplate[] = [];

  constructor() {
    this.initializeDefaultTemplates();
    this.startReminderChecker();
  }

  private initializeDefaultTemplates() {
    this.templates = [
      {
        id: 'call-template',
        name: 'תזכורת שיחה',
        type: 'call',
        subject: 'תזכורת - שיחה עם לקוח',
        message: 'שלום! זה הזמן ליצור קשר עם {{client_name}} בנושא {{event_name}}',
        isDefault: true,
        createdAt: new Date()
      },
      {
        id: 'email-template',
        name: 'תזכורת אימייל',
        type: 'email',
        subject: 'תזכורת - {{event_name}}',
        message: 'שלום! זה הזמן לשלוח אימייל ל{{client_name}} בנושא {{event_name}}',
        isDefault: true,
        createdAt: new Date()
      },
      {
        id: 'whatsapp-template',
        name: 'תזכורת WhatsApp',
        type: 'whatsapp' as any,
        message: 'שלום! זה הזמן ליצור קשר עם {{client_name}} בנושא {{event_name}}',
        isDefault: true,
        createdAt: new Date()
      },
      {
        id: 'meeting-template',
        name: 'תזכורת פגישה',
        type: 'meeting',
        subject: 'תזכורת - פגישה עם {{client_name}}',
        message: 'שלום! יש לך פגישה מתוכננת עם {{client_name}} בנושא {{event_name}}',
        isDefault: true,
        createdAt: new Date()
      },
      {
        id: 'follow-up-template',
        name: 'תזכורת מעקב',
        type: 'follow-up',
        subject: 'תזכורת - מעקב אחר {{event_name}}',
        message: 'שלום! זה הזמן לעשות מעקב אחר {{event_name}} עם {{client_name}}',
        isDefault: true,
        createdAt: new Date()
      }
    ];
  }

  private startReminderChecker() {
    // Check for reminders every minute
    setInterval(() => {
      this.checkOverdueReminders();
    }, 60000);

    // Check for upcoming reminders every 5 minutes
    setInterval(() => {
      this.checkUpcomingReminders();
    }, 300000);
  }

  private checkOverdueReminders() {
    // This would typically check the database for overdue reminders
    // For now, we'll just log that we're checking
    console.log('🔍 Checking for overdue reminders...');
  }

  private checkUpcomingReminders() {
    // This would typically check the database for upcoming reminders
    // For now, we'll just log that we're checking
    console.log('🔍 Checking for upcoming reminders...');
  }

  // Get all reminder templates
  getTemplates(): ReminderTemplate[] {
    return this.templates;
  }

  // Get template by type
  getTemplateByType(type: Reminder['type']): ReminderTemplate | undefined {
    return this.templates.find(template => template.type === type);
  }

  // Create a new template
  createTemplate(template: Omit<ReminderTemplate, 'id' | 'createdAt'>): ReminderTemplate {
    const newTemplate: ReminderTemplate = {
      ...template,
      id: `template-${Date.now()}`,
      createdAt: new Date()
    };
    
    this.templates.push(newTemplate);
    return newTemplate;
  }

  // Update a template
  updateTemplate(id: string, updates: Partial<ReminderTemplate>): boolean {
    const index = this.templates.findIndex(template => template.id === id);
    if (index !== -1) {
      this.templates[index] = { ...this.templates[index], ...updates };
      return true;
    }
    return false;
  }

  // Delete a template
  deleteTemplate(id: string): boolean {
    const index = this.templates.findIndex(template => template.id === id);
    if (index !== -1 && !this.templates[index].isDefault) {
      this.templates.splice(index, 1);
      return true;
    }
    return false;
  }

  // Generate reminder message from template
  generateReminderMessage(
    template: ReminderTemplate, 
    client: Client, 
    eventName?: string,
    customMessage?: string
  ): string {
    let message = customMessage || template.message;
    
    // Replace template variables
    message = message.replace(/\{\{client_name\}\}/g, `${client.firstName} ${client.lastName}`);
    message = message.replace(/\{\{event_name\}\}/g, eventName || 'האירוע');
    message = message.replace(/\{\{client_phone\}\}/g, client.phoneNumber);
    message = message.replace(/\{\{client_email\}\}/g, client.email || '');
    message = message.replace(/\{\{client_company\}\}/g, client.company || '');
    
    return message;
  }

  // Send reminder notification
  async sendReminderNotification(
    reminder: Reminder,
    client: Client,
    type: 'email' | 'browser' | 'whatsapp' | 'sms' = 'browser'
  ): Promise<ReminderNotification> {
    const notification: ReminderNotification = {
      id: `notification-${Date.now()}`,
      reminderId: reminder.id,
      clientId: client.id,
      type,
      sentAt: new Date(),
      status: 'sent'
    };

    try {
      // Simulate sending notification
      console.log(`📱 Sending ${type} notification for reminder:`, reminder.title);
      console.log(`👤 Client:`, `${client.firstName} ${client.lastName}`);
      
      // In a real implementation, this would:
      // - Send email via email service
      // - Send browser notification
      // - Send WhatsApp message
      // - Send SMS
      
      notification.status = 'delivered';
      this.notifications.push(notification);
      
      return notification;
    } catch (error) {
      notification.status = 'failed';
      notification.error = error instanceof Error ? error.message : 'Unknown error';
      this.notifications.push(notification);
      
      throw error;
    }
  }

  // Get notification history
  getNotifications(reminderId?: string): ReminderNotification[] {
    if (reminderId) {
      return this.notifications.filter(n => n.reminderId === reminderId);
    }
    return this.notifications;
  }

  // Get notification statistics
  getNotificationStats(): {
    total: number;
    sent: number;
    delivered: number;
    failed: number;
    byType: Record<string, number>;
  } {
    const total = this.notifications.length;
    const sent = this.notifications.filter(n => n.status === 'sent').length;
    const delivered = this.notifications.filter(n => n.status === 'delivered').length;
    const failed = this.notifications.filter(n => n.status === 'failed').length;
    
    const byType = this.notifications.reduce((acc, notification) => {
      acc[notification.type] = (acc[notification.type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return { total, sent, delivered, failed, byType };
  }

  // Schedule recurring reminder
  scheduleRecurringReminder(
    reminder: Reminder,
    interval: 'daily' | 'weekly' | 'monthly' | 'yearly',
    endDate?: Date
  ): void {
    if (!reminder.isRecurring) {
      console.warn('Cannot schedule non-recurring reminder');
      return;
    }

    const now = new Date();
    let nextDate = new Date(reminder.reminderDate);
    
    while (nextDate <= now) {
      switch (interval) {
        case 'daily':
          nextDate.setDate(nextDate.getDate() + 1);
          break;
        case 'weekly':
          nextDate.setDate(nextDate.getDate() + 7);
          break;
        case 'monthly':
          nextDate.setMonth(nextDate.getMonth() + 1);
          break;
        case 'yearly':
          nextDate.setFullYear(nextDate.getFullYear() + 1);
          break;
      }
    }

    if (!endDate || nextDate <= endDate) {
      console.log(`📅 Scheduling next recurring reminder for: ${nextDate.toISOString()}`);
      // In a real implementation, this would schedule the next occurrence
    }
  }

  // Get reminders due soon (within specified hours)
  getRemindersDueSoon(hours: number = 24): Reminder[] {
    const now = new Date();
    const futureTime = new Date(now.getTime() + hours * 60 * 60 * 1000);
    
    // This would typically query the database
    // For now, return empty array
    return [];
  }

  // Mark reminder as completed and handle recurring
  async completeReminder(reminder: Reminder): Promise<void> {
    console.log(`✅ Completing reminder: ${reminder.title}`);
    
    if (reminder.isRecurring && reminder.recurringInterval) {
      this.scheduleRecurringReminder(reminder, reminder.recurringInterval, reminder.recurringEndDate);
    }
  }

  // Export reminders to CSV
  exportRemindersToCSV(reminders: Reminder[]): string {
    const headers = [
      'ID',
      'Client ID',
      'Title',
      'Description',
      'Reminder Date',
      'Type',
      'Status',
      'Priority',
      'Is Recurring',
      'Created At'
    ];

    const rows = reminders.map(reminder => [
      reminder.id,
      reminder.clientId,
      reminder.title,
      reminder.description || '',
      reminder.reminderDate.toISOString(),
      reminder.type,
      reminder.status,
      reminder.priority,
      reminder.isRecurring ? 'Yes' : 'No',
      reminder.createdAt.toISOString()
    ]);

    const csvContent = [headers, ...rows]
      .map(row => row.map(field => `"${field}"`).join(','))
      .join('\n');

    return csvContent;
  }

  // Import reminders from CSV
  importRemindersFromCSV(csvContent: string): Reminder[] {
    const lines = csvContent.split('\n');
    const headers = lines[0].split(',').map(h => h.replace(/"/g, ''));
    const reminders: Reminder[] = [];

    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map(v => v.replace(/"/g, ''));
      if (values.length === headers.length) {
        const reminder: Reminder = {
          id: values[0] || `imported-${Date.now()}-${i}`,
          clientId: values[1],
          eventId: values[2] || undefined,
          title: values[3],
          description: values[4] || undefined,
          reminderDate: new Date(values[5]),
          reminderTime: values[6] || undefined,
          type: values[7] as Reminder['type'],
          status: values[8] as Reminder['status'],
          priority: values[9] as Reminder['priority'],
          isRecurring: values[10] === 'Yes',
          recurringInterval: values[11] as Reminder['recurringInterval'] || undefined,
          recurringEndDate: values[12] ? new Date(values[12]) : undefined,
          completedAt: values[13] ? new Date(values[13]) : undefined,
          completedBy: values[14] || undefined,
          notes: values[15] || undefined,
          createdAt: new Date(values[16] || Date.now()),
          updatedAt: new Date()
        };
        reminders.push(reminder);
      }
    }

    return reminders;
  }
}

export const reminderService = new ReminderService();
