import React, { useState, useEffect } from 'react';
import { useTemplateStore } from '../store/campaignStore';
import { MessageTemplate } from '../types';
import { 
  Plus, 
  Edit, 
  Trash2, 
  MessageSquare, 
  Phone, 
  Copy,
  Save,
  X
} from 'lucide-react';

const MessageTemplates: React.FC = () => {
  const { 
    templates, 
    currentTemplate, 
    setCurrentTemplate,
    createTemplate, 
    updateTemplate, 
    deleteTemplate
  } = useTemplateStore();
  
  const [showCreateTemplate, setShowCreateTemplate] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<MessageTemplate | null>(null);
  const [templateForm, setTemplateForm] = useState({
    name: '',
    content: '',
    imageUrl: '',
    channel: 'whatsapp' as 'whatsapp',
    isDefault: false
  });

  useEffect(() => {
    if (editingTemplate) {
      setTemplateForm({
        name: editingTemplate.name,
        content: editingTemplate.content,
        imageUrl: editingTemplate.imageUrl || '',
        channel: 'whatsapp',
        isDefault: editingTemplate.isDefault
      });
    }
  }, [editingTemplate]);

  const handleCreateTemplate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!templateForm.name || !templateForm.content) {
      return;
    }

    try {
      await createTemplate({
        name: templateForm.name,
        content: templateForm.content,
        imageUrl: templateForm.imageUrl || undefined,
        channel: templateForm.channel,
        isDefault: templateForm.isDefault
      });
      
      setTemplateForm({
        name: '',
        content: '',
        imageUrl: '',
        channel: 'whatsapp',
        isDefault: false
      });
      setShowCreateTemplate(false);
    } catch (error) {
      console.error('Error creating template:', error);
    }
  };

  const handleUpdateTemplate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTemplate || !templateForm.name || !templateForm.content) {
      return;
    }

    try {
      await updateTemplate(editingTemplate.id, {
        name: templateForm.name,
        content: templateForm.content,
        imageUrl: templateForm.imageUrl || undefined,
        channel: templateForm.channel,
        isDefault: templateForm.isDefault
      });
      
      setEditingTemplate(null);
      setTemplateForm({
        name: '',
        content: '',
        imageUrl: '',
        channel: 'whatsapp',
        isDefault: false
      });
    } catch (error) {
      console.error('Error updating template:', error);
    }
  };

  const handleDeleteTemplate = async (id: string) => {
    if (window.confirm('האם אתה בטוח שברצונך למחוק תבנית זו?')) {
      try {
        await deleteTemplate(id);
      } catch (error) {
        console.error('Error deleting template:', error);
      }
    }
  };

  const handleCopyTemplate = (template: MessageTemplate) => {
    setTemplateForm({
      name: `${template.name} (עותק)`,
      content: template.content,
      imageUrl: template.imageUrl || '',
      channel: template.channel === 'manual' ? 'whatsapp' : template.channel as 'whatsapp' | 'sms',
      isDefault: false
    });
    setShowCreateTemplate(true);
  };

  const getChannelIcon = (channel: string) => {
    return channel === 'whatsapp' ? 
      <MessageSquare className="w-4 h-4 text-green-600" /> : 
      <Phone className="w-4 h-4 text-blue-600" />;
  };

  const getChannelText = (channel: string) => {
    return channel === 'whatsapp' ? 'וואטסאפ' : 'SMS';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">תבניות הודעות - <span className="text-yellow-500">בס"ד אירועים</span></h1>
          <p className="text-gray-600">נהל תבניות הודעות לשימוש חוזר</p>
        </div>
        <button
          onClick={() => setShowCreateTemplate(true)}
          className="btn-primary flex items-center space-x-2"
        >
          <Plus className="w-4 h-4" />
          <span>תבנית חדשה</span>
        </button>
      </div>

      {/* Templates Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {templates.map((template) => (
          <div key={template.id} className="card">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center space-x-2">
                {getChannelIcon(template.channel)}
                <h3 className="text-lg font-semibold text-gray-900">{template.name}</h3>
                {template.isDefault && (
                  <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full">
                    ברירת מחדל
                  </span>
                )}
              </div>
              <div className="flex items-center space-x-1">
                <button
                  onClick={() => handleCopyTemplate(template)}
                  className="p-1 text-gray-400 hover:text-gray-600"
                  title="העתק"
                >
                  <Copy className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setEditingTemplate(template)}
                  className="p-1 text-gray-400 hover:text-gray-600"
                  title="ערוך"
                >
                  <Edit className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleDeleteTemplate(template.id)}
                  className="p-1 text-gray-400 hover:text-red-600"
                  title="מחק"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
            
            <div className="mb-4">
              <p className="text-sm text-gray-600 mb-2">ערוץ: {getChannelText(template.channel)}</p>
              <p className="text-gray-700 text-sm line-clamp-3">{template.content}</p>
            </div>
            
            {template.imageUrl && (
              <div className="mt-3">
                <div className="flex items-center space-x-2 text-sm text-gray-500 mb-2">
                  <span>כולל תמונה</span>
                </div>
                <img 
                  src={template.imageUrl} 
                  alt="תצוגה מקדימה" 
                  className="w-24 h-18 object-cover rounded-lg border"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                  }}
                />
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Create/Edit Template Modal */}
      {(showCreateTemplate || editingTemplate) && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">
                {editingTemplate ? 'עריכת תבנית' : 'תבנית חדשה'}
              </h3>
              <button
                onClick={() => {
                  setShowCreateTemplate(false);
                  setEditingTemplate(null);
                  setTemplateForm({
                    name: '',
                    content: '',
                    imageUrl: '',
                    channel: 'whatsapp',
                    isDefault: false
                  });
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={editingTemplate ? handleUpdateTemplate : handleCreateTemplate} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    שם התבנית
                  </label>
                  <input
                    type="text"
                    value={templateForm.name}
                    onChange={(e) => setTemplateForm({...templateForm, name: e.target.value})}
                    className="input-field"
                    placeholder="הזן שם לתבנית"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    ערוץ
                  </label>
                  <div className="flex items-center text-sm text-gray-600 py-2">
                    <MessageSquare className="w-4 h-4 text-green-600 ml-1" />
                    <span>וואטסאפ</span>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  תוכן התבנית
                </label>
                <textarea
                  value={templateForm.content}
                  onChange={(e) => setTemplateForm({...templateForm, content: e.target.value})}
                  className="input-field h-32"
                  placeholder="הזן את תוכן התבנית... ניתן להשתמש במשתנים: {firstName}, {coupleName}, {eventDate}, {eventTime}"
                  required
                />
                <p className="text-xs text-gray-500 mt-1">
                  משתנים זמינים: {'{firstName}'}, {'{coupleName}'}, {'{groomName}'}, {'{brideName}'}, {'{eventType}'}, {'{eventDate}'}, {'{eventTime}'}, {'{venue}'}
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  קישור לתמונה (אופציונלי)
                </label>
                <input
                  type="url"
                  value={templateForm.imageUrl}
                  onChange={(e) => setTemplateForm({...templateForm, imageUrl: e.target.value})}
                  className="input-field"
                  placeholder="https://example.com/image.jpg"
                />
                <p className="text-xs text-gray-500 mt-1">
                  התמונה תוצג בכל ההודעות שנשלחו עם התבנית הזו
                </p>
                {templateForm.imageUrl && (
                  <div className="mt-2">
                    <img 
                      src={templateForm.imageUrl} 
                      alt="תצוגה מקדימה" 
                      className="w-32 h-24 object-cover rounded-lg border"
                      onError={(e) => {
                        e.currentTarget.style.display = 'none';
                      }}
                    />
                  </div>
                )}
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="isDefault"
                  checked={templateForm.isDefault}
                  onChange={(e) => setTemplateForm({...templateForm, isDefault: e.target.checked})}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label htmlFor="isDefault" className="mr-2 block text-sm text-gray-700">
                  תבנית ברירת מחדל
                </label>
              </div>

              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateTemplate(false);
                    setEditingTemplate(null);
                    setTemplateForm({
                      name: '',
                      content: '',
                      imageUrl: '',
                      channel: 'whatsapp',
                      isDefault: false
                    });
                  }}
                  className="btn-secondary"
                >
                  ביטול
                </button>
                <button type="submit" className="btn-primary flex items-center space-x-2">
                  <Save className="w-4 h-4" />
                  <span>{editingTemplate ? 'עדכן' : 'צור'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default MessageTemplates;
