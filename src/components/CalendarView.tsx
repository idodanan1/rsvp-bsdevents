import React, { useState } from 'react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths } from 'date-fns';
import { ChevronLeft, ChevronRight, Calendar, Users, MapPin, Plus, Edit, Trash2 } from 'lucide-react';
import { useEventStore } from '../store/eventStore';
import { useNavigate } from 'react-router-dom';
import { Event } from '../types';

// Hebrew month names
const hebrewMonths = [
  'ינואר', 'פברואר', 'מרץ', 'אפריל', 'מאי', 'יוני',
  'יולי', 'אוגוסט', 'ספטמבר', 'אוקטובר', 'נובמבר', 'דצמבר'
];

interface CalendarEvent {
  id: string;
  title: string;
  date: string;
  time: string;
  location: string;
  guestCount: number;
}

const CalendarView: React.FC = () => {
  const { events } = useEventStore();
  const navigate = useNavigate();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [showAddEventModal, setShowAddEventModal] = useState(false);
  const [selectedDayForEvent, setSelectedDayForEvent] = useState<Date | null>(null);
  const [showEditEventModal, setShowEditEventModal] = useState(false);
  const [selectedEventForEdit, setSelectedEventForEdit] = useState<CalendarEvent | null>(null);

  // קבלת אירועים לתאריך ספציפי
  const getEventsForDate = (date: Date): CalendarEvent[] => {
    return events.map((event: Event) => ({
      id: event.id,
      title: event.coupleName || (event.groomName && event.brideName ? `${event.groomName} & ${event.brideName}` : 'אירוע'),
      date: event.eventDate instanceof Date ? event.eventDate.toISOString() : new Date(event.eventDate).toISOString(),
      time: event.eventTime,
      location: event.venue,
      guestCount: event.guests?.length || 0
    })).filter((calEvent: CalendarEvent) => {
      const eventDate = new Date(calEvent.date);
      return isSameDay(eventDate, date);
    });
  };

  // קבלת אירועים לחודש הנוכחי
  const getEventsForMonth = (date: Date): CalendarEvent[] => {
    return events.map((event: Event) => ({
      id: event.id,
      title: event.coupleName || (event.groomName && event.brideName ? `${event.groomName} & ${event.brideName}` : 'אירוע'),
      date: event.eventDate instanceof Date ? event.eventDate.toISOString() : new Date(event.eventDate).toISOString(),
      time: event.eventTime,
      location: event.venue,
      guestCount: event.guests?.length || 0
    })).filter((calEvent: CalendarEvent) => {
      const eventDate = new Date(calEvent.date);
      return isSameMonth(eventDate, date);
    });
  };

  // יצירת לוח השנה
  const generateCalendar = () => {
    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(currentDate);
    const startDate = new Date(monthStart);
    startDate.setDate(startDate.getDate() - monthStart.getDay());
    
    const endDate = new Date(monthEnd);
    endDate.setDate(endDate.getDate() + (6 - monthEnd.getDay()));

    return eachDayOfInterval({ start: startDate, end: endDate });
  };

  const calendarDays = generateCalendar();
  const monthEvents = getEventsForMonth(currentDate);

  // ניווט בין חודשים
  const goToPreviousMonth = () => {
    setCurrentDate(subMonths(currentDate, 1));
  };

  const goToNextMonth = () => {
    setCurrentDate(addMonths(currentDate, 1));
  };

  // סגירת חלון האירועים
  const closeEventDetails = () => {
    setSelectedDate(null);
  };

  // פתיחת חלון הוספת אירוע
  const handleAddEvent = (date: Date) => {
    setSelectedDayForEvent(date);
    setShowAddEventModal(true);
  };

  // סגירת חלון הוספת אירוע
  const closeAddEventModal = () => {
    setShowAddEventModal(false);
    setSelectedDayForEvent(null);
  };

  // מעבר לדף יצירת אירוע עם תאריך מוכן
  const navigateToCreateEvent = () => {
    if (selectedDayForEvent) {
      const dateString = format(selectedDayForEvent, 'yyyy-MM-dd');
      navigate(`/create-event?date=${dateString}`);
    } else {
      navigate('/create-event');
    }
    closeAddEventModal();
  };

  // פתיחת חלון עריכת אירוע
  const handleEditEvent = (event: CalendarEvent) => {
    setSelectedEventForEdit(event);
    setShowEditEventModal(true);
  };

  // סגירת חלון עריכת אירוע
  const closeEditEventModal = () => {
    setShowEditEventModal(false);
    setSelectedEventForEdit(null);
  };

  // מעבר לדף עריכת אירוע
  const navigateToEditEvent = () => {
    if (selectedEventForEdit) {
      navigate(`/event/${selectedEventForEdit.id}/manage`);
    }
    closeEditEventModal();
  };

  // מחיקת אירוע
  const handleDeleteEvent = async (event: CalendarEvent) => {
    if (window.confirm(`האם אתה בטוח שברצונך למחוק את האירוע "${event.title}"?`)) {
      try {
        const { deleteEvent } = useEventStore.getState();
        await deleteEvent(event.id);
        alert('האירוע נמחק בהצלחה!');
      } catch (error) {
        console.error('Error deleting event:', error);
        alert('שגיאה במחיקת האירוע');
      }
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      {/* כותרת לוח השנה */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <Calendar className="h-8 w-8 text-blue-600" />
          <div>
            <h2 className="text-2xl font-bold text-gray-800">
              לוח שנה - אירועים
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              לחץ על + כדי להוסיף אירוע, על אירוע קיים כדי לראות פרטים, או על כפתורי העריכה
            </p>
          </div>
        </div>
        <div className="flex items-center space-x-4">
          <button
            onClick={() => handleAddEvent(new Date())}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center space-x-2 space-x-reverse"
          >
            <Plus className="w-4 h-4" />
            <span>אירוע חדש</span>
          </button>
          <div className="flex items-center space-x-2">
            <button
              onClick={goToPreviousMonth}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            >
              <ChevronRight className="h-5 w-5 text-gray-600" />
            </button>
            <h3 className="text-xl font-semibold text-gray-700 min-w-[200px] text-center">
              {hebrewMonths[currentDate.getMonth()]} {currentDate.getFullYear()}
            </h3>
            <button
              onClick={goToNextMonth}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            >
              <ChevronLeft className="h-5 w-5 text-gray-600" />
            </button>
          </div>
        </div>
      </div>

      {/* ימי השבוע */}
      <div className="grid grid-cols-7 gap-1 mb-2">
        {['א', 'ב', 'ג', 'ד', 'ה', 'ו', 'ש'].map((day, index) => (
          <div key={index} className="p-3 text-center font-semibold text-gray-600 bg-gray-50 rounded">
            {day}
          </div>
        ))}
      </div>

      {/* לוח השנה */}
      <div className="grid grid-cols-7 gap-1">
        {calendarDays.map((day, index) => {
          const dayEvents = getEventsForDate(day);
          const isCurrentMonth = isSameMonth(day, currentDate);
          const isToday = isSameDay(day, new Date());
          const isSelected = selectedDate && isSameDay(day, selectedDate);

          return (
            <div
              key={index}
              className={`
                min-h-[100px] p-2 border border-gray-200 rounded transition-all relative group
                ${isCurrentMonth ? 'bg-white' : 'bg-gray-50 text-gray-400'}
                ${isToday ? 'bg-blue-50 border-blue-300' : ''}
                ${isSelected ? 'bg-blue-100 border-blue-400' : ''}
                hover:bg-gray-50
              `}
            >
              <div className="flex flex-col h-full">
                <div className="flex items-center justify-between mb-1">
                  <div className={`
                    text-sm font-medium
                    ${isToday ? 'text-blue-600 font-bold' : ''}
                    ${!isCurrentMonth ? 'text-gray-400' : ''}
                  `}>
                    {format(day, 'd')}
                  </div>
                  {isCurrentMonth && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleAddEvent(day);
                      }}
                      className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-blue-100 rounded-full"
                      title="הוסף אירוע"
                    >
                      <Plus className="w-3 h-3 text-blue-600" />
                    </button>
                  )}
                </div>
                
                {/* אירועים ליום */}
                <div className="flex-1 space-y-1">
                  {dayEvents.slice(0, 2).map((event: CalendarEvent) => (
                    <div
                      key={event.id}
                      className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded group hover:bg-blue-200 transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <span 
                          className="flex-1 truncate cursor-pointer"
                          onClick={() => setSelectedDate(day)}
                        >
                          {event.title}
                        </span>
                        <div className="flex items-center space-x-1 space-x-reverse opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleEditEvent(event);
                            }}
                            className="p-1 hover:bg-blue-300 rounded"
                            title="ערוך אירוע"
                          >
                            <Edit className="w-3 h-3" />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteEvent(event);
                            }}
                            className="p-1 hover:bg-red-300 rounded"
                            title="מחק אירוע"
                          >
                            <Trash2 className="w-3 h-3 text-red-600" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                  {dayEvents.length > 2 && (
                    <div 
                      className="text-xs text-gray-500 cursor-pointer hover:text-gray-700"
                      onClick={() => setSelectedDate(day)}
                    >
                      +{dayEvents.length - 2} עוד
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* סטטיסטיקות החודש */}
      <div className="mt-6 p-4 bg-gray-50 rounded-lg">
        <h4 className="text-lg font-semibold text-gray-700 mb-3">סטטיסטיקות החודש</h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">{monthEvents.length}</div>
            <div className="text-sm text-gray-600">סה"כ אירועים</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">
              {monthEvents.reduce((sum, event) => sum + event.guestCount, 0)}
            </div>
            <div className="text-sm text-gray-600">סה"כ אורחים</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-purple-600">
              {Math.round(monthEvents.reduce((sum, event) => sum + event.guestCount, 0) / Math.max(monthEvents.length, 1))}
            </div>
            <div className="text-sm text-gray-600">ממוצע אורחים לאירוע</div>
          </div>
        </div>
      </div>

      {/* חלון פרטי אירועים */}
      {selectedDate && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[80vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold text-gray-800">
                  אירועים ליום {format(selectedDate, 'dd/MM/yyyy')}
                </h3>
                <button
                  onClick={closeEventDetails}
                  className="text-gray-500 hover:text-gray-700"
                >
                  ✕
                </button>
              </div>
              
              {getEventsForDate(selectedDate).length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  אין אירועים ביום זה
                </div>
              ) : (
                <div className="space-y-4">
                  {getEventsForDate(selectedDate).map((event: CalendarEvent) => (
                    <div key={event.id} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h4 className="text-lg font-semibold text-gray-800 mb-2">
                            {event.title}
                          </h4>
                          <div className="space-y-2">
                            <div className="flex items-center text-gray-600">
                              <Calendar className="h-4 w-4 mr-2" />
                              {event.time}
                            </div>
                            <div className="flex items-center text-gray-600">
                              <MapPin className="h-4 w-4 mr-2" />
                              {event.location}
                            </div>
                            <div className="flex items-center text-gray-600">
                              <Users className="h-4 w-4 mr-2" />
                              {event.guestCount} אורחים
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2 space-x-reverse">
                          <button
                            onClick={() => {
                              closeEventDetails();
                              handleEditEvent(event);
                            }}
                            className="p-2 text-blue-600 hover:bg-blue-100 rounded-lg transition-colors"
                            title="ערוך אירוע"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => {
                              closeEventDetails();
                              handleDeleteEvent(event);
                            }}
                            className="p-2 text-red-600 hover:bg-red-100 rounded-lg transition-colors"
                            title="מחק אירוע"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* חלון הוספת אירוע */}
      {showAddEventModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold text-gray-800">
                  הוסף אירוע חדש
                </h3>
                <button
                  onClick={closeAddEventModal}
                  className="text-gray-500 hover:text-gray-700"
                >
                  ✕
                </button>
              </div>
              
              <div className="mb-6">
                <p className="text-gray-600 mb-2">
                  תאריך נבחר: <span className="font-semibold">
                    {selectedDayForEvent && format(selectedDayForEvent, 'dd/MM/yyyy')}
                  </span>
                </p>
                <p className="text-sm text-gray-500">
                  האירוע ייווצר עם התאריך שנבחר בלוח השנה
                </p>
              </div>
              
              <div className="flex space-x-3 space-x-reverse">
                <button
                  onClick={closeAddEventModal}
                  className="flex-1 px-4 py-2 text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300"
                >
                  ביטול
                </button>
                <button
                  onClick={navigateToCreateEvent}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center justify-center space-x-2 space-x-reverse"
                >
                  <Plus className="w-4 h-4" />
                  <span>צור אירוע</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* חלון עריכת אירוע */}
      {showEditEventModal && selectedEventForEdit && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold text-gray-800">
                  ערוך אירוע
                </h3>
                <button
                  onClick={closeEditEventModal}
                  className="text-gray-500 hover:text-gray-700"
                >
                  ✕
                </button>
              </div>
              
              <div className="mb-6">
                <div className="bg-gray-50 rounded-lg p-4 mb-4">
                  <h4 className="font-semibold text-gray-800 mb-2">{selectedEventForEdit.title}</h4>
                  <div className="space-y-1 text-sm text-gray-600">
                    <div className="flex items-center">
                      <Calendar className="w-4 h-4 mr-2" />
                      {selectedEventForEdit.time}
                    </div>
                    <div className="flex items-center">
                      <MapPin className="w-4 h-4 mr-2" />
                      {selectedEventForEdit.location}
                    </div>
                    <div className="flex items-center">
                      <Users className="w-4 h-4 mr-2" />
                      {selectedEventForEdit.guestCount} אורחים
                    </div>
                  </div>
                </div>
                
                <p className="text-sm text-gray-600">
                  מה תרצה לעשות עם האירוע הזה?
                </p>
              </div>
              
              <div className="flex space-x-3 space-x-reverse">
                <button
                  onClick={closeEditEventModal}
                  className="flex-1 px-4 py-2 text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300"
                >
                  ביטול
                </button>
                <button
                  onClick={() => handleDeleteEvent(selectedEventForEdit)}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 flex items-center space-x-2 space-x-reverse"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>מחק</span>
                </button>
                <button
                  onClick={navigateToEditEvent}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center space-x-2 space-x-reverse"
                >
                  <Edit className="w-4 h-4" />
                  <span>ערוך</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CalendarView;
