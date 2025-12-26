import React, { useState } from 'react';
import { X, User, Phone, Mail, Building, FileText, Tag, Camera, Video, Users, CheckSquare } from 'lucide-react';
import { useClientStore } from '../store/clientStore';

interface AddClientModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const AddClientModal: React.FC<AddClientModalProps> = ({ isOpen, onClose }) => {
  const { createClient } = useClientStore();
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    phoneNumber: '',
    email: '',
    company: '',
    notes: '',
    tags: [] as string[],
    serviceAreas: [] as string[],
    isActive: true
  });
  const [newTag, setNewTag] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      await createClient(formData);
      setFormData({
        firstName: '',
        lastName: '',
        phoneNumber: '',
        email: '',
        company: '',
        notes: '',
        tags: [],
        serviceAreas: [],
        isActive: true
      });
      onClose();
    } catch (error) {
      console.error('Error creating client:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddTag = () => {
    if (newTag.trim() && !formData.tags.includes(newTag.trim())) {
      setFormData(prev => ({
        ...prev,
        tags: [...prev.tags, newTag.trim()]
      }));
      setNewTag('');
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags.filter((tag: any) => tag !== tagToRemove)
    }));
  };

  const serviceAreas = [
    { id: 'photography', name: 'צילום', icon: Camera, color: 'bg-purple-100 text-purple-800' },
    { id: 'videography', name: 'הפקות וידאו', icon: Video, color: 'bg-blue-100 text-blue-800' },
    { id: 'seating', name: 'הושבה', icon: Users, color: 'bg-green-100 text-green-800' },
    { id: 'all', name: 'הכל יחד', icon: CheckSquare, color: 'bg-yellow-100 text-yellow-800' }
  ];

  const handleServiceAreaToggle = (serviceId: string) => {
    setFormData(prev => {
      if (serviceId === 'all') {
        // אם בוחרים "הכל יחד", נבחר את כל התחומים
        const allServiceIds = serviceAreas.filter((s: any) => s.id !== 'all').map((s: any) => s.id);
        return {
          ...prev,
          serviceAreas: prev.serviceAreas.length === allServiceIds.length ? [] : allServiceIds
        };
      } else {
        // אם בוחרים תחום ספציפי, נסיר "הכל יחד" אם הוא נבחר
        const newServiceAreas = prev.serviceAreas.includes(serviceId)
          ? prev.serviceAreas.filter((id: any) => id !== serviceId)
          : [...prev.serviceAreas.filter((id: any) => id !== 'all'), serviceId];
        
        return {
          ...prev,
          serviceAreas: newServiceAreas
        };
      }
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full my-8 max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between p-6 border-b border-gray-200 flex-shrink-0">
          <h2 className="text-xl font-semibold text-gray-900">הוסף לקוח חדש</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto flex-1">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                שם פרטי *
              </label>
              <div className="relative">
                <User className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  required
                  value={formData.firstName}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData(prev => ({ ...prev, firstName: e.target.value }))}
                  className="w-full pr-10 pl-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="שם פרטי"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                שם משפחה *
              </label>
              <input
                type="text"
                required
                value={formData.lastName}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData(prev => ({ ...prev, lastName: e.target.value }))}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="שם משפחה"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              מספר טלפון *
            </label>
            <div className="relative">
              <Phone className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="tel"
                required
                value={formData.phoneNumber}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData(prev => ({ ...prev, phoneNumber: e.target.value }))}
                className="w-full pr-10 pl-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="050-1234567"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              כתובת אימייל
            </label>
            <div className="relative">
              <Mail className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="email"
                value={formData.email}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                className="w-full pr-10 pl-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="client@example.com"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              חברה
            </label>
            <div className="relative">
              <Building className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                value={formData.company}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData(prev => ({ ...prev, company: e.target.value }))}
                className="w-full pr-10 pl-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="שם החברה"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              תחומי שירות
            </label>
            <div className="grid grid-cols-2 gap-3 mb-4">
              {serviceAreas.map((service: any) => {
                const IconComponent = service.icon;
                const isSelected = formData.serviceAreas.includes(service.id);
                const isAllSelected = service.id === 'all' && formData.serviceAreas.length === serviceAreas.filter((s: any) => s.id !== 'all').length;
                
                return (
                  <button
                    key={service.id}
                    type="button"
                    onClick={() => handleServiceAreaToggle(service.id)}
                    className={`p-3 rounded-lg border-2 transition-all duration-200 flex items-center space-x-2 space-x-reverse ${
                      isSelected || isAllSelected
                        ? `${service.color} border-current`
                        : 'bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    <IconComponent className="w-5 h-5" />
                    <span className="font-medium">{service.name}</span>
                    {(isSelected || isAllSelected) && (
                      <CheckSquare className="w-4 h-4" />
                    )}
                  </button>
                );
              })}
            </div>
            {formData.serviceAreas.length > 0 && (
              <div className="text-sm text-gray-600 mb-4">
                נבחרו: {formData.serviceAreas.map((id: any) => serviceAreas.find((s: any) => s.id === id)?.name).join(', ')}
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              תגיות
            </label>
            <div className="flex flex-wrap gap-2 mb-2">
              {formData.tags.map((tag: any, index: number) => (
                <span
                  key={index}
                  className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-blue-100 text-blue-800"
                >
                  {tag}
                  <button
                    type="button"
                    onClick={() => handleRemoveTag(tag)}
                    className="mr-2 text-blue-600 hover:text-blue-800"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </div>
            <div className="flex space-x-2 space-x-reverse">
              <input
                type="text"
                value={newTag}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewTag(e.target.value)}
                onKeyPress={(e: React.KeyboardEvent<HTMLInputElement>) => e.key === 'Enter' && (e.preventDefault(), handleAddTag())}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="הוסף תגית"
              />
              <button
                type="button"
                onClick={handleAddTag}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center space-x-2 space-x-reverse"
              >
                <Tag className="w-4 h-4" />
                <span>הוסף</span>
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              הערות
            </label>
            <div className="relative">
              <FileText className="absolute right-3 top-3 text-gray-400 w-5 h-5" />
              <textarea
                value={formData.notes}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                rows={3}
                className="w-full pr-10 pl-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="הערות נוספות על הלקוח..."
              />
            </div>
          </div>

          <div className="flex items-center">
            <input
              type="checkbox"
              id="isActive"
              checked={formData.isActive}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData(prev => ({ ...prev, isActive: e.target.checked }))}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <label htmlFor="isActive" className="mr-2 block text-sm text-gray-900">
              לקוח פעיל
            </label>
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
              {isLoading ? 'יוצר...' : 'צור לקוח'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddClientModal;


