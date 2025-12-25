import React from 'react';
import { HashRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
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
import CheckInStation from './components/CheckInStation';
import Login from './components/Login';
import SignUp from './components/SignUp';
import Pricing from './components/Pricing';
import AdminDashboard from './components/AdminDashboard';
import UserManagement from './components/UserManagement';
import BudgetManagement from './components/BudgetManagement';
import Settings from './components/Settings';
import ProtectedRoute from './components/ProtectedRoute';
import Accessibility from './components/Accessibility';
import AccessibilityPage from './pages/AccessibilityPage';
import TermsPage from './pages/TermsPage';
import PrivacyPage from './pages/PrivacyPage';
import { useEventStore } from './store/eventStore';
import { useClientStore } from './store/clientStore';
import { useUserStore } from './store/userStore';
import { useCampaignStore } from './store/campaignStore';
import { Campaign } from './types';
import { webhookService } from './services/webhookService';
import { schedulerService } from './services/schedulerService';
import { crossTabSync } from './utils/crossTabSync';

// Component to save current location to localStorage
function LocationSaver() {
  const location = useLocation();
  
  React.useEffect(() => {
    // Save current location to localStorage for persistence
    localStorage.setItem('rsvp-last-location', location.pathname + location.search);
  }, [location]);
  
  return null;
}

function App() {
  const fetchEvents = useEventStore(state => state.fetchEvents);
  const fetchClients = useClientStore(state => state.fetchClients);
  const { user, isAuthenticated, logout } = useUserStore();
  
  // App initialization
  React.useEffect(() => {
    // Initialize cross-tab synchronization
    if (crossTabSync.isReady()) {
      console.log('✅ Cross-tab synchronization ready');
      
      // Listen for force refresh requests from other tabs
      crossTabSync.subscribeAll((message) => {
        if (message.type === 'force-refresh') {
          console.log(`🔄 Cross-tab: Force refresh requested for ${message.storeName}`);
          
          if (message.storeName === 'rsvp-events-storage' || message.storeName === '*') {
            fetchEvents(true, true).catch((err: unknown) => {
              console.error('❌ Error refreshing events from cross-tab:', err);
            });
          }
          
          if (message.storeName === 'client-store' || message.storeName === '*') {
            fetchClients().catch((err: unknown) => {
              console.error('❌ Error refreshing clients from cross-tab:', err);
            });
          }
        }
      });
    }
  }, [fetchEvents, fetchClients]);

  // Load data in background - don't block rendering
  // Zustand persist already loads from localStorage instantly
  React.useEffect(() => {
    // Check if authentication state is invalid (isAuthenticated but no user)
    if (isAuthenticated && !user) {
      console.warn('⚠️ Invalid authentication state detected on app load - clearing');
      logout();
    }
    
    // Fetch data in background (non-blocking) - data already loaded from localStorage via persist
    if (isAuthenticated && user) {
      // Don't await - let it run in background
      fetchEvents().catch(() => {}); // Silent fail - data already in localStorage
      fetchClients().catch(() => {}); // Silent fail - data already in localStorage
      
      // No auto-polling - user will use manual refresh button

      // Initialize scheduled campaigns
      const initializeScheduledCampaigns = async () => {
        try {
          // Clear all existing scheduled tasks to prevent duplicates
          schedulerService.clearAll();
          
          // Get campaigns from campaignStore
          const campaignStore = useCampaignStore.getState();
          const scheduledCampaigns = campaignStore.campaigns.filter(
            (c: Campaign) => c.status === 'scheduled' && c.scheduledDate
          );

          // Reschedule each campaign
          for (const campaign of scheduledCampaigns) {
            const scheduledTime = new Date(campaign.scheduledDate);
            const now = new Date();

            // Only schedule if the time hasn't passed
            if (scheduledTime > now) {
              schedulerService.scheduleCampaign(campaign, async () => {
                try {
                  console.log(`⏰ Scheduled time reached for campaign: ${campaign.name}`);
                  
                  // If campaign has eventId, use eventStore to send it
                  if (campaign.eventId) {
                    const eventStore = useEventStore.getState();
                    await eventStore.sendCampaign(campaign.eventId, campaign.id);
                  } else {
                    // Otherwise, use the local sendCampaign method
                    await campaignStore.sendCampaign(campaign.id);
                  }
                } catch (error) {
                  console.error('Error sending scheduled campaign:', error);
                  // Update campaign status to failed
                  await campaignStore.updateCampaign(campaign.id, { status: 'failed' });
                }
              });
              console.log(`✅ Rescheduled campaign: ${campaign.name} for ${scheduledTime.toLocaleString('he-IL')}`);
            } else {
              // Time has passed, send immediately
              console.log(`⏰ Campaign "${campaign.name}" scheduled time has passed, sending now...`);
              try {
                if (campaign.eventId) {
                  const eventStore = useEventStore.getState();
                  await eventStore.sendCampaign(campaign.eventId, campaign.id);
                } else {
                  await campaignStore.sendCampaign(campaign.id);
                }
              } catch (error) {
                console.error('Error sending overdue campaign:', error);
                await campaignStore.updateCampaign(campaign.id, { status: 'failed' });
              }
            }
          }

          // Also check campaigns in events
          const eventStore = useEventStore.getState();
          const events = eventStore.events;
          
          for (const event of events) {
            if (event.campaigns) {
              const eventScheduledCampaigns = event.campaigns.filter(
                (c: Campaign) => c.status === 'scheduled' && c.scheduledDate
              );

              for (const campaign of eventScheduledCampaigns) {
                const scheduledTime = new Date(campaign.scheduledDate);
                const now = new Date();

                if (scheduledTime > now) {
                  schedulerService.scheduleCampaign(campaign, async () => {
                    try {
                      console.log(`⏰ Scheduled time reached for campaign: ${campaign.name}`);
                      await eventStore.sendCampaign(event.id, campaign.id);
                    } catch (error) {
                      console.error('Error sending scheduled campaign:', error);
                      // Update campaign status in event
                      await eventStore.updateEvent(event.id, {
                        campaigns: event.campaigns?.map(c =>
                          c.id === campaign.id ? { ...c, status: 'failed' } : c
                        )
                      });
                    }
                  });
                  console.log(`✅ Rescheduled event campaign: ${campaign.name} for ${scheduledTime.toLocaleString('he-IL')}`);
                } else {
                  // Time has passed, send immediately
                  console.log(`⏰ Event campaign "${campaign.name}" scheduled time has passed, sending now...`);
                  try {
                    await eventStore.sendCampaign(event.id, campaign.id);
                  } catch (error) {
                    console.error('Error sending overdue event campaign:', error);
                  }
                }
              }
            }
          }
        } catch (error) {
          console.error('Error initializing scheduled campaigns:', error);
        }
      };

      // Initialize scheduled campaigns after a short delay to ensure stores are loaded
      setTimeout(initializeScheduledCampaigns, 1000);
    }
    
    // Cleanup on unmount
    return () => {
      webhookService.stopPolling();
      schedulerService.clearAll();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <Router>
      <LocationSaver />
      <Accessibility />
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
        <main id="main-content">
          <Routes>
            {/* Public routes */}
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<SignUp />} />
            <Route path="/client/:eventId" element={<ClientDashboard />} />
            <Route path="/guest-response/:eventId" element={<GuestResponse />} />
            <Route path="/qr-scan/:eventId/:guestId" element={<QRScan />} />
            <Route path="/check-in/:eventId" element={<CheckInStation />} />
            <Route path="/accessibility" element={<AccessibilityPage />} />
            <Route path="/terms" element={<TermsPage />} />
            <Route path="/privacy" element={<PrivacyPage />} />
            
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
          <Route path="/budget" element={<ProtectedRoute><Layout><BudgetManagement /></Layout></ProtectedRoute>} />
          <Route path="/budget/:id" element={<ProtectedRoute><Layout><BudgetManagement /></Layout></ProtectedRoute>} />
          <Route path="/admin" element={<ProtectedRoute><Layout><AdminDashboard /></Layout></ProtectedRoute>} />
          <Route path="/users" element={<ProtectedRoute><Layout><UserManagement /></Layout></ProtectedRoute>} />
          <Route path="/settings" element={<ProtectedRoute><Layout><Settings /></Layout></ProtectedRoute>} />
          <Route path="*" element={
            <div className="min-h-screen bg-gradient-to-br from-teal-50 to-yellow-50 flex items-center justify-center p-4">
              <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full text-center">
                <h1 className="text-3xl font-bold text-gray-800 mb-4">404 - דף לא נמצא</h1>
                <p className="text-gray-600 mb-6">הנתיב שביקשת לא קיים במערכת</p>
                <a 
                  href="/" 
                  className="inline-block bg-teal-600 text-white px-6 py-3 rounded-lg hover:bg-teal-700 transition-colors font-semibold"
                >
                  חזרה לעמוד הראשי
                </a>
              </div>
            </div>
          } />
        </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;