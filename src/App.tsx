import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import Layout from './components/Layout';
import Dashboard from './components/Dashboard';
import CreateEvent from './components/CreateEvent';
import EventManagement from './components/EventManagement';
import EventViewer from './components/EventViewer';
import CampaignManagement from './components/CampaignManagement';
import MessageTemplates from './components/MessageTemplates';
import ClientDashboard from './components/ClientDashboard';
import SeatingManagement from './components/SeatingManagement';
import VenueEditor from './components/VenueEditor';
import GuestResponse from './components/GuestResponse';
import ClientManagement from './components/ClientManagement';
import CalendarView from './components/CalendarView';
import QRScan from './components/QRScan';
import Login from './components/Login';
import SignUp from './components/SignUp';
import Pricing from './components/Pricing';
import AdminDashboard from './components/AdminDashboard';
import UserManagement from './components/UserManagement';
import ProtectedRoute from './components/ProtectedRoute';
import { useEventStore } from './store/eventStore';
import { useClientStore } from './store/clientStore';
import { webhookService } from './services/webhookService';

function App() {
  const fetchEvents = useEventStore(state => state.fetchEvents);
  const fetchClients = useClientStore(state => state.fetchClients);

  React.useEffect(() => {
    fetchEvents();
    fetchClients();
    
    // Start webhook polling for button clicks
    webhookService.startPolling(5000); // Poll every 5 seconds
    
    // Cleanup on unmount
    return () => {
      webhookService.stopPolling();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <Router>
      <div className="min-h-screen bg-gradient-to-br from-teal-50 to-yellow-50">
        <Toaster 
          position="top-center"
          toastOptions={{
            duration: 4000,
            style: {
              background: '#363636',
              color: '#fff',
            },
          }}
        />
        <Routes>
          {/* Public routes */}
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<SignUp />} />
          <Route path="/client/:eventId" element={<ClientDashboard />} />
          <Route path="/guest-response/:eventId" element={<GuestResponse />} />
          <Route path="/qr-scan/:eventId/:guestId" element={<QRScan />} />
          
          {/* Protected routes */}
          <Route path="/" element={<ProtectedRoute><Layout><Dashboard /></Layout></ProtectedRoute>} />
          <Route path="/pricing" element={<ProtectedRoute><Layout><Pricing /></Layout></ProtectedRoute>} />
          <Route path="/create-event" element={<ProtectedRoute><Layout><CreateEvent /></Layout></ProtectedRoute>} />
          <Route path="/event/:id" element={<ProtectedRoute><Layout><EventManagement /></Layout></ProtectedRoute>} />
          <Route path="/event/:id/manage" element={<ProtectedRoute><Layout><EventManagement /></Layout></ProtectedRoute>} />
          <Route path="/event/:id/view" element={<ProtectedRoute><Layout><EventViewer /></Layout></ProtectedRoute>} />
          <Route path="/event/:id/campaigns" element={<ProtectedRoute><Layout><CampaignManagement /></Layout></ProtectedRoute>} />
          <Route path="/event/:id/seating" element={<ProtectedRoute><Layout><SeatingManagement /></Layout></ProtectedRoute>} />
          <Route path="/event/:id/venue" element={<ProtectedRoute><VenueEditor /></ProtectedRoute>} />
          <Route path="/templates" element={<ProtectedRoute><Layout><MessageTemplates /></Layout></ProtectedRoute>} />
          <Route path="/clients" element={<ProtectedRoute><Layout><ClientManagement /></Layout></ProtectedRoute>} />
          <Route path="/calendar" element={<ProtectedRoute><Layout><CalendarView /></Layout></ProtectedRoute>} />
          <Route path="/reminders" element={<ProtectedRoute><Layout><ClientManagement /></Layout></ProtectedRoute>} />
          <Route path="/admin" element={<ProtectedRoute><Layout><AdminDashboard /></Layout></ProtectedRoute>} />
          <Route path="/users" element={<ProtectedRoute><Layout><UserManagement /></Layout></ProtectedRoute>} />
          <Route path="/settings" element={<ProtectedRoute><Layout><div>הגדרות</div></Layout></ProtectedRoute>} />
          <Route path="*" element={<div style={{padding: '20px'}}><h1>404 - דף לא נמצא</h1><p>הנתיב לא קיים</p></div>} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;