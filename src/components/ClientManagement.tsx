import React, { useState, useEffect } from 'react';
import { 
  Users, 
  Calendar, 
  Clock, 
  Plus, 
  Search, 
  Filter, 
  Download, 
  Upload,
  Phone,
  Mail,
  MessageCircle,
  AlertCircle,
  CheckCircle,
  XCircle,
  Edit,
  Trash2,
  Eye,
  Bell,
  CalendarDays,
  TrendingUp,
  UserPlus,
  FileText,
  Settings
} from 'lucide-react';
import { useClientStore } from '../store/clientStore';
import { Client, Reminder, ClientStats, ClientFilterOptions } from '../types';
import { formatDate, formatTime, formatFullName } from '../utils/helpers';
import AddClientModal from './AddClientModal';
import AddReminderModal from './AddReminderModal';

const ClientManagement: React.FC = () => {
  const {
    clients,
    reminders,
    isLoading,
    error,
    filters,
    getClientStats,
    getFilteredClients,
    getFilteredReminders,
    getUpcomingReminders,
    getOverdueReminders,
    setFilters,
    clearFilters,
    createClient,
    updateClient,
    deleteClient,
    createReminder,
    updateReminder,
    deleteReminder,
    completeReminder
  } = useClientStore();

  const [activeTab, setActiveTab] = useState<'clients' | 'reminders' | 'stats'>('clients');
  const [showAddClient, setShowAddClient] = useState(false);
  const [showAddReminder, setShowAddReminder] = useState(false);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [selectedReminder, setSelectedReminder] = useState<Reminder | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [selectedServiceAreas, setSelectedServiceAreas] = useState<string[]>([]);

  const stats = getClientStats();
  const filteredClients = getFilteredClients();
  const filteredReminders = getFilteredReminders();
  const upcomingReminders = getUpcomingReminders(7);
  const overdueReminders = getOverdueReminders();

  // Debug logging removed for production performance

  useEffect(() => {
    if (searchTerm) {
      setFilters({ ...filters, searchTerm });
    } else {
      const { searchTerm: _, ...rest } = filters;
      setFilters(rest);
    }
  }, [searchTerm]);

  useEffect(() => {
    if (selectedServiceAreas.length > 0) {
      setFilters({ ...filters, serviceAreas: selectedServiceAreas });
    } else {
      const { serviceAreas: _, ...rest } = filters;
      setFilters(rest);
    }
  }, [selectedServiceAreas]);

  // Load data on component mount
  useEffect(() => {
    const { fetchClients } = useClientStore.getState();
    fetchClients();
  }, []);

  const handleAddClient = async (clientData: Omit<Client, 'id' | 'createdAt' | 'updatedAt' | 'events' | 'totalEvents' | 'totalGuests'>) => {
    try {
      await createClient(clientData);
      setShowAddClient(false);
    } catch (error) {
      console.error('Error creating client:', error);
    }
  };

  const handleAddReminder = async (reminderData: Omit<Reminder, 'id' | 'createdAt' | 'updatedAt'>) => {
    try {
      await createReminder(reminderData);
      setShowAddReminder(false);
    } catch (error) {
      console.error('Error creating reminder:', error);
    }
  };

  const handleCompleteReminder = async (reminderId: string) => {
    try {
      await completeReminder(reminderId, 'current_user', 'Completed via dashboard');
    } catch (error) {
      console.error('Error completing reminder:', error);
    }
  };

  const getPriorityColor = (priority: Reminder['priority']) => {
    switch (priority) {
      case 'urgent': return 'text-red-600 bg-red-100';
      case 'high': return 'text-orange-600 bg-orange-100';
      case 'medium': return 'text-yellow-600 bg-yellow-100';
      case 'low': return 'text-green-600 bg-green-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getStatusColor = (status: Reminder['status']) => {
    switch (status) {
      case 'completed': return 'text-green-600 bg-green-100';
      case 'pending': return 'text-blue-600 bg-blue-100';
      case 'overdue': return 'text-red-600 bg-red-100';
      case 'cancelled': return 'text-gray-600 bg-gray-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getTypeIcon = (type: Reminder['type']) => {
    switch (type) {
      case 'call': return <Phone className="w-4 h-4" />;
      case 'email': return <Mail className="w-4 h-4" />;
      case 'whatsapp': return <MessageCircle className="w-4 h-4" />;
      case 'sms': return <MessageCircle className="w-4 h-4" />;
      case 'meeting': return <Calendar className="w-4 h-4" />;
      case 'follow_up': return <Bell className="w-4 h-4" />;
      default: return <Bell className="w-4 h-4" />;
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">ניהול לקוחות</h1>
            <p className="text-gray-600 mt-2">נהל את הלקוחות, האירועים והתזכורות שלך</p>
          </div>
          <div className="flex space-x-4 space-x-reverse">
            <button
              onClick={() => setShowAddClient(true)}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center space-x-2 space-x-reverse"
            >
              <UserPlus className="w-5 h-5" />
              <span>הוסף לקוח</span>
            </button>
            <button
              onClick={() => setShowAddReminder(true)}
              className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 flex items-center space-x-2 space-x-reverse"
            >
              <Bell className="w-5 h-5" />
              <span>הוסף תזכורת</span>
            </button>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Users className="w-6 h-6 text-blue-600" />
            </div>
            <div className="mr-4">
              <p className="text-sm font-medium text-gray-600">סה"כ לקוחות</p>
              <p className="text-2xl font-bold text-gray-900">{stats.totalClients}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-2 bg-green-100 rounded-lg">
              <Calendar className="w-6 h-6 text-green-600" />
            </div>
            <div className="mr-4">
              <p className="text-sm font-medium text-gray-600">אירועים קרובים</p>
              <p className="text-2xl font-bold text-gray-900">{stats.upcomingEvents}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-2 bg-yellow-100 rounded-lg">
              <Clock className="w-6 h-6 text-yellow-600" />
            </div>
            <div className="mr-4">
              <p className="text-sm font-medium text-gray-600">תזכורות ממתינות</p>
              <p className="text-2xl font-bold text-gray-900">{stats.pendingReminders}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-2 bg-red-100 rounded-lg">
              <AlertCircle className="w-6 h-6 text-red-600" />
            </div>
            <div className="mr-4">
              <p className="text-sm font-medium text-gray-600">תזכורות פגות תוקף</p>
              <p className="text-2xl font-bold text-gray-900">{stats.overdueReminders}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="mb-6">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8 space-x-reverse">
            <button
              onClick={() => setActiveTab('clients')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'clients'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              לקוחות ({filteredClients.length})
            </button>
            <button
              onClick={() => setActiveTab('reminders')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'reminders'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              תזכורות ({filteredReminders.length})
            </button>
            <button
              onClick={() => setActiveTab('stats')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'stats'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              סטטיסטיקות
            </button>
          </nav>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="mb-6 flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <div className="relative">
            <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="חפש לקוחות..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pr-10 pl-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>
        <button
          onClick={() => setShowFilters(!showFilters)}
          className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center space-x-2 space-x-reverse"
        >
          <Filter className="w-5 h-5" />
          <span>סינון</span>
        </button>
      </div>

      {/* Advanced Filters */}
      {showFilters && (
        <div className="mb-6 bg-gray-50 rounded-lg p-4">
          <h3 className="text-lg font-medium text-gray-900 mb-4">סינון מתקדם</h3>
          
          {/* Service Areas Filter */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              תחומי שירות
            </label>
            <div className="flex flex-wrap gap-2">
              {[
                { id: 'photography', name: 'צילום', color: 'bg-purple-100 text-purple-800' },
                { id: 'videography', name: 'הפקות וידאו', color: 'bg-blue-100 text-blue-800' },
                { id: 'seating', name: 'הושבה', color: 'bg-green-100 text-green-800' },
                { id: 'all', name: 'הכל יחד', color: 'bg-yellow-100 text-yellow-800' }
              ].map((service) => (
                <button
                  key={service.id}
                  onClick={() => {
                    if (selectedServiceAreas.includes(service.id)) {
                      setSelectedServiceAreas(prev => prev.filter(id => id !== service.id));
                    } else {
                      setSelectedServiceAreas(prev => [...prev, service.id]);
                    }
                  }}
                  className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                    selectedServiceAreas.includes(service.id)
                      ? service.color
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  {service.name}
                </button>
              ))}
            </div>
          </div>

          {/* Clear Filters */}
          <div className="flex justify-end">
            <button
              onClick={() => {
                setSelectedServiceAreas([]);
                setSearchTerm('');
                clearFilters();
              }}
              className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800"
            >
              נקה סינונים
            </button>
          </div>
        </div>
      )}

      {/* Content */}
      {activeTab === 'clients' && (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    לקוח
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    פרטי קשר
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    תחומי שירות
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    אירועים
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    תזכורות
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    סטטוס
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    פעולות
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredClients.map((client) => (
                  <tr key={client.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10">
                          <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                            <span className="text-sm font-medium text-blue-600">
                              {client.firstName.charAt(0)}{client.lastName.charAt(0)}
                            </span>
                          </div>
                        </div>
                        <div className="mr-4">
                          <div className="text-sm font-medium text-gray-900">
                            {formatFullName(client.firstName, client.lastName)}
                          </div>
                          <div className="text-sm text-gray-500">
                            {client.company || 'ללא חברה'}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{client.phoneNumber}</div>
                      {client.email && (
                        <div className="text-sm text-gray-500">{client.email}</div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex flex-wrap gap-1">
                        {client.serviceAreas && client.serviceAreas.length > 0 ? (
                          client.serviceAreas.map((area, index) => {
                            const serviceNames: { [key: string]: string } = {
                              'photography': 'צילום',
                              'videography': 'הפקות וידאו',
                              'seating': 'הושבה',
                              'all': 'הכל יחד'
                            };
                            const serviceColors: { [key: string]: string } = {
                              'photography': 'bg-purple-100 text-purple-800',
                              'videography': 'bg-blue-100 text-blue-800',
                              'seating': 'bg-green-100 text-green-800',
                              'all': 'bg-yellow-100 text-yellow-800'
                            };
                            return (
                              <span
                                key={index}
                                className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${serviceColors[area] || 'bg-gray-100 text-gray-800'}`}
                              >
                                {serviceNames[area] || area}
                              </span>
                            );
                          })
                        ) : (
                          <span className="text-sm text-gray-400">לא הוגדר</span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{client.totalEvents}</div>
                      <div className="text-sm text-gray-500">{client.totalGuests} אורחים</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {reminders.filter(r => r.clientId === client.id).length}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        client.isActive 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {client.isActive ? 'פעיל' : 'לא פעיל'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex space-x-2 space-x-reverse">
                        <button
                          onClick={() => setSelectedClient(client)}
                          className="text-blue-600 hover:text-blue-900"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => {/* Edit client */}}
                          className="text-indigo-600 hover:text-indigo-900"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => {/* Delete client */}}
                          className="text-red-600 hover:text-red-900"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'reminders' && (
        <div className="space-y-6">
          {/* Upcoming Reminders */}
          {upcomingReminders.length > 0 && (
            <div className="bg-white rounded-lg shadow">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-medium text-gray-900">תזכורות קרובות (7 ימים הבאים)</h3>
              </div>
              <div className="divide-y divide-gray-200">
                {upcomingReminders.map((reminder) => (
                  <div key={reminder.id} className="px-6 py-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3 space-x-reverse">
                        {getTypeIcon(reminder.type)}
                        <div>
                          <div className="text-sm font-medium text-gray-900">{reminder.title}</div>
                          <div className="text-sm text-gray-500">{reminder.description}</div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2 space-x-reverse">
                        <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getPriorityColor(reminder.priority)}`}>
                          {reminder.priority}
                        </span>
                        <span className="text-sm text-gray-500">
                          {formatDate(reminder.reminderDate)}
                        </span>
                        <button
                          onClick={() => handleCompleteReminder(reminder.id)}
                          className="text-green-600 hover:text-green-900"
                        >
                          <CheckCircle className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Overdue Reminders */}
          {overdueReminders.length > 0 && (
            <div className="bg-white rounded-lg shadow border-l-4 border-red-500">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-medium text-red-900">תזכורות פגות תוקף</h3>
              </div>
              <div className="divide-y divide-gray-200">
                {overdueReminders.map((reminder) => (
                  <div key={reminder.id} className="px-6 py-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3 space-x-reverse">
                        {getTypeIcon(reminder.type)}
                        <div>
                          <div className="text-sm font-medium text-gray-900">{reminder.title}</div>
                          <div className="text-sm text-gray-500">{reminder.description}</div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2 space-x-reverse">
                        <span className="px-2 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-800">
                          פג תוקף
                        </span>
                        <span className="text-sm text-gray-500">
                          {formatDate(reminder.reminderDate)}
                        </span>
                        <button
                          onClick={() => handleCompleteReminder(reminder.id)}
                          className="text-green-600 hover:text-green-900"
                        >
                          <CheckCircle className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* All Reminders */}
          <div className="bg-white rounded-lg shadow">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900">כל התזכורות</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      תזכורת
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      לקוח
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      תאריך
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      עדיפות
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      סטטוס
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      פעולות
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredReminders.map((reminder) => {
                    const client = clients.find(c => c.id === reminder.clientId);
                    return (
                      <tr key={reminder.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center space-x-2 space-x-reverse">
                            {getTypeIcon(reminder.type)}
                            <div>
                              <div className="text-sm font-medium text-gray-900">{reminder.title}</div>
                              {reminder.description && (
                                <div className="text-sm text-gray-500">{reminder.description}</div>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">
                            {client ? formatFullName(client.firstName, client.lastName) : 'לא נמצא'}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">{formatDate(reminder.reminderDate)}</div>
                          {reminder.reminderTime && (
                            <div className="text-sm text-gray-500">{reminder.reminderTime}</div>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getPriorityColor(reminder.priority)}`}>
                            {reminder.priority}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(reminder.status)}`}>
                            {reminder.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <div className="flex space-x-2 space-x-reverse">
                            {reminder.status === 'pending' && (
                              <button
                                onClick={() => handleCompleteReminder(reminder.id)}
                                className="text-green-600 hover:text-green-900"
                              >
                                <CheckCircle className="w-4 h-4" />
                              </button>
                            )}
                            <button
                              onClick={() => setSelectedReminder(reminder)}
                              className="text-blue-600 hover:text-blue-900"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => {/* Edit reminder */}}
                              className="text-indigo-600 hover:text-indigo-900"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => {/* Delete reminder */}}
                              className="text-red-600 hover:text-red-900"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'stats' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">סטטיסטיקות כלליות</h3>
            <div className="space-y-4">
              <div className="flex justify-between">
                <span className="text-gray-600">סה"כ לקוחות</span>
                <span className="font-semibold">{stats.totalClients}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">לקוחות פעילים</span>
                <span className="font-semibold">{stats.activeClients}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">סה"כ אירועים</span>
                <span className="font-semibold">{stats.totalEvents}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">אירועים קרובים</span>
                <span className="font-semibold">{stats.upcomingEvents}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">אירועים הושלמו</span>
                <span className="font-semibold">{stats.completedEvents}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">סה"כ אורחים</span>
                <span className="font-semibold">{stats.totalGuests}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">אחוז תגובה ממוצע</span>
                <span className="font-semibold">{stats.averageResponseRate.toFixed(1)}%</span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">תזכורות</h3>
            <div className="space-y-4">
              <div className="flex justify-between">
                <span className="text-gray-600">תזכורות ממתינות</span>
                <span className="font-semibold">{stats.pendingReminders}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">תזכורות פגות תוקף</span>
                <span className="font-semibold text-red-600">{stats.overdueReminders}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <div className="flex">
            <XCircle className="w-5 h-5 text-red-400 ml-3" />
            <div>
              <h3 className="text-sm font-medium text-red-800">שגיאה</h3>
              <p className="text-sm text-red-700 mt-1">{error}</p>
            </div>
          </div>
        </div>
      )}

      {/* Modals */}
      <AddClientModal
        isOpen={showAddClient}
        onClose={() => setShowAddClient(false)}
      />
      
      <AddReminderModal
        isOpen={showAddReminder}
        onClose={() => setShowAddReminder(false)}
      />
    </div>
  );
};

export default ClientManagement;
