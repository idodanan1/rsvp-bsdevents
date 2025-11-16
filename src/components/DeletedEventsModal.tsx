import React, { useState } from 'react';
import { X, RotateCcw, Trash2, Calendar, Users } from 'lucide-react';
import { Event } from '../types';
import { formatDate } from '../utils/helpers';

interface DeletedEventsModalProps {
  isOpen: boolean;
  onClose: () => void;
  deletedEvents: (Event & { deletedAt: Date })[];
  onRestoreEvent: (eventId: string) => Promise<boolean>;
  onPermanentlyDeleteEvent: (eventId: string) => Promise<boolean>;
}

const DeletedEventsModal: React.FC<DeletedEventsModalProps> = ({
  isOpen,
  onClose,
  deletedEvents,
  onRestoreEvent,
  onPermanentlyDeleteEvent
}) => {
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  if (!isOpen) return null;

  const handleRestoreEvent = async (eventId: string) => {
    setIsLoading(true);
    try {
      const success = await onRestoreEvent(eventId);
      if (success) {
        alert('✅ האירוע שוחזר בהצלחה!');
        onClose();
      } else {
        alert('❌ שגיאה בשחזור האירוע');
      }
    } catch (error) {
      console.error('Error restoring event:', error);
      alert('❌ שגיאה בשחזור האירוע');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePermanentlyDeleteEvent = async (eventId: string) => {
    const confirmed = window.confirm(
      'האם אתה בטוח שברצונך למחוק את האירוע לצמיתות?\n\nפעולה זו לא ניתנת לביטול!'
    );
    
    if (confirmed) {
      setIsLoading(true);
      try {
        const success = await onPermanentlyDeleteEvent(eventId);
        if (success) {
          alert('✅ האירוע נמחק לצמיתות');
        } else {
          alert('❌ שגיאה במחיקה סופית של האירוע');
        }
      } catch (error) {
        console.error('Error permanently deleting event:', error);
        alert('❌ שגיאה במחיקה סופית של האירוע');
      } finally {
        setIsLoading(false);
      }
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-2xl font-bold text-gray-900">אירועים שנמחקו</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
          {deletedEvents.length === 0 ? (
            <div className="text-center py-12">
              <Trash2 className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-xl font-medium text-gray-900 mb-2">אין אירועים שנמחקו</h3>
              <p className="text-gray-600">כל האירועים שלך פעילים</p>
            </div>
          ) : (
            <div className="space-y-4">
              {deletedEvents.map((event) => (
                <div
                  key={event.id}
                  className={`border rounded-lg p-4 transition-colors ${
                    selectedEventId === event.id
                      ? 'border-teal-500 bg-teal-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <h3 className="text-lg font-semibold text-gray-900">
                          {event.coupleName}
                        </h3>
                        <span className="text-sm text-gray-500">
                          נמחק ב-{formatDate(event.deletedAt)}
                        </span>
                      </div>
                      
                      <div className="flex items-center space-x-4 text-sm text-gray-600 mb-3">
                        <div className="flex items-center space-x-1">
                          <Calendar className="w-4 h-4" />
                          <span>{formatDate(event.eventDate)} - {event.eventTime}</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <Users className="w-4 h-4" />
                          <span>{event.guests.length} מוזמנים</span>
                        </div>
                      </div>

                      <div className="text-sm text-gray-600">
                        <p><strong>מיקום:</strong> {event.venue}</p>
                        <p><strong>סוג אירוע:</strong> {event.eventTypeHebrew}</p>
                        {event.guests.length > 0 && (
                          <p><strong>סטטוס תגובות:</strong> 
                            {event.guests.filter(g => g.rsvpStatus === 'confirmed').length} מגיעים, 
                            {event.guests.filter(g => g.rsvpStatus === 'declined').length} לא מגיעים, 
                            {event.guests.filter(g => g.rsvpStatus === 'pending').length} לא ענו
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-col space-y-2 ml-4">
                      <button
                        onClick={() => handleRestoreEvent(event.id)}
                        disabled={isLoading}
                        className="btn-primary flex items-center space-x-2 px-4 py-2 text-sm"
                      >
                        <RotateCcw className="w-4 h-4" />
                        <span>שחזר</span>
                      </button>
                      
                      <button
                        onClick={() => handlePermanentlyDeleteEvent(event.id)}
                        disabled={isLoading}
                        className="btn-danger flex items-center space-x-2 px-4 py-2 text-sm"
                      >
                        <Trash2 className="w-4 h-4" />
                        <span>מחק לצמיתות</span>
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end space-x-3 p-6 border-t border-gray-200">
          <button
            onClick={onClose}
            className="btn-secondary px-6 py-2"
          >
            סגור
          </button>
        </div>
      </div>
    </div>
  );
};

export default DeletedEventsModal;

