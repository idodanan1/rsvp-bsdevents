// Webhook Service - Handles WhatsApp button clicks and updates guest status

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3002';

export interface WebhookUpdate {
  phoneNumber: string;
  guestId?: string; // CRITICAL: Guest ID to ensure correct guest is updated (for guest_link updates)
  eventId?: string; // CRITICAL: Event ID to ensure correct event is used (for guest_link updates)
  status?: 'confirmed' | 'declined' | 'maybe'; // Include 'maybe' status
  responseDate?: string;
  guestCount?: number; // For guest count updates
  actualAttendance?: 'attended' | 'not_attended' | 'not_marked'; // For actual attendance updates
  source?: 'whatsapp' | 'guest_link' | 'guest_count'; // Source of the update - 'whatsapp' for button clicks, 'guest_link' for link responses, 'guest_count' for count inputs
}

class WebhookService {
  private pollingInterval: number | null = null;
  private isPolling = false;
  private processedUpdates = new Set<string>(); // Track processed updates to show toast only once
  private manualChanges = new Map<string, number>(); // Track manual changes: "eventId-guestId" -> timestamp
  private readonly MANUAL_CHANGE_PROTECTION_TIME = 10000; // 10 seconds protection after manual change - reduced for faster sync

  // Getter to check if polling is active
  get pollingActive(): boolean {
    return this.isPolling;
  }

  // Start polling for webhook updates
  startPolling(intervalMs: number = 5000) {
    // If already polling, restart with new interval (for faster updates after campaign send)
    if (this.isPolling) {
      console.log(`🔄 Webhook polling already active - restarting with ${intervalMs}ms interval for faster updates`);
      this.stopPolling();
    }

    this.isPolling = true;
    console.log(`🔄 Starting webhook polling every ${intervalMs}ms`);
    console.log(`📡 Backend URL: ${BACKEND_URL}`);
    console.log(`📡 VITE_BACKEND_URL env var: ${import.meta.env.VITE_BACKEND_URL || 'NOT SET (using default)'}`);
    console.log(`💡 Note: Backend must be running on port 3002 for button clicks to work`);
    console.log(`👂 System is now actively listening for guest responses...`);

    this.pollingInterval = window.setInterval(async () => {
      await this.checkForUpdates();
    }, intervalMs);

    // Also check immediately (but don't show error if backend is not running)
    this.checkForUpdates().catch((error) => {
      // Log error for debugging but don't show to user
      console.log('⚠️ Initial webhook check failed (backend might not be running yet):', error.message);
    });
  }

  // Stop polling
  stopPolling() {
    if (this.pollingInterval !== null) {
      clearInterval(this.pollingInterval);
      this.pollingInterval = null;
      this.isPolling = false;
      console.log('⏹️ Stopped webhook polling');
    }
  }

  // Check for updates from backend
  private async checkForUpdates() {
    try {
      // Use AbortController for timeout (compatible with older browsers)
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000);
      
      const response = await fetch(`${BACKEND_URL}/api/guests/pending-updates`, {
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        console.error('❌ Failed to fetch pending updates:', response.status);
        return;
      }

      const data = await response.json();
      console.log(`📡 Backend response at ${new Date().toLocaleTimeString()}:`, {
        success: data.success,
        updatesCount: data.updates?.length || 0,
        totalPending: data.totalPending || 0,
        updates: data.updates
      });
      
      if (data.success && data.updates && data.updates.length > 0) {
        console.log(`📨 Found ${data.updates.length} pending updates:`, data.updates);
        await this.processUpdates(data.updates);
      } else {
        // Log when no updates found (for debugging)
        if (data.success) {
          console.log(`📭 No pending updates (checked at ${new Date().toLocaleTimeString()}, total pending in backend: ${data.totalPending || 0})`);
        }
      }
    } catch (error: any) {
      // Only log if it's not a connection refused error (backend not running)
      if (error.name !== 'TypeError' || !error.message.includes('Failed to fetch')) {
        console.error('❌ Error checking for updates:', error);
      }
      // Silently ignore connection refused - backend might not be running
      // This is expected in development if backend is not started
    }
  }

  // Process webhook updates
  private async processUpdates(updates: WebhookUpdate[]) {
    console.log(`🔄 Processing ${updates.length} update(s)...`);
    // Import store dynamically to avoid circular dependencies
    const store = await import('../store/eventStore');
    const { useEventStore } = store;
    const state = useEventStore.getState();
    const { events, updateGuestResponse } = state;

    console.log(`📊 Total events in store: ${events.length}`);
    if (events.length === 0) {
      console.warn('⚠️ No events found in store!');
      return;
    }

    for (const update of updates) {
      try {
        // Log update source for debugging
        console.log(`🔍 Processing update:`, {
          phoneNumber: update.phoneNumber,
          status: update.status,
          source: update.source || 'undefined (will NOT send yes message)',
          guestCount: update.guestCount,
          actualAttendance: update.actualAttendance
        });
        
        // Handle guest count updates (updates with guestCount, with or without status)
        // CRITICAL: Check guestCount first, even if there's also a status
        if (update.guestCount !== undefined) {
          // CRITICAL: Find guest by guestId if available (for guest_link updates), otherwise by phone number
          let foundGuest: any = null;
          let foundEventId: string | null = null;

          // If guestId is provided (from guest_link), use it for precise matching
          if (update.guestId && update.eventId) {
            const event = events.find(e => e.id === update.eventId);
            if (event) {
              const guest = event.guests?.find((g: any) => g.id === update.guestId);
              if (guest) {
                foundGuest = guest;
                foundEventId = event.id;
                console.log(`✅ Found guest by ID: ${foundGuest.firstName} ${foundGuest.lastName} (${update.guestId}) in event ${update.eventId}`);
              } else {
                console.warn(`⚠️ Guest with ID ${update.guestId} not found in event ${update.eventId}, falling back to phone number search`);
              }
            } else {
              console.warn(`⚠️ Event with ID ${update.eventId} not found, falling back to phone number search`);
            }
          }

          // Fallback to phone number search if guestId not found or not provided
          if (!foundGuest) {
            for (const event of events) {
              const guest = event.guests?.find((g: any) => {
                const guestPhone = (g.phoneNumber || '').replace(/[^0-9]/g, '');
                const updatePhone = (update.phoneNumber || '').replace(/[^0-9]/g, '');
                const guestPhoneWith0 = guestPhone.replace(/^972/, '0');
                const updatePhoneWith0 = updatePhone.replace(/^972/, '0');
                const guestPhoneWith972 = '972' + guestPhone.replace(/^0/, '');
                const updatePhoneWith972 = '972' + updatePhone.replace(/^0/, '');
                
                return guestPhone === updatePhone || 
                       guestPhone === updatePhoneWith0 ||
                       guestPhone === updatePhoneWith972 ||
                       guestPhoneWith0 === updatePhone ||
                       guestPhoneWith0 === updatePhoneWith0 ||
                       guestPhoneWith972 === updatePhone ||
                       guestPhoneWith972 === updatePhoneWith972;
              });

              if (guest) {
                foundGuest = guest;
                foundEventId = event.id;
                break;
              }
            }
          }

          if (foundGuest && foundEventId) {
            const guestKey = `${foundEventId}-${foundGuest.id}`;
            
            // CRITICAL: Check if there was a manual change recently
            const lastManualChange = this.manualChanges.get(guestKey);
            const now = Date.now();
            if (lastManualChange && (now - lastManualChange) < this.MANUAL_CHANGE_PROTECTION_TIME) {
              const timeSinceManualChange = Math.round((now - lastManualChange) / 1000);
              console.log(`🛡️ BLOCKING guest count update - manual change detected ${timeSinceManualChange}s ago for ${foundGuest.firstName} ${foundGuest.lastName}. Protection active for ${this.MANUAL_CHANGE_PROTECTION_TIME / 1000}s.`);
              // Remove from backend to prevent it from being processed again
              try {
                const removeResponse = await fetch(`${BACKEND_URL}/api/guests/pending-updates`, {
                  method: 'DELETE',
                  headers: {
                    'Content-Type': 'application/json',
                  },
                  body: JSON.stringify({
                    phoneNumber: update.phoneNumber,
                    guestCount: update.guestCount
                  })
                });
                if (removeResponse.ok) {
                  console.log(`✅ Removed blocked guest count update from backend`);
                }
              } catch (error) {
                console.warn('⚠️ Could not remove blocked guest count update from backend:', error);
              }
              continue; // Skip this update
            }

            // Check if guestCount is different from current value
            if (foundGuest.guestCount === update.guestCount) {
              console.log(`⏭️ Skipping guest count update - already matches current value (${update.guestCount})`);
              // Remove only the guestCount part from backend, but keep the update if there's also a status
              try {
                const removeResponse = await fetch(`${BACKEND_URL}/api/guests/pending-updates`, {
                  method: 'DELETE',
                  headers: {
                    'Content-Type': 'application/json',
                  },
                  body: JSON.stringify({
                    phoneNumber: update.phoneNumber,
                    guestCount: update.guestCount
                    // Don't include status here - if there's a status, it will be processed separately
                  })
                });
                if (removeResponse.ok) {
                  console.log(`✅ Removed duplicate guest count update from backend`);
                }
              } catch (error) {
                console.warn('⚠️ Could not remove duplicate guest count update from backend:', error);
              }
              // CRITICAL: If there's also a status in this update, continue to process it below
              // Otherwise, skip to next update
              if (!update.status) {
                continue; // Move to next update (only guestCount, no status)
              }
              // If there's a status, fall through to process it below
            }

            // Update guest count
            console.log(`✅ Updating guest count for ${foundGuest.firstName} ${foundGuest.lastName} from ${foundGuest.guestCount} to ${update.guestCount}`);
            const updatedGuest = {
              ...foundGuest,
              guestCount: update.guestCount
            };

            await updateGuestResponse(foundEventId, foundGuest.id, updatedGuest);
            
            // Remove from backend - remove only the guestCount part if there's also a status
            // If there's a status, we'll process it separately below
            try {
              const removeResponse = await fetch(`${BACKEND_URL}/api/guests/pending-updates`, {
                method: 'DELETE',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  phoneNumber: update.phoneNumber,
                  guestCount: update.guestCount
                  // Don't include status here - if there's a status, it will be processed separately
                })
              });
              if (removeResponse.ok) {
                console.log(`✅ Removed processed guest count update from backend`);
              }
            } catch (error) {
              console.warn('⚠️ Could not remove guest count update from backend:', error);
            }
            
            // If there's also a status in this update, continue to process it below
            // Otherwise, skip to next update
            if (!update.status) {
              continue; // Move to next update (only guestCount, no status)
            }
            // If there's a status, fall through to process it below
          } else {
            console.log(`⏭️ Guest not found for guest count update, removing from backend`);
            // Remove from backend if guest not found
            try {
              const removeResponse = await fetch(`${BACKEND_URL}/api/guests/pending-updates`, {
                method: 'DELETE',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  phoneNumber: update.phoneNumber,
                  guestCount: update.guestCount
                })
              });
              if (removeResponse.ok) {
                console.log(`✅ Removed orphaned guest count update from backend`);
              }
            } catch (error) {
              console.warn('⚠️ Could not remove orphaned guest count update from backend:', error);
            }
            // If there's also a status, continue to process it below
            if (!update.status) {
              continue; // Move to next update (only guestCount, no status)
            }
            // If there's a status, fall through to process it below
          }
        }
        
        // Handle actualAttendance updates (updates with actualAttendance, with or without status)
        if (update.actualAttendance !== undefined && !update.status && update.guestCount === undefined) {
          // Find guest by phone number
          let foundGuest: any = null;
          let foundEventId: string | null = null;

          for (const event of events) {
            const guest = event.guests?.find((g: any) => {
              const guestPhone = (g.phoneNumber || '').replace(/[^0-9]/g, '');
              const updatePhone = (update.phoneNumber || '').replace(/[^0-9]/g, '');
              const guestPhoneWith0 = guestPhone.replace(/^972/, '0');
              const updatePhoneWith0 = updatePhone.replace(/^972/, '0');
              return guestPhone === updatePhone || guestPhoneWith0 === updatePhoneWith0 || guestPhone === updatePhoneWith0 || guestPhoneWith0 === updatePhone;
            });
            if (guest) {
              foundGuest = guest;
              foundEventId = event.id;
              break;
            }
          }

          if (foundGuest && foundEventId) {
            // Check if actualAttendance is different from current value
            if (foundGuest.actualAttendance === update.actualAttendance) {
              console.log(`⏭️ Skipping actualAttendance update - already matches current value (${update.actualAttendance})`);
              // Remove from backend
              try {
                const removeResponse = await fetch(`${BACKEND_URL}/api/guests/pending-updates`, {
                  method: 'DELETE',
                  headers: {
                    'Content-Type': 'application/json',
                  },
                  body: JSON.stringify({
                    phoneNumber: update.phoneNumber,
                    actualAttendance: update.actualAttendance
                  })
                });
                if (removeResponse.ok) {
                  console.log(`✅ Removed duplicate actualAttendance update from backend`);
                }
              } catch (error) {
                console.warn('⚠️ Could not remove duplicate actualAttendance update from backend:', error);
              }
              continue; // Move to next update
            } else {
              // Update actualAttendance
              console.log(`✅ Updating actualAttendance for ${foundGuest.firstName} ${foundGuest.lastName} from ${foundGuest.actualAttendance} to ${update.actualAttendance}`);
              const updatedGuest = {
                ...foundGuest,
                actualAttendance: update.actualAttendance
              };

              await updateGuestResponse(foundEventId, foundGuest.id, updatedGuest);
              
              // Remove from backend
              try {
                const removeResponse = await fetch(`${BACKEND_URL}/api/guests/pending-updates`, {
                  method: 'DELETE',
                  headers: {
                    'Content-Type': 'application/json',
                  },
                  body: JSON.stringify({
                    phoneNumber: update.phoneNumber,
                    actualAttendance: update.actualAttendance
                  })
                });
                if (removeResponse.ok) {
                  console.log(`✅ Removed processed actualAttendance update from backend`);
                }
              } catch (error) {
                console.warn('⚠️ Could not remove actualAttendance update from backend:', error);
              }
              continue; // Move to next update
            }
          } else {
            console.log(`⏭️ Guest not found for actualAttendance update, removing from backend`);
            // Remove from backend if guest not found
            try {
              const removeResponse = await fetch(`${BACKEND_URL}/api/guests/pending-updates`, {
                method: 'DELETE',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  phoneNumber: update.phoneNumber,
                  actualAttendance: update.actualAttendance
                })
              });
              if (removeResponse.ok) {
                console.log(`✅ Removed orphaned actualAttendance update from backend`);
              }
            } catch (error) {
              console.warn('⚠️ Could not remove orphaned actualAttendance update from backend:', error);
            }
            continue; // Move to next update
          }
        }
        
        // Skip updates without status, guestCount, or actualAttendance
        if (!update.status && update.guestCount === undefined && update.actualAttendance === undefined) {
          console.log(`⏭️ Skipping update without status, guestCount, or actualAttendance:`, update);
          continue;
        }
        
        // Find guest by phone number across all events
        let foundGuest: any = null;
        let foundEventId: string | null = null;

        console.log(`🔍 Searching for guest with phone: ${update.phoneNumber}`);
        console.log(`🔍 Update details:`, {
          phoneNumber: update.phoneNumber,
          status: update.status,
          responseDate: update.responseDate
        });
        
        // CRITICAL: Find guest by guestId if available (for guest_link updates), otherwise by phone number
        // This ensures updates from guest links update the correct guest, even if multiple guests share the same phone number
        if (update.guestId && update.eventId) {
          const event = events.find(e => e.id === update.eventId);
          if (event) {
            const guest = event.guests?.find((g: any) => g.id === update.guestId);
            if (guest) {
              foundGuest = guest;
              foundEventId = event.id;
              console.log(`✅ Found guest by ID: ${foundGuest.firstName} ${foundGuest.lastName} (${update.guestId}) in event ${update.eventId}`);
            } else {
              console.warn(`⚠️ Guest with ID ${update.guestId} not found in event ${update.eventId}, falling back to phone number search`);
            }
          } else {
            console.warn(`⚠️ Event with ID ${update.eventId} not found, falling back to phone number search`);
          }
        }

        // Fallback to phone number search if guestId not found or not provided
        if (!foundGuest) {
          for (const event of events) {
            const guestCount = event.guests?.length || 0;
            console.log(`🔍 Checking event: ${event.coupleName} (${guestCount} guests)`);
            
            if (!event.guests || event.guests.length === 0) {
              console.log(`   ⚠️ Event has no guests`);
              continue;
            }
            
            const guest = event.guests.find(g => {
              // Normalize both phone numbers for comparison
              const guestPhone = (g.phoneNumber || '').replace(/[^0-9]/g, '');
              const updatePhone = (update.phoneNumber || '').replace(/[^0-9]/g, '');
              
              if (!guestPhone || !updatePhone) {
                return false; // Skip if phone numbers are missing
              }
              
              console.log(`   🔍 Comparing: guest="${guestPhone}" (${g.firstName} ${g.lastName}) vs update="${updatePhone}"`);
              
              // Try multiple formats
              const guestPhoneWith972 = guestPhone.startsWith('0') ? '972' + guestPhone.substring(1) : guestPhone;
              const updatePhoneWith972 = updatePhone.startsWith('0') ? '972' + updatePhone.substring(1) : updatePhone;
              const guestPhoneWith0 = guestPhone.startsWith('972') ? '0' + guestPhone.substring(3) : guestPhone;
              const updatePhoneWith0 = updatePhone.startsWith('972') ? '0' + updatePhone.substring(3) : updatePhone;
              
              const matches = guestPhone === updatePhone || 
                     guestPhone === updatePhoneWith0 ||
                     guestPhone === updatePhoneWith972 ||
                     guestPhoneWith972 === updatePhone ||
                     guestPhoneWith972 === updatePhoneWith972 ||
                     guestPhoneWith0 === updatePhone ||
                     guestPhoneWith0 === updatePhoneWith0;
              
              if (matches) {
                console.log(`   ✅ Phone match found! Guest: ${g.firstName} ${g.lastName} (${g.phoneNumber})`);
                console.log(`   ✅ Match details: guestPhone="${guestPhone}", updatePhone="${updatePhone}"`);
              }
              
              return matches;
            });

            if (guest) {
              foundGuest = guest;
              foundEventId = event.id;
              console.log(`✅ Found guest: ${foundGuest.firstName} ${foundGuest.lastName} in event ${foundEventId}`);
              break;
            }
          }
        }

        if (foundGuest && foundEventId) {
          // CRITICAL: Remove ALL previous updates for this guest BEFORE processing the new update
          // This ensures old updates don't interfere with new ones and don't appear in the table
          if (update.guestId && update.eventId) {
            try {
              const removeAllResponse = await fetch(`${BACKEND_URL}/api/guests/pending-updates`, {
                method: 'DELETE',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  phoneNumber: update.phoneNumber,
                  removeAllForPhone: true // Remove all updates for this phone/guest
                })
              });
              if (removeAllResponse.ok) {
                const removeAllData = await removeAllResponse.json();
                console.log(`🗑️ Removed all previous updates for guest BEFORE processing new update: ${removeAllData.removed || 0} update(s) removed`);
              }
            } catch (error) {
              console.warn('⚠️ Could not remove all previous updates from backend:', error);
            }
          }
          
          // Create unique key for this update to avoid duplicate toasts
          const updateKey = `${foundEventId}-${foundGuest.id}-${update.status}-${update.responseDate}`;
          const guestKey = `${foundEventId}-${foundGuest.id}`;
          
          // Check if we already processed this exact update
          const isNewUpdate = !this.processedUpdates.has(updateKey);
          
          // CRITICAL: Check if there was a manual change recently (within protection time)
          const lastManualChange = this.manualChanges.get(guestKey);
          const now = Date.now();
          if (lastManualChange && (now - lastManualChange) < this.MANUAL_CHANGE_PROTECTION_TIME) {
            const timeSinceManualChange = Math.round((now - lastManualChange) / 1000);
            console.log(`🛡️ BLOCKING webhook update - manual change detected ${timeSinceManualChange}s ago for ${foundGuest.firstName} ${foundGuest.lastName}. Protection active for ${this.MANUAL_CHANGE_PROTECTION_TIME / 1000}s.`);
            // Still remove from backend to prevent it from being processed again
            // But only remove this specific status update, not all updates (preserve guestCount updates)
            try {
              const removeResponse = await fetch(`${BACKEND_URL}/api/guests/pending-updates`, {
                method: 'DELETE',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  phoneNumber: update.phoneNumber,
                  status: update.status,
                  responseDate: update.responseDate
                  // Don't use removeAllForPhone - only remove this specific status update
                })
              });
              if (removeResponse.ok) {
                console.log(`✅ Removed blocked status update from backend`);
              }
            } catch (error) {
              console.warn('⚠️ Could not remove blocked update from backend:', error);
            }
            continue; // Skip to next update
          }
          
          // Ensure status is correctly set
          const newStatus = update.status as 'confirmed' | 'declined' | 'pending' | 'maybe';
          
          console.log(`🔍 Checking if update needed for ${foundGuest.firstName} ${foundGuest.lastName}:`, {
            currentStatus: foundGuest.rsvpStatus,
            newStatus: newStatus,
            isNewUpdate: isNewUpdate,
            lastManualChange: lastManualChange ? `${Math.round((now - lastManualChange) / 1000)}s ago` : 'none'
          });
          
          // CRITICAL: Check if there are other fields that need updating (guestCount, actualAttendance, notes, responseDate)
          // Even if status matches, we should still sync other fields if they differ
          const hasGuestCountChange = update.guestCount !== undefined && update.guestCount !== foundGuest.guestCount;
          const hasActualAttendanceChange = update.actualAttendance !== undefined && update.actualAttendance !== foundGuest.actualAttendance;
          const hasResponseDateChange = update.responseDate && foundGuest.responseDate && 
                                       new Date(update.responseDate).getTime() !== new Date(foundGuest.responseDate).getTime();
          
          // CRITICAL: Always sync updates from guest_link OR whatsapp button to ensure cross-device sync
          // Even if status matches, we should still sync if:
          // 1. Update is from guest_link (new update from phone)
          // 2. Update is from whatsapp button (new update from WhatsApp)
          // 3. Other fields changed (guestCount, actualAttendance, responseDate)
          // 4. Status changed
          const isFromGuestLink = update.source === 'guest_link';
          const isFromWhatsApp = update.source === 'whatsapp';
          const shouldSyncEvenIfStatusMatches = isFromGuestLink || isFromWhatsApp || hasGuestCountChange || hasActualAttendanceChange || hasResponseDateChange;
          
          // CRITICAL: Only skip if status matches AND no other fields need updating AND not from guest_link or whatsapp
          // This ensures all updates from guest_link and whatsapp are synced across devices, even if status already matches
          if (foundGuest.rsvpStatus === newStatus && !shouldSyncEvenIfStatusMatches) {
            console.log(`⏭️ Skipping update - status already matches (${newStatus}) and no other fields changed, and not from guest_link.`);
            // CRITICAL: Remove only THIS status update, not all updates (preserve guestCount updates)
            try {
              const removeResponse = await fetch(`${BACKEND_URL}/api/guests/pending-updates`, {
                method: 'DELETE',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  phoneNumber: update.phoneNumber,
                  status: update.status,
                  responseDate: update.responseDate
                  // Don't use removeAllForPhone - only remove this specific status update
                })
              });
              if (removeResponse.ok) {
                const removeData = await removeResponse.json();
                console.log(`✅ Removed duplicate status update from backend (${removeData.removed || 0} update(s) removed)`);
              }
            } catch (error) {
              console.warn('⚠️ Could not remove duplicate status update from backend:', error);
            }
            continue; // Skip to next update
          }
          
          // If status matches but update is from guest_link or whatsapp, log it
          if (foundGuest.rsvpStatus === newStatus && (isFromGuestLink || isFromWhatsApp)) {
            console.log(`🔄 Status matches but update is from ${update.source} - syncing to ensure cross-device consistency`);
          }
          
          // If status matches but other fields changed, log it
          if (foundGuest.rsvpStatus === newStatus && (hasGuestCountChange || hasActualAttendanceChange || hasResponseDateChange)) {
            console.log(`🔄 Status matches but other fields changed - syncing:`, {
              guestCount: hasGuestCountChange ? `${foundGuest.guestCount} → ${update.guestCount}` : 'no change',
              actualAttendance: hasActualAttendanceChange ? `${foundGuest.actualAttendance} → ${update.actualAttendance}` : 'no change',
              responseDate: hasResponseDateChange ? 'changed' : 'no change'
            });
          }
          
          console.log(`✅ Updating guest ${foundGuest.firstName} ${foundGuest.lastName} status to ${update.status}`);
          console.log(`   Current status: ${foundGuest.rsvpStatus}`);
          console.log(`   New status: ${update.status}`);
          console.log(`   Guest ID: ${foundGuest.id}`);
          console.log(`   Event ID: ${foundEventId}`);
          console.log(`   Is new update: ${isNewUpdate}`);
          
          const updatedGuest = {
            ...foundGuest,
            rsvpStatus: newStatus,
            responseDate: new Date(update.responseDate || Date.now()),
            guestCount: update.guestCount !== undefined ? update.guestCount : foundGuest.guestCount,
            actualAttendance: update.actualAttendance !== undefined ? update.actualAttendance : foundGuest.actualAttendance
          };

          console.log(`📤 Calling updateGuestResponse with:`, {
            eventId: foundEventId,
            guestId: foundGuest.id,
            oldStatus: foundGuest.rsvpStatus,
            newStatus: newStatus,
            updatedGuest: {
              ...updatedGuest,
              rsvpStatus: updatedGuest.rsvpStatus
            }
          });

          // Update the guest status
          console.log('🔄 WEBHOOK: About to call updateGuestResponse with:', {
            eventId: foundEventId,
            guestId: foundGuest.id,
            oldStatus: foundGuest.rsvpStatus,
            newStatus: updatedGuest.rsvpStatus,
            guestName: `${foundGuest.firstName} ${foundGuest.lastName}`
          });
          
          await updateGuestResponse(foundEventId, foundGuest.id, updatedGuest);
          
          console.log('✅ WEBHOOK: updateGuestResponse completed');
          
          // Verify immediately after update
          const immediateState = useEventStore.getState();
          const immediateEvent = immediateState.events.find(e => e.id === foundEventId);
          const immediateGuest = immediateEvent?.guests?.find(g => g.id === foundGuest.id);
          console.log('🔍 WEBHOOK: Immediate verification - Guest status:', immediateGuest?.rsvpStatus, 'Expected:', updatedGuest.rsvpStatus);
          
          // Verify the update was applied BEFORE removing from backend
          const verifyState = useEventStore.getState();
          const verifyEvent = verifyState.events.find(e => e.id === foundEventId);
          const verifyGuest = verifyEvent?.guests?.find(g => g.id === foundGuest.id);
          console.log(`🔍 Verification - Guest status after update: ${verifyGuest?.rsvpStatus} (expected: ${newStatus})`);
          
          // Only remove from backend if update was successful
          const updateSuccessful = verifyGuest?.rsvpStatus === newStatus;
          
          if (updateSuccessful) {
            console.log(`✅ Guest status updated successfully in event ${foundEventId}`);
            
            // Send "yes" template message ONLY if guest confirmed via WhatsApp button (not via guest link)
            // CRITICAL: Only send "yes" if this is a NEW status change (not already confirmed)
            // CRITICAL: Do NOT send "yes" if update came from guest_link - guest already confirmed via link, no need for "yes" message
            const isStatusChange = foundGuest.rsvpStatus !== newStatus;
            const isFromGuestLink = update.source === 'guest_link';
            const isFromWhatsApp = update.source === 'whatsapp'; // Only send if explicitly from WhatsApp
            
            // CRITICAL: "yes" template message removed - no longer sending automatically
            // All automatic "yes" template messages have been disabled
            console.log(`ℹ️ Guest confirmed (source: ${update.source || 'undefined'}) - "yes" template message will NOT be sent`);
            console.log(`   Status changed from "${foundGuest.rsvpStatus}" to "${newStatus}"`);
            
            // Mark this update as processed
            this.processedUpdates.add(updateKey);
            
            // IMPORTANT: Remove this update from backend AFTER successful update
            // Note: All previous updates for this guest were already removed BEFORE processing (see above)
            setTimeout(async () => {
              try {
                // Remove this specific update (all previous ones were already removed)
                const removeResponse = await fetch(`${BACKEND_URL}/api/guests/pending-updates`, {
                  method: 'DELETE',
                  headers: {
                    'Content-Type': 'application/json',
                  },
                  body: JSON.stringify({
                    phoneNumber: update.phoneNumber,
                    status: update.status,
                    responseDate: update.responseDate,
                    guestCount: update.guestCount, // Include guestCount for matching
                    guestId: update.guestId, // Include guestId for precise matching
                    eventId: update.eventId // Include eventId for precise matching
                  })
                });
                if (removeResponse.ok) {
                  const removeData = await removeResponse.json();
                  console.log(`✅ Removed processed update from backend: ${removeData.removed || 1} update(s) removed`);
                } else {
                  const errorText = await removeResponse.text();
                  console.warn('⚠️ Failed to remove update from backend:', removeResponse.status, errorText);
                }
              } catch (error) {
                console.warn('⚠️ Could not remove update from backend (will be cleaned up automatically):', error);
              }
            }, 500); // Wait 500ms before removing to ensure UI has updated
          } else {
            console.error(`❌ STATUS UPDATE FAILED! Expected: ${newStatus}, Got: ${verifyGuest?.rsvpStatus}`);
            console.error(`❌ Keeping update in backend for retry`);
            // Don't mark as processed and don't remove from backend - allow retry
          }
          
          // CRITICAL: Force refresh events from store to ensure UI updates immediately
          // This ensures the table in EventManagement updates immediately after WhatsApp button click
          const refreshedState = useEventStore.getState();
          const refreshedEvent = refreshedState.events.find(e => e.id === foundEventId);
          const refreshedGuest = refreshedEvent?.guests?.find(g => g.id === foundGuest.id);
          console.log(`🔄 Refreshed guest status: ${refreshedGuest?.rsvpStatus}`);
          
          // CRITICAL: Force MULTIPLE refreshes to ensure all components see the update
          // This ensures the table in EventManagement updates immediately
          for (let i = 0; i < 3; i++) {
            setTimeout(() => {
              refreshedState.fetchEvents(false, true).catch(err => {
                console.warn(`⚠️ Failed to refresh events after WhatsApp update (attempt ${i + 1}):`, err);
              });
            }, 50 * (i + 1)); // 50ms, 100ms, 150ms
          }
          
          console.log('🔄 Triggered multiple fetchEvents calls to ensure table updates');
          
          // Show toast notification only once per unique update
          if (isNewUpdate) {
            const toast = await import('react-hot-toast');
            const statusText = update.status === 'confirmed' ? 'אישר הגעה' : 
                             update.status === 'declined' ? 'דחה הזמנה' : 
                             'עדכן סטטוס';
            toast.default.success(`סטטוס עודכן: ${foundGuest.firstName} ${foundGuest.lastName} - ${statusText}`, {
              duration: 4000,
              id: updateKey // Use unique ID to prevent duplicate toasts
            });
          }
        } else {
          console.warn(`⚠️ Guest not found for phone number: ${update.phoneNumber}`);
          console.warn(`⚠️ Available guests:`, events.flatMap(e => e.guests?.map(g => ({
            name: `${g.firstName} ${g.lastName}`,
            phone: g.phoneNumber,
            phoneNormalized: g.phoneNumber.replace(/[^0-9]/g, '')
          })) || []));
        }
      } catch (error) {
        console.error(`❌ Error processing update for ${update.phoneNumber}:`, error);
      }
    }
  }

  // Update guest status directly (called from webhook handler)
  async updateGuestStatusByPhone(phoneNumber: string, status: 'confirmed' | 'declined', eventId?: string) {
    // Import store dynamically to avoid circular dependencies
    const store = await import('../store/eventStore');
    const { useEventStore } = store;
    const state = useEventStore.getState();
    const { events, updateGuestResponse } = state;

    // Format phone number
    const formattedPhone = phoneNumber.replace(/^972/, '0').replace(/[^0-9]/g, '');

    // Find guest by phone number
    let foundGuest: any = null;
    let foundEventId: string | null = eventId || null;

    if (foundEventId) {
      // If eventId provided, search only in that event
      const event = events.find(e => e.id === foundEventId);
      if (event) {
        foundGuest = event.guests?.find(g => {
          const guestPhone = g.phoneNumber.replace(/[^0-9]/g, '');
          return guestPhone === formattedPhone || guestPhone === formattedPhone.replace(/^0/, '972');
        });
      }
    } else {
      // Search across all events
      for (const event of events) {
        const guest = event.guests?.find(g => {
          const guestPhone = g.phoneNumber.replace(/[^0-9]/g, '');
          return guestPhone === formattedPhone || guestPhone === formattedPhone.replace(/^0/, '972');
        });

        if (guest) {
          foundGuest = guest;
          foundEventId = event.id;
          break;
        }
      }
    }

    if (foundGuest && foundEventId) {
      console.log(`✅ Updating guest ${foundGuest.firstName} ${foundGuest.lastName} status to ${status}`);

      const updatedGuest = {
        ...foundGuest,
        rsvpStatus: status,
        responseDate: new Date()
      };

      await updateGuestResponse(foundEventId, foundGuest.id, updatedGuest);
      return { success: true, guest: updatedGuest };
    } else {
      console.warn(`⚠️ Guest not found for phone number: ${formattedPhone}`);
      return { success: false, error: 'Guest not found' };
    }
  }

  // Mark a manual change to prevent webhook from overwriting it
  markManualChange(eventId: string, guestId: string) {
    const guestKey = `${eventId}-${guestId}`;
    this.manualChanges.set(guestKey, Date.now());
    console.log(`🛡️ Marked manual change for ${guestKey} - webhook updates will be blocked for ${this.MANUAL_CHANGE_PROTECTION_TIME / 1000}s`);
    
    // Clean up old manual change entries (older than protection time)
    const now = Date.now();
    for (const [key, timestamp] of this.manualChanges.entries()) {
      if (now - timestamp > this.MANUAL_CHANGE_PROTECTION_TIME) {
        this.manualChanges.delete(key);
      }
    }
  }
}

export const webhookService = new WebhookService();

