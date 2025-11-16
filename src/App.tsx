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
          <Route path="/client/:eventId" element={<ClientDashboard />} />
          <Route path="/guest-response/:eventId" element={<GuestResponse />} />
          <Route path="/qr-scan/:eventId/:guestId" element={<QRScan />} />
          <Route path="/" element={<Layout><Dashboard /></Layout>} />
          <Route path="/create-event" element={<Layout><CreateEvent /></Layout>} />
          <Route path="/event/:id" element={<Layout><EventManagement /></Layout>} />
          <Route path="/event/:id/manage" element={<Layout><EventManagement /></Layout>} />
          <Route path="/event/:id/view" element={<Layout><EventViewer /></Layout>} />
          <Route path="/event/:id/campaigns" element={<Layout><CampaignManagement /></Layout>} />
          <Route path="/event/:id/seating" element={<Layout><SeatingManagement /></Layout>} />
          <Route path="/event/:id/venue" element={<VenueEditor />} />
          <Route path="/templates" element={<Layout><MessageTemplates /></Layout>} />
          <Route path="/clients" element={<Layout><ClientManagement /></Layout>} />
          <Route path="/calendar" element={<Layout><CalendarView /></Layout>} />
          <Route path="/reminders" element={<Layout><ClientManagement /></Layout>} />
          <Route path="/settings" element={<Layout><div>הגדרות</div></Layout>} />
          <Route path="*" element={<div style={{padding: '20px'}}><h1>404 - דף לא נמצא</h1><p>הנתיב לא קיים</p></div>} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;