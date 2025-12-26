import React, { useState } from 'react';
import { X, Bell, Calendar, Clock, AlertCircle, User, FileText } from 'lucide-react';
import { useClientStore } from '../store/clientStore';
import { Reminder } from '../types';
import { formatFullName } from '../utils/helpers';

interface AddReminderModalProps {
  isOpen: boolean;
  onClose: () => void;
  clientId?: string;
}

const AddReminderModal: React.FC<AddReminderModalProps> = ({ isOpen, onClose, clientId }) => {
  const { createReminder, clients } = useClientStore();
  const [formData, setFormData] = useState({
    clientId: clientId || '',
    eventId: '',
    title: '',
    description: '',
    reminderDate: '',
    reminderTime: '',
    type: 'call' as Reminder['type'],
    priority: 'medium' as Reminder['priority'],
    isRecurring: false,
    recurringInterval: 'weekly' as Reminder['recurringInterval'],
    recurringEndDate: '',
    notes: ''
  });
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const reminderData = {
        ...formData,
        reminderDate: new Date(formData.reminderDate),
        recurringEndDate: formData.recurringEndDate ? new Date(formData.recurringEndDate) : undefined,
        status: 'pending' as const
      };

      await createReminder(reminderData);
      setFormData({
        clientId: clientId || '',
        eventId: '',
        title: '',
        description: '',
        reminderDate: '',
        reminderTime: '',
        type: 'call',
        priority: 'medium',
        isRecurring: false,
        recurringInterval: 'weekly',
        recurringEndDate: '',
        notes: ''
      });
      onClose();
    } catch (error: any) {
      console.error('Error creating reminder:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const selectedClient = clients.find(c => c.id === formData.clientId);
  const clientEvents = selectedClient?.events || [];

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white rounded-lg shadow-xl max-w-lg w-full my-8 max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between p-6 border-b border-gray-200 flex-shrink-0">
          <h2 className="text-xl font-semibold text-gray-900">הוסף תזכורת חדשה</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto flex-1">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              לקוח *
            </label>
            <div className="relative">
              <User className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <select
                required
                value={formData.clientId}
                onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setFormData(prev => ({ ...prev, clientId: e.target.value }))}
                className="w-full pr-10 pl-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">בחר לקוח</option>
                {clients.map((client: any) => (
                  <option key={client.id} value={client.id}>
                    {formatFullName(client.firstName, client.lastName)}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {clientEvents.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                אירוע (אופציונלי)
              </label>
              <select
                value={formData.eventId}
                onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setFormData(prev => ({ ...prev, eventId: e.target.value }))}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">ללא אירוע ספציפי</option>
                {clientEvents.map((event: any) => (
                  <option key={event.id} value={event.id}>
                    {event.eventName} - {new Date(event.eventDate).toLocaleDateString('he-IL')}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              כותרת התזכורת *
            </label>
            <div className="relative">
              <Bell className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                required
                value={formData.title}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                className="w-full pr-10 pl-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="כותרת התזכורת"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              תיאור
            </label>
            <div className="relative">
              <FileText className="absolute right-3 top-3 text-gray-400 w-5 h-5" />
              <textarea
                value={formData.description}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                rows={3}
                className="w-full pr-10 pl-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="תיאור מפורט של התזכורת..."
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                תאריך *
              </label>
              <div className="relative">
                <Calendar className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="date"
                  required
                  value={formData.reminderDate}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData(prev => ({ ...prev, reminderDate: e.target.value }))}
                  className="w-full pr-10 pl-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                שעה
              </label>
              <div className="relative">
                <Clock className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="time"
                  value={formData.reminderTime}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData(prev => ({ ...prev, reminderTime: e.target.value }))}
                  className="w-full pr-10 pl-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                סוג התזכורת
              </label>
              <select
                value={formData.type}
                onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setFormData(prev => ({ ...prev, type: e.target.value as Reminder['type'] }))}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="call">שיחה</option>
                <option value="email">אימייל</option>
                <option value="whatsapp">WhatsApp</option>
                <option value="sms">SMS</option>
                <option value="meeting">פגישה</option>
                <option value="follow_up">מעקב</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                עדיפות
              </label>
              <div className="relative">
                <AlertCircle className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <select
                  value={formData.priority}
                  onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setFormData(prev => ({ ...prev, priority: e.target.value as Reminder['priority'] }))}
                  className="w-full pr-10 pl-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="low">נמוכה</option>
                  <option value="medium">בינונית</option>
                  <option value="high">גבוהה</option>
                  <option value="urgent">דחופה</option>
                </select>
              </div>
            </div>
          </div>

          <div className="flex items-center">
            <input
              type="checkbox"
              id="isRecurring"
              checked={formData.isRecurring}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData(prev => ({ ...prev, isRecurring: e.target.checked }))}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <label htmlFor="isRecurring" className="mr-2 block text-sm text-gray-900">
              תזכורת חוזרת
            </label>
          </div>

          {formData.isRecurring && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  תדירות
                </label>
                <select
                  value={formData.recurringInterval}
                  onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setFormData(prev => ({ ...prev, recurringInterval: e.target.value as Reminder['recurringInterval'] }))}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="daily">יומי</option>
                  <option value="weekly">שבועי</option>
                  <option value="monthly">חודשי</option>
                  <option value="yearly">שנתי</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  תאריך סיום
                </label>
                <input
                  type="date"
                  value={formData.recurringEndDate}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData(prev => ({ ...prev, recurringEndDate: e.target.value }))}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              הערות נוספות
            </label>
            <textarea
              value={formData.notes}
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
              rows={2}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="הערות נוספות..."
            />
          </div>

          <div className="flex justify-end space-x-3 space-x-reverse pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300"
            >
              ביטול
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {isLoading ? 'יוצר...' : 'צור תזכורת'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddReminderModal;


