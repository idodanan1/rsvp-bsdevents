import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useEventStore } from '../store/eventStore';
import { Table, Guest } from '../types';
import { Plus, Users, Trash2, Edit, Move, UserPlus, Layout, Search, X, Check, FileText } from 'lucide-react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

const SeatingManagement: React.FC = () => {
  const { id: eventId } = useParams<{ id: string }>();
  const { 
    events,
    currentEvent, 
    setCurrentEvent,
    addTable, 
    updateTable, 
    deleteTable, 
    assignGuestToTable, 
    removeGuestFromTable, 
    moveGuestToTable 
  } = useEventStore();

  useEffect(() => {
    if (eventId) {
      const event = events.find(e => e.id === eventId);
      if (event) {
        setCurrentEvent(event);
      }
    }
  }, [eventId, events, setCurrentEvent]);

  const [showAddTable, setShowAddTable] = useState(false);
  const [showBulkAddTables, setShowBulkAddTables] = useState(false);
  const [editingTable, setEditingTable] = useState<Table | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showGuestSearch, setShowGuestSearch] = useState(false);
  const [showUnassignedPanel, setShowUnassignedPanel] = useState(false);
  const [selectedGuest, setSelectedGuest] = useState<Guest | null>(null);
  const [targetTableId, setTargetTableId] = useState<string>('');
  const [newTable, setNewTable] = useState({
    number: 0,
    name: '',
    capacity: 8,
    notes: ''
  });
  const [bulkTables, setBulkTables] = useState({
    startNumber: 1,
    count: 10,
    capacity: 8,
    namePrefix: 'שולחן'
  });

  const event = currentEvent;
  if (!event) return null;

  const tables = event.tables || [];
  const unassignedGuests = event.guests.filter(guest => !guest.tableId);
  
  // Filter guests based on search term
  const filteredGuests = event.guests.filter(guest => 
    guest.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    guest.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    guest.phoneNumber.includes(searchTerm)
  );

  // Filter confirmed guests who need seating
  const confirmedUnassignedGuests = event.guests.filter(guest => 
    guest.rsvpStatus === 'confirmed' && !guest.tableId
  );

  const handleAddTable = async () => {
    if (newTable.number <= 0 || newTable.capacity <= 0 || !eventId) return;
    
    try {
      await addTable(eventId, {
        ...newTable,
        guests: [],
        x: 100,
        y: 100,
        width: 100,
        height: 60,
        rotation: 0,
        shape: 'rectangle'
      });
      alert(`✅ שולחן ${newTable.number} נוצר בהצלחה!`);
      setNewTable({ number: 0, name: '', capacity: 8, notes: '' });
      setShowAddTable(false);
    } catch (error) {
      console.error('Error creating table:', error);
      alert('❌ שגיאה ביצירת השולחן: ' + error);
    }
  };

  const handleBulkAddTables = async () => {
    if (bulkTables.count <= 0 || bulkTables.capacity <= 0 || !eventId) return;
    
    try {
      // Find the next available table number
      const existingNumbers = tables.map(t => t.number);
      const maxNumber = existingNumbers.length > 0 ? Math.max(...existingNumbers) : 0;
      const startNumber = Math.max(bulkTables.startNumber, maxNumber + 1);
      
      // Create multiple tables
      for (let i = 0; i < bulkTables.count; i++) {
        const tableNumber = startNumber + i;
        const tableName = bulkTables.namePrefix ? `${bulkTables.namePrefix} ${tableNumber}` : '';
        
        await addTable(eventId, {
          number: tableNumber,
          name: tableName,
          capacity: bulkTables.capacity,
          notes: '',
          guests: [],
          x: 100 + (i % 4) * 150,
          y: 100 + Math.floor(i / 4) * 120,
          width: 100,
          height: 60,
          rotation: 0,
          shape: 'rectangle'
        });
      }
      
      alert(`✅ נוצרו ${bulkTables.count} שולחנות בהצלחה!`);
      setBulkTables({ startNumber: 1, count: 10, capacity: 8, namePrefix: 'שולחן' });
      setShowBulkAddTables(false);
    } catch (error) {
      console.error('Error creating bulk tables:', error);
      alert('❌ שגיאה ביצירת השולחנות: ' + error);
    }
  };

  const handleUpdateTable = async (tableId: string, updates: Partial<Table>) => {
    if (!eventId) return;
    await updateTable(eventId, tableId, updates);
    setEditingTable(null);
  };

  const handleDeleteTable = async (tableId: string) => {
    if (!eventId) return;
    if (window.confirm('האם אתה בטוח שברצונך למחוק את השולחן?')) {
      await deleteTable(eventId, tableId);
    }
  };

  const handleAssignGuest = async (guestId: string, tableId: string, seatNumber?: number) => {
    if (!eventId) return;
    await assignGuestToTable(eventId, guestId, tableId, seatNumber);
  };

  const handleRemoveGuest = async (guestId: string) => {
    if (!eventId) return;
    await removeGuestFromTable(eventId, guestId);
  };

  const handleMoveGuest = async (guestId: string, newTableId: string, newSeatNumber?: number) => {
    if (!eventId) return;
    await moveGuestToTable(eventId, guestId, newTableId, newSeatNumber);
  };

  const handleAssignGuestToTable = async (guestId: string, tableId: string) => {
    if (!eventId || !tableId) return;
    
    await assignGuestToTable(eventId, guestId, tableId);
    setSelectedGuest(null);
    setTargetTableId('');
  };

  const handleEditTable = (table: Table) => {
    setEditingTable(table);
    setNewTable({
      number: table.number,
      name: table.name || '',
      capacity: table.capacity,
      notes: table.notes || ''
    });
  };

  const handleSaveEditTable = async () => {
    if (!eventId || !editingTable) return;
    
    await updateTable(eventId, editingTable.id, {
      number: newTable.number,
      name: newTable.name,
      capacity: newTable.capacity,
      notes: newTable.notes
    });
    
    setEditingTable(null);
    setNewTable({ number: 0, name: '', capacity: 8, notes: '' });
  };

  const handleExportPDF = async () => {
    if (!event) return;

    // Create a temporary div with the report content
    const reportDiv = document.createElement('div');
    reportDiv.style.position = 'absolute';
    reportDiv.style.left = '-9999px';
    reportDiv.style.top = '0';
    reportDiv.style.width = '800px';
    reportDiv.style.backgroundColor = 'white';
    reportDiv.style.padding = '20px';
    reportDiv.style.fontFamily = 'Arial, sans-serif';
    reportDiv.style.direction = 'rtl';
    reportDiv.style.textAlign = 'right';

        // Load logo image with fallback
        const loadLogo = () => {
          return new Promise<string>((resolve) => {
            const img = new Image();
            img.onload = () => {
              const canvas = document.createElement('canvas');
              const ctx = canvas.getContext('2d');
              canvas.width = 300;
              canvas.height = 150;
              if (ctx) {
                ctx.drawImage(img, 0, 0, 300, 150);
                resolve(canvas.toDataURL('image/png'));
              } else {
                resolve('');
              }
            };
            img.onerror = () => {
              // Fallback: create a simple logo with SVG
              const svgContent = `
                <svg width="300" height="150" xmlns="http://www.w3.org/2000/svg">
                  <rect width="300" height="150" fill="#fff" stroke="#000" stroke-width="2"/>
                  <text x="150" y="40" text-anchor="middle" fill="#FFD700" font-size="24" font-family="Arial">בס"ד</text>
                  <text x="150" y="80" text-anchor="middle" fill="#FFD700" font-size="36" font-weight="bold" font-family="Arial">בסייד</text>
                  <text x="150" y="110" text-anchor="middle" fill="#FFD700" font-size="20" font-family="Arial">אירועים</text>
                  <text x="150" y="135" text-anchor="middle" fill="#FFD700" font-size="14" font-family="Arial">צלמים | הפקות | הושבה</text>
                </svg>
              `;
              const encodedSvg = encodeURIComponent(svgContent);
              resolve('data:image/svg+xml;charset=utf-8,' + encodedSvg);
            };
            img.src = '/images/logo.svg'; // Path to logo image
          });
        };

        const logoDataUrl = await loadLogo();

        const eventDate = new Date(event.eventDate);
    const dateStr = eventDate.toLocaleDateString('he-IL');
    const sortedTables = [...(event.tables || [])].sort((a, b) => a.number - b.number);

        reportDiv.innerHTML = `
          <div style="background-color: #fff; color: #FFD700; padding: 30px; margin: -20px -20px 20px -20px; text-align: center; position: relative; border: 2px solid #FFD700;">
            ${logoDataUrl ? `
              <div style="margin-bottom: 20px;">
                <img src="${logoDataUrl}" alt="בסייד אירועים" style="max-width: 300px; max-height: 150px; object-fit: contain;" />
              </div>
            ` : `
              <div style="position: absolute; top: 10px; right: 20px; font-size: 14px; color: #FFD700;">בס"ד</div>
              <h1 style="margin: 0; font-size: 36px; font-weight: bold; color: #FFD700; text-shadow: 1px 1px 2px rgba(0,0,0,0.3);">בסייד</h1>
              <h2 style="margin: 10px 0 15px 0; font-size: 24px; color: #FFD700;">אירועים</h2>
              <div style="font-size: 18px; color: #FFD700; margin-top: 20px;">
                <span style="margin: 0 10px;">צלמים</span>
                <span style="color: #FFD700;">|</span>
                <span style="margin: 0 10px;">הפקות</span>
                <span style="color: #FFD700;">|</span>
                <span style="margin: 0 10px;">הושבה</span>
              </div>
            `}
            <div style="margin-top: 20px; padding-top: 15px; border-top: 2px solid #FFD700;">
              <h3 style="margin: 0; font-size: 20px; color: #FFD700;">דוח שולחנות</h3>
            </div>
          </div>
      
      <div style="margin-bottom: 20px;">
        <p style="margin: 5px 0; font-size: 14px;"><strong>זוג:</strong> ${event.coupleName}</p>
        <p style="margin: 5px 0; font-size: 14px;"><strong>תאריך:</strong> ${dateStr}</p>
        <p style="margin: 5px 0; font-size: 14px;"><strong>מיקום:</strong> ${event.venue}</p>
      </div>

      <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 12px;">
        <thead>
          <tr style="background-color: #34495e; color: white;">
            <th style="border: 1px solid #ddd; padding: 10px; text-align: center;">מספר שולחן</th>
            <th style="border: 1px solid #ddd; padding: 10px; text-align: center;">שם שולחן</th>
            <th style="border: 1px solid #ddd; padding: 10px; text-align: center;">תפוסה</th>
            <th style="border: 1px solid #ddd; padding: 10px; text-align: center;">אורחים</th>
          </tr>
        </thead>
        <tbody>
          ${sortedTables.map(table => {
            const tableGuests = event.guests.filter(guest => table.guests.includes(guest.id));
            const guestNames = tableGuests.map(guest => 
              `${guest.firstName} ${guest.lastName}${guest.guestCount > 1 ? ` (${guest.guestCount})` : ''}`
            ).join(', ') || 'אין אורחים';
            
            return `
              <tr style="background-color: ${sortedTables.indexOf(table) % 2 === 0 ? '#f8f9fa' : 'white'};">
                <td style="border: 1px solid #ddd; padding: 8px; text-align: center;">שולחן ${table.number}</td>
                <td style="border: 1px solid #ddd; padding: 8px; text-align: center;">${table.name || ''}</td>
                <td style="border: 1px solid #ddd; padding: 8px; text-align: center;">${table.guests.length}/${table.capacity}</td>
                <td style="border: 1px solid #ddd; padding: 8px; text-align: right;">${guestNames}</td>
              </tr>
            `;
          }).join('')}
        </tbody>
      </table>

      <div style="background-color: #ecf0f1; padding: 15px; border-radius: 5px; margin-bottom: 20px;">
        <h3 style="margin: 0 0 10px 0; font-size: 16px;">סיכום כללי</h3>
        <p style="margin: 5px 0; font-size: 12px;"><strong>סה"כ שולחנות:</strong> ${sortedTables.length}</p>
        <p style="margin: 5px 0; font-size: 12px;"><strong>סה"כ מושבים:</strong> ${sortedTables.reduce((sum, table) => sum + table.capacity, 0)}</p>
        <p style="margin: 5px 0; font-size: 12px;"><strong>אורחים יושבים:</strong> ${sortedTables.reduce((sum, table) => sum + table.guests.length, 0)}</p>
        <p style="margin: 5px 0; font-size: 12px;"><strong>מושבים פנויים:</strong> ${sortedTables.reduce((sum, table) => sum + table.capacity, 0) - sortedTables.reduce((sum, table) => sum + table.guests.length, 0)}</p>
      </div>

      <div style="text-align: center; font-size: 10px; color: #7f8c8d; margin-top: 20px; padding: 15px; background-color: #f8f9fa; border-radius: 5px;">
        ${logoDataUrl ? `
          <div style="margin-bottom: 10px;">
            <img src="${logoDataUrl}" alt="בסייד אירועים" style="max-width: 150px; max-height: 75px; object-fit: contain;" />
          </div>
        ` : `
          <div style="color: #FFD700; font-size: 12px; font-weight: bold; margin-bottom: 5px;">בסייד אירועים</div>
          <div style="font-size: 9px; color: #FFD700; margin-bottom: 5px;">צלמים | הפקות | הושבה</div>
        `}
        <p style="margin: 5px 0; color: #666;">נוצר על ידי בס"ד אירועים</p>
        <p style="margin: 5px 0; color: #666;">תאריך יצירה: ${new Date().toLocaleDateString('he-IL')}</p>
      </div>
    `;

    document.body.appendChild(reportDiv);

        try {
          // Convert to canvas
          const canvas = await html2canvas(reportDiv, {
            scale: 2,
            useCORS: true,
            allowTaint: true
          });

      // Create PDF
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const imgWidth = 210;
      const pageHeight = 295;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      let heightLeft = imgHeight;

      let position = 0;

      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;

      while (heightLeft >= 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }

          // Save the PDF
          const fileName = `דוח_שולחנות_${event.coupleName}_${new Date().toISOString().split('T')[0]}.pdf`;
          pdf.save(fileName);
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('שגיאה ביצירת ה-PDF');
    } finally {
      // Clean up
      document.body.removeChild(reportDiv);
    }
  };

  const getTableGuests = (tableId: string) => {
    return event.guests.filter(guest => guest.tableId === tableId);
  };

  const getAvailableSeats = (table: Table) => {
    const assignedGuests = getTableGuests(table.id);
    const totalSeats = table.capacity;
    const occupiedSeats = assignedGuests.length;
    return totalSeats - occupiedSeats;
  };

  // Calculate guest statistics
  const totalGuests = event.guests.reduce((sum, guest) => sum + guest.guestCount, 0);
  const seatedGuests = event.guests
    .filter(guest => guest.tableId)
    .reduce((sum, guest) => sum + guest.guestCount, 0);
  const unassignedGuestsCount = totalGuests - seatedGuests;

  return (
    <div className="flex h-screen">
      {/* Left Sidebar - Unassigned Guests */}
      {showUnassignedPanel && (
        <div className="w-80 bg-white border-l border-gray-200 p-4 overflow-y-auto">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-800">אורחים ממתינים</h3>
            <button
              onClick={() => setShowUnassignedPanel(false)}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          
          <div className="text-sm text-gray-600 mb-4">
            {confirmedUnassignedGuests.length} אורחים אישרו הגעה ונותר להושיב
          </div>
          
          <div className="space-y-2">
            {confirmedUnassignedGuests.map((guest) => (
              <div key={guest.id} className="bg-gray-50 p-3 rounded-lg border border-gray-200">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <div className="font-medium text-gray-800">
                      {guest.firstName} {guest.lastName}
                    </div>
                    <div className="text-sm text-gray-600">
                      {guest.phoneNumber}
                    </div>
                    {guest.guestCount > 1 && (
                      <div className="text-xs text-blue-600">
                        +{guest.guestCount - 1} נוספים
                      </div>
                    )}
                  </div>
                  <div className="text-xs text-green-600 bg-green-100 px-2 py-1 rounded">
                    אישר הגעה
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  <select
                    value={targetTableId}
                    onChange={(e) => setTargetTableId(e.target.value)}
                    className="flex-1 text-sm border border-gray-300 rounded px-2 py-1"
                  >
                    <option value="">בחר שולחן</option>
                    {tables.map((table) => {
                      const availableSeats = getAvailableSeats(table);
                      return availableSeats >= guest.guestCount ? (
                        <option key={table.id} value={table.id}>
                          שולחן {table.number} ({availableSeats} מקומות)
                        </option>
                      ) : null;
                    })}
                  </select>
                  {targetTableId && (
                    <button
                      onClick={() => handleAssignGuestToTable(guest.id, targetTableId)}
                      className="bg-green-600 text-white px-3 py-1 rounded text-sm hover:bg-green-700 flex items-center gap-1"
                    >
                      <Check className="w-3 h-3" />
                      הושב
                    </button>
                  )}
                </div>
              </div>
            ))}
            
            {confirmedUnassignedGuests.length === 0 && (
              <div className="text-center text-gray-500 py-8">
                <Users className="w-12 h-12 text-gray-300 mx-auto mb-2" />
                <p>כל האורחים שאישרו הגעה כבר יושבים!</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 p-6 bg-gradient-to-br from-gray-50 to-white">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <div className="flex items-center gap-4">
          <h2 className="text-3xl font-bold text-gray-900 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            סידורי הושבה
          </h2>
          <Link
            to={`/event/${eventId}/manage`}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center gap-2 shadow-md hover:shadow-lg transition-all font-medium"
          >
            <Users className="w-4 h-4" />
            ניהול
          </Link>
        </div>
        <div className="flex flex-wrap gap-3">
          <Link
            to={`/event/${eventId}/venue`}
            className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 flex items-center gap-2 shadow-md hover:shadow-lg transition-all font-medium"
          >
            <Layout className="w-4 h-4" />
            עורך סקיצה
          </Link>
          <button
            onClick={handleExportPDF}
            className="bg-orange-600 text-white px-4 py-2 rounded-lg hover:bg-orange-700 flex items-center gap-2 shadow-md hover:shadow-lg transition-all font-medium"
          >
            <FileText className="w-4 h-4" />
            ייצא PDF
          </button>
          <button
            onClick={() => setShowBulkAddTables(true)}
            className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 flex items-center gap-2 shadow-md hover:shadow-lg transition-all font-medium"
          >
            <Plus className="w-4 h-4" />
            הוסף שולחנות מרובים
          </button>
          <button
            onClick={() => setShowAddTable(true)}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center gap-2 shadow-md hover:shadow-lg transition-all font-medium"
          >
            <Plus className="w-4 h-4" />
            הוסף שולחן יחיד
          </button>
        </div>
      </div>

      {/* Guest Statistics */}
      <div className="mb-6 grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-5 rounded-xl text-center border-2 border-blue-300 shadow-md hover:shadow-lg transition-shadow">
          <div className="text-3xl font-bold text-blue-700 mb-1">{totalGuests}</div>
          <div className="text-sm font-semibold text-blue-600">סה"כ אורחים</div>
        </div>
        <div className="bg-gradient-to-br from-green-50 to-green-100 p-5 rounded-xl text-center border-2 border-green-300 shadow-md hover:shadow-lg transition-shadow">
          <div className="text-3xl font-bold text-green-700 mb-1">{seatedGuests}</div>
          <div className="text-sm font-semibold text-green-600">יושבים</div>
        </div>
        <div className="bg-gradient-to-br from-orange-50 to-orange-100 p-5 rounded-xl text-center border-2 border-orange-300 shadow-md hover:shadow-lg transition-shadow">
          <div className="text-3xl font-bold text-orange-700 mb-1">{unassignedGuestsCount}</div>
          <div className="text-sm font-semibold text-orange-600">נותר להושיב</div>
        </div>
      </div>

      {/* Guest Search */}
      <div className="mb-6 bg-white p-4 rounded-lg shadow-sm border border-gray-200">
        <div className="flex items-center gap-4 mb-4">
          <div className="flex-1 relative">
            <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="חיפוש אורחים..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pr-10 pl-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <button
            onClick={() => setShowGuestSearch(!showGuestSearch)}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center gap-2"
          >
            <UserPlus className="w-4 h-4" />
            הושב אורח
          </button>
          <button
            onClick={() => setShowUnassignedPanel(!showUnassignedPanel)}
            className="bg-orange-600 text-white px-4 py-2 rounded-lg hover:bg-orange-700 flex items-center gap-2"
          >
            <Users className="w-4 h-4" />
            אורחים ממתינים ({confirmedUnassignedGuests.length})
          </button>
        </div>
        
        {searchTerm && (
          <div className="mt-4">
            <h4 className="text-sm font-medium text-gray-700 mb-2">תוצאות חיפוש:</h4>
            <div className="max-h-40 overflow-y-auto space-y-2">
              {filteredGuests.map((guest) => (
                <div key={guest.id} className="flex items-center justify-between bg-gray-50 p-2 rounded-lg">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-gray-800">
                      {guest.firstName} {guest.lastName}
                    </span>
                    {guest.tableId && (
                      <span className="text-xs text-green-600 bg-green-100 px-2 py-1 rounded">
                        יושב בשולחן {tables.find(t => t.id === guest.tableId)?.number}
                      </span>
                    )}
                    {!guest.tableId && (
                      <span className="text-xs text-orange-600 bg-orange-100 px-2 py-1 rounded">
                        ללא שולחן
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {!guest.tableId && (
                      <select
                        value={targetTableId}
                        onChange={(e) => setTargetTableId(e.target.value)}
                        className="text-xs border border-gray-300 rounded px-2 py-1"
                      >
                        <option value="">בחר שולחן</option>
                        {tables.map((table) => {
                          const availableSeats = getAvailableSeats(table);
                          return availableSeats > 0 ? (
                            <option key={table.id} value={table.id}>
                              שולחן {table.number} ({availableSeats} מקומות)
                            </option>
                          ) : null;
                        })}
                      </select>
                    )}
                    {!guest.tableId && targetTableId && (
                      <button
                        onClick={() => handleAssignGuestToTable(guest.id, targetTableId)}
                        className="text-green-600 hover:text-green-800 p-1"
                        title="הושב בשולחן"
                      >
                        <Check className="w-4 h-4" />
                      </button>
                    )}
                    {guest.tableId && (
                      <button
                        onClick={() => handleRemoveGuest(guest.id)}
                        className="text-red-600 hover:text-red-800 p-1"
                        title="הסר משולחן"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
              {filteredGuests.length === 0 && (
                <div className="text-center text-gray-500 py-4">
                  לא נמצאו אורחים התואמים לחיפוש
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Add Table Modal */}
      {showAddTable && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-96">
            <h3 className="text-lg font-semibold mb-4">הוסף שולחן חדש</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  מספר שולחן
                </label>
                <input
                  type="number"
                  value={newTable.number}
                  onChange={(e) => setNewTable({ ...newTable, number: parseInt(e.target.value) || 0 })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                  placeholder="1"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  שם השולחן (אופציונלי)
                </label>
                <input
                  type="text"
                  value={newTable.name}
                  onChange={(e) => setNewTable({ ...newTable, name: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                  placeholder="שולחן משפחה"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  כמות מושבים
                </label>
                <input
                  type="number"
                  value={newTable.capacity}
                  onChange={(e) => setNewTable({ ...newTable, capacity: parseInt(e.target.value) || 8 })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                  placeholder="8"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  הערות
                </label>
                <textarea
                  value={newTable.notes}
                  onChange={(e) => setNewTable({ ...newTable, notes: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                  rows={3}
                  placeholder="הערות נוספות..."
                />
              </div>
            </div>
            <div className="flex gap-2 mt-6">
              <button
                onClick={handleAddTable}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
              >
                הוסף
              </button>
              <button
                onClick={() => setShowAddTable(false)}
                className="bg-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-400"
              >
                ביטול
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Add Tables Modal */}
      {showBulkAddTables && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-96">
            <h3 className="text-lg font-semibold mb-4">הוסף שולחנות מרובים</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  מספר שולחן התחלה
                </label>
                <input
                  type="number"
                  value={bulkTables.startNumber}
                  onChange={(e) => setBulkTables({ ...bulkTables, startNumber: parseInt(e.target.value) || 1 })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                  placeholder="1"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  כמות שולחנות
                </label>
                <input
                  type="number"
                  value={bulkTables.count}
                  onChange={(e) => setBulkTables({ ...bulkTables, count: parseInt(e.target.value) || 10 })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                  placeholder="10"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  כמות מושבים לכל שולחן
                </label>
                <input
                  type="number"
                  value={bulkTables.capacity}
                  onChange={(e) => setBulkTables({ ...bulkTables, capacity: parseInt(e.target.value) || 8 })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                  placeholder="8"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  קידומת שם (אופציונלי)
                </label>
                <input
                  type="text"
                  value={bulkTables.namePrefix}
                  onChange={(e) => setBulkTables({ ...bulkTables, namePrefix: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                  placeholder="שולחן"
                />
              </div>
              <div className="bg-blue-50 p-3 rounded-lg">
                <p className="text-sm text-blue-800">
                  <strong>תצוגה מקדימה:</strong> ייווצרו {bulkTables.count} שולחנות 
                  {bulkTables.startNumber > 0 && ` (${bulkTables.startNumber} - ${bulkTables.startNumber + bulkTables.count - 1})`}
                  {bulkTables.namePrefix && ` עם השם "${bulkTables.namePrefix}"`}
                  {` עם ${bulkTables.capacity} מושבים כל אחד`}
                </p>
              </div>
            </div>
            <div className="flex gap-2 mt-6">
              <button
                onClick={handleBulkAddTables}
                className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700"
              >
                צור שולחנות
              </button>
              <button
                onClick={() => setShowBulkAddTables(false)}
                className="bg-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-400"
              >
                ביטול
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Tables Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        {tables.map((table) => {
          const tableGuests = getTableGuests(table.id);
          const availableSeats = getAvailableSeats(table);
          
          return (
            <div key={table.id} className="bg-gradient-to-br from-green-50 to-white border-2 border-green-200 rounded-xl p-5 shadow-md hover:shadow-lg transition-shadow">
              <div className="flex justify-between items-start mb-4">
                <div className="flex items-start gap-3">
                  
                  <div className="flex-1">
                    <h3 className="text-base font-bold text-gray-900 mb-1">
                      שולחן {table.number}
                      {table.name && <span className="text-gray-600 font-normal"> - {table.name}</span>}
                    </h3>
                    <p className="text-sm font-medium text-gray-700 mb-1">
                      {tableGuests.length} / {table.capacity} מושבים
                    </p>
                    {availableSeats > 0 && (
                      <p className="text-sm font-semibold text-green-700 bg-green-100 px-2 py-1 rounded-md inline-block">
                        {availableSeats} מושבים פנויים
                      </p>
                    )}
                    {availableSeats === 0 && (
                      <p className="text-sm font-semibold text-orange-700 bg-orange-100 px-2 py-1 rounded-md inline-block">
                        שולחן מלא
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setEditingTable(table)}
                    className="text-blue-600 hover:text-blue-800 hover:bg-blue-50 p-1 rounded transition-colors"
                    title="ערוך שולחן"
                  >
                    <Edit className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDeleteTable(table.id)}
                    className="text-red-600 hover:text-red-800 hover:bg-red-50 p-1 rounded transition-colors"
                    title="מחק שולחן"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Table Guests */}
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {tableGuests.length > 0 ? (
                  tableGuests.map((guest, index) => (
                    <div key={guest.id} className="flex items-center justify-between bg-white border border-gray-200 rounded-lg p-3 hover:bg-gray-50 transition-colors">
                      <div className="flex items-center gap-2 flex-1">
                        <span className="text-sm font-bold text-blue-600 min-w-[20px]">
                          {guest.seatNumber || index + 1}.
                        </span>
                        <span className="text-sm font-medium text-gray-800">
                          {guest.firstName} {guest.lastName}
                        </span>
                        {guest.guestCount > 1 && (
                          <span className="text-xs font-semibold text-blue-600 bg-blue-50 px-2 py-0.5 rounded">
                            +{guest.guestCount - 1}
                          </span>
                        )}
                      </div>
                      <button
                        onClick={() => handleRemoveGuest(guest.id)}
                        className="text-red-500 hover:text-red-700 hover:bg-red-50 text-xs font-medium px-2 py-1 rounded transition-colors"
                        title="הסר אורח מהשולחן"
                      >
                        הסר
                      </button>
                    </div>
                  ))
                ) : (
                  <div className="text-center text-gray-400 text-sm py-4 bg-gray-50 rounded-lg border border-dashed border-gray-300">
                    אין אורחים בשולחן זה
                  </div>
                )}
              </div>

              {/* Add Guest to Table */}
              {availableSeats > 0 && (
                <div className="mt-4">
                  <select
                    onChange={(e) => {
                      if (e.target.value) {
                        handleAssignGuest(e.target.value, table.id);
                        e.target.value = '';
                      }
                    }}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                    defaultValue=""
                  >
                    <option value="">הוסף אורח לשולחן</option>
                    {unassignedGuests.map((guest) => (
                      <option key={guest.id} value={guest.id}>
                        {guest.firstName} {guest.lastName}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Unassigned Guests */}
      {unassignedGuests.length > 0 && (
        <div className="bg-gradient-to-br from-amber-50 to-yellow-50 border-2 border-amber-300 rounded-xl p-6 shadow-md">
          <h3 className="text-xl font-bold text-amber-900 mb-4 flex items-center gap-3">
            <Users className="w-6 h-6 text-amber-700" />
            אורחים ללא שולחן ({unassignedGuests.length})
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {unassignedGuests.map((guest) => (
              <div key={guest.id} className="flex items-center justify-between bg-white rounded-lg p-3 border-2 border-amber-200 shadow-sm hover:shadow-md transition-shadow">
                <span className="text-sm font-semibold text-gray-900 flex-1 mr-2">
                  {guest.firstName} {guest.lastName}
                  {guest.guestCount > 1 && (
                    <span className="text-xs text-gray-500 block mt-1">
                      {guest.guestCount} אנשים
                    </span>
                  )}
                </span>
                <select
                  onChange={(e) => {
                    if (e.target.value) {
                      handleAssignGuest(guest.id, e.target.value);
                      e.target.value = '';
                    }
                  }}
                  className="text-sm border-2 border-gray-300 rounded-lg px-3 py-2 bg-white hover:border-blue-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200 min-w-[140px] font-medium"
                  defaultValue=""
                >
                  <option value="">בחר שולחן</option>
                  {tables.map((table) => {
                    const availableSeats = getAvailableSeats(table);
                    return availableSeats > 0 ? (
                      <option key={table.id} value={table.id}>
                        שולחן {table.number} ({availableSeats} מקומות)
                      </option>
                    ) : null;
                  })}
                </select>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Edit Table Modal */}
      {editingTable && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-96">
            <h3 className="text-lg font-semibold mb-4">ערוך שולחן</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  מספר שולחן
                </label>
                <input
                  type="number"
                  value={editingTable.number}
                  onChange={(e) => setEditingTable({ ...editingTable, number: parseInt(e.target.value) || 0 })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  שם השולחן
                </label>
                <input
                  type="text"
                  value={editingTable.name || ''}
                  onChange={(e) => setEditingTable({ ...editingTable, name: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  כמות מושבים
                </label>
                <input
                  type="number"
                  value={editingTable.capacity}
                  onChange={(e) => setEditingTable({ ...editingTable, capacity: parseInt(e.target.value) || 8 })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  הערות
                </label>
                <textarea
                  value={editingTable.notes || ''}
                  onChange={(e) => setEditingTable({ ...editingTable, notes: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                  rows={3}
                />
              </div>
            </div>
            <div className="flex gap-2 mt-6">
              <button
                onClick={() => handleUpdateTable(editingTable.id, editingTable)}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
              >
                שמור
              </button>
              <button
                onClick={() => setEditingTable(null)}
                className="bg-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-400"
              >
                ביטול
              </button>
            </div>
          </div>
        </div>
      )}
      </div>
    </div>
  );
};

export default SeatingManagement;
