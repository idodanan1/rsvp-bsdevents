import React from 'react';
import { Campaign } from '../types';
import { MessageSquare, Smartphone, Globe } from 'lucide-react';

interface MessagePreviewProps {
  campaign: any;
  eventId: string;
}

const MessagePreview: React.FC<MessagePreviewProps> = ({ campaign, eventId }) => {
  const getChannelIcon = (channel: string) => {
    switch (channel) {
      case 'whatsapp':
        return <MessageSquare className="w-4 h-4" />;
      case 'sms':
        return <Smartphone className="w-4 h-4" />;
      default:
        return <Globe className="w-4 h-4" />;
    }
  };

  const getChannelColor = (channel: string) => {
    switch (channel) {
      case 'whatsapp':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'sms':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  return (
    <div className="space-y-4">
      {/* WhatsApp Preview */}
      {campaign.channel === 'whatsapp' && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-center space-x-2 mb-3">
            {getChannelIcon('whatsapp')}
            <span className="font-medium text-green-800">WhatsApp</span>
          </div>
          
          <div className="bg-white rounded-lg p-4 shadow-sm">
            <div className="text-sm text-gray-800 whitespace-pre-line mb-3">
              {campaign.message.replace(
                `${window.location.origin}/guest-response/${eventId}`,
                `${window.location.origin}/#/guest-response/${eventId}?guest=GUEST_ID`
              )}
            </div>
            
            {campaign.whatsappButtons && campaign.whatsappButtons.length > 0 && (
              <div className="space-y-2">
                {campaign.whatsappButtons.map((button: any, index: number) => (
                  <div key={index} className="flex space-x-2">
                    {button.type === 'reply' && button.reply && (
                      <button className="bg-green-500 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-green-600 transition-colors">
                        {button.reply.title}
                      </button>
                    )}
                    {button.type === 'url' && button.url && (
                      <button className="bg-blue-500 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-600 transition-colors">
                        {button.url.title}
                      </button>
                    )}
                    {button.type === 'phone' && button.phone && (
                      <button className="bg-purple-500 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-purple-600 transition-colors">
                        {button.phone.title}
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}


      {/* Channel Badge */}
      <div className={`inline-flex items-center space-x-2 px-3 py-1 rounded-full text-xs font-medium border ${getChannelColor(campaign.channel)}`}>
        {getChannelIcon(campaign.channel)}
        <span>{campaign.channel === 'whatsapp' ? 'WhatsApp' : 'Manual'}</span>
      </div>
    </div>
  );
};

export default MessagePreview;
