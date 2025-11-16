import React, { useState } from 'react';
import { format, addDays, startOfWeek, endOfWeek, isSameDay, isToday, isPast } from 'date-fns';
import { ChevronLeft, ChevronRight, Calendar, Clock, MessageSquare, Phone } from 'lucide-react';

interface ScheduleCalendarProps {
  campaigns: any[];
  onCampaignClick: (campaign: any) => void;
  onDateClick: (date: Date) => void;
}

const ScheduleCalendar: React.FC<ScheduleCalendarProps> = ({ 
  campaigns, 
  onCampaignClick, 
  onDateClick 
}) => {
  const [currentDate, setCurrentDate] = useState(new Date());

  const startDate = startOfWeek(currentDate, { weekStartsOn: 0 });
  const endDate = endOfWeek(currentDate, { weekStartsOn: 0 });

  const weekDays = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת'];
  const days = [];

  for (let i = 0; i < 7; i++) {
    days.push(addDays(startDate, i));
  }

  const getCampaignsForDate = (date: Date) => {
    return campaigns.filter(campaign => {
      const campaignDate = new Date(campaign.scheduledDate);
      return isSameDay(campaignDate, date);
    });
  };

  const getChannelIcon = (channel: string) => {
    return channel === 'whatsapp' ? 
      <MessageSquare className="w-3 h-3 text-green-600" /> : 
      <Phone className="w-3 h-3 text-blue-600" />;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'scheduled': return 'bg-yellow-100 text-yellow-800';
      case 'sending': return 'bg-blue-100 text-blue-800';
      case 'sent': return 'bg-green-100 text-green-800';
      case 'failed': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const navigateWeek = (direction: 'prev' | 'next') => {
    setCurrentDate(prev => addDays(prev, direction === 'next' ? 7 : -7));
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
      {/* Calendar Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200">
        <div className="flex items-center space-x-4">
          <Calendar className="w-5 h-5 text-gray-600" />
          <h3 className="text-lg font-semibold text-gray-900">
            לוח זמנים - {format(currentDate, 'MMMM yyyy')}
          </h3>
        </div>
        
        <div className="flex items-center space-x-2">
          <button
            onClick={() => navigateWeek('prev')}
            className="p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
          
          <button
            onClick={goToToday}
            className="px-3 py-1 text-sm text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg"
          >
            היום
          </button>
          
          <button
            onClick={() => navigateWeek('next')}
            className="p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Week Days Header */}
      <div className="grid grid-cols-7 border-b border-gray-200">
        {weekDays.map((day, index) => (
          <div key={index} className="p-3 text-center text-sm font-medium text-gray-600 bg-gray-50">
            {day}
          </div>
        ))}
      </div>

      {/* Calendar Days */}
      <div className="grid grid-cols-7">
        {days.map((day, index) => {
          const dayCampaigns = getCampaignsForDate(day);
          const isCurrentDay = isToday(day);
          const isPastDay = isPast(day) && !isCurrentDay;

          return (
            <div
              key={index}
              className={`min-h-[120px] border-r border-b border-gray-200 p-2 ${
                isCurrentDay ? 'bg-blue-50' : isPastDay ? 'bg-gray-50' : 'bg-white'
              } hover:bg-gray-50 cursor-pointer`}
              onClick={() => onDateClick(day)}
            >
              <div className="flex items-center justify-between mb-2">
                <span className={`text-sm font-medium ${
                  isCurrentDay ? 'text-blue-600' : isPastDay ? 'text-gray-400' : 'text-gray-900'
                }`}>
                  {format(day, 'd')}
                </span>
                {isCurrentDay && (
                  <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
                )}
              </div>

              {/* Campaigns for this day */}
              <div className="space-y-1">
                {dayCampaigns.slice(0, 3).map((campaign) => (
                  <div
                    key={campaign.id}
                    onClick={(e) => {
                      e.stopPropagation();
                      onCampaignClick(campaign);
                    }}
                    className={`p-1 rounded text-xs cursor-pointer hover:shadow-sm ${getStatusColor(campaign.status)}`}
                  >
                    <div className="flex items-center space-x-1">
                      {getChannelIcon(campaign.channel)}
                      <span className="truncate">{campaign.name}</span>
                    </div>
                    <div className="flex items-center space-x-1 text-xs opacity-75">
                      <Clock className="w-2 h-2" />
                      <span>{format(new Date(campaign.scheduledDate), 'HH:mm')}</span>
                    </div>
                  </div>
                ))}
                
                {dayCampaigns.length > 3 && (
                  <div className="text-xs text-gray-500 text-center">
                    +{dayCampaigns.length - 3} נוספים
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div className="p-4 border-t border-gray-200 bg-gray-50">
        <div className="flex items-center justify-center space-x-6 text-sm">
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-yellow-100 rounded"></div>
            <span className="text-gray-600">מתוזמן</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-blue-100 rounded"></div>
            <span className="text-gray-600">נשלח</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-green-100 rounded"></div>
            <span className="text-gray-600">הושלם</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-red-100 rounded"></div>
            <span className="text-gray-600">נכשל</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ScheduleCalendar;