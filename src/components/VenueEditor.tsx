import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useEventStore } from '../store/eventStore';
import { Table } from '../types';
import { 
  Square, 
  Circle, 
  MoreHorizontal, 
  Save,
  ZoomIn,
  ZoomOut,
  Grid,
  Trash2,
  Edit,
  Plus,
  Users,
  Home,
  MousePointer,
  Hand,
  RotateCw,
  X,
  Check,
  CheckCircle,
  DoorOpen,
  Music,
  Wine,
  Mic,
  Divide,
  ArrowLeft,
  Printer
} from 'lucide-react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { formatFullName } from '../utils/helpers';

const VenueEditor: React.FC = () => {
  const { id: eventId } = useParams<{ id: string }>();
  const { 
    events,
    currentEvent, 
    setCurrentEvent,
    createVenueLayout,
    updateVenueLayout,
    updateTablePosition,
    updateTableSize,
    updateTableRotation,
    updateTableShape,
    deleteTable,
    addTable,
    updateTable,
    assignGuestToTable,
    removeGuestFromTable,
    moveGuestToTable,
    addGuest
  } = useEventStore();

  const canvasRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [draggedTable, setDraggedTable] = useState<string | null>(null);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [selectedTable, setSelectedTable] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);
  const [showGrid, setShowGrid] = useState(true);
  const [isResizing, setIsResizing] = useState(false);
  const [resizeStart, setResizeStart] = useState({ x: 0, y: 0, width: 0, height: 0 });
  const [isDraggingElement, setIsDraggingElement] = useState(false);
  const [draggedElement, setDraggedElement] = useState<string | null>(null);
  const [draggedPartitionId, setDraggedPartitionId] = useState<string | null>(null);
  const [elementDragStart, setElementDragStart] = useState({ x: 0, y: 0 });
  const [showAddTableModal, setShowAddTableModal] = useState(false);
  const [showEditTableModal, setShowEditTableModal] = useState(false);
  const [showAddElementModal, setShowAddElementModal] = useState(false);
  const [showSeatingModal, setShowSeatingModal] = useState(false);
  const [showAddGuestModal, setShowAddGuestModal] = useState(false);
  const [selectedTableForGuest, setSelectedTableForGuest] = useState<string | null>(null);
  const [newGuest, setNewGuest] = useState({
    firstName: '',
    lastName: '',
    phone: '',
    guestCount: 1
  });
  const [editingTable, setEditingTable] = useState<Table | null>(null);
  const [seatingMode, setSeatingMode] = useState(false);
  const [unassignedGuests, setUnassignedGuests] = useState<any[]>([]);
  const [showGuestSearch] = useState(true); // Always visible
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedGuest, setSelectedGuest] = useState<any>(null);
  const [showMoveGuestModal, setShowMoveGuestModal] = useState(false);
  const [editingGuestTable, setEditingGuestTable] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [scrollY, setScrollY] = useState(0);
  const [canvasSize, setCanvasSize] = useState({ width: 550, height: 600 });
  const [canvasOffset, setCanvasOffset] = useState({ x: 0, y: 0 });
  const [newTable, setNewTable] = useState({
    number: 1,
    name: '',
    capacity: 8,
    notes: '',
    width: 10,
    height: 10,
    x: 25,
    y: 25
  });
  const [newElement, setNewElement] = useState({
    type: 'entrance',
    name: '',
    width: 15,
    height: 10,
    x: 25,
    y: 25
  });
  const [toolMode, setToolMode] = useState<'select' | 'pan'>('select');
  
  // Table Templates
  const tableTemplates = [
    { id: 'rect_12', name: 'שולחן מרובה 12', type: 'rectangle', capacity: 12, width: 15, height: 10, color: 'bg-blue-100 border-blue-400' },
    { id: 'rect_14', name: 'שולחן מרובה 14', type: 'rectangle', capacity: 14, width: 18, height: 10, color: 'bg-blue-100 border-blue-400' },
    { id: 'long_20', name: 'שולחן מלבן אבירים 20', type: 'rectangle', capacity: 20, width: 25, height: 8, color: 'bg-green-100 border-green-400' },
    { id: 'long_22', name: 'שולחן מלבן אבירים 22', type: 'rectangle', capacity: 22, width: 28, height: 8, color: 'bg-green-100 border-green-400' },
    { id: 'long_24', name: 'שולחן מלבן אבירים 24', type: 'rectangle', capacity: 24, width: 30, height: 8, color: 'bg-green-100 border-green-400' },
    { id: 'round_10', name: 'שולחן עיגול 10', type: 'circle', capacity: 10, width: 12, height: 12, color: 'bg-purple-100 border-purple-400' },
    { id: 'round_12', name: 'שולחן עיגול 12', type: 'circle', capacity: 12, width: 15, height: 15, color: 'bg-purple-100 border-purple-400' },
  ];

  const [venueElements, setVenueElements] = useState({
    entrance: { x: 10, y: 50, width: 20, height: 15, visible: false },
    danceFloor: { x: 50, y: 30, width: 40, height: 25, visible: false },
    bar: { x: 120, y: 15, width: 15, height: 20, visible: false },
    dj: { x: 140, y: 50, width: 12, height: 12, visible: false },
    partitions: [] as any[]
  });

  useEffect(() => {
    if (eventId) {
      const event = events.find(e => e.id === eventId);
      if (event) {
        setCurrentEvent(event);
        
        if (!event.venueLayout) {
          // Add default tables
          const defaultTables = [
            { number: 1, name: 'שולחן 1', capacity: 8, notes: 'שולחן ברירת מחדל', x: 5, y: 5, width: 10, height: 10, rotation: 0, shape: 'rectangle' as const },
            { number: 2, name: 'שולחן 2', capacity: 6, notes: 'שולחן ברירת מחדל', x: 20, y: 5, width: 10, height: 10, rotation: 0, shape: 'circle' as const },
            { number: 3, name: 'שולחן 3', capacity: 10, notes: 'שולחן ברירת מחדל', x: 35, y: 5, width: 12, height: 10, rotation: 0, shape: 'oval' as const },
            { number: 4, name: 'שולחן 4', capacity: 8, notes: 'שולחן ברירת מחדל', x: 5, y: 25, width: 10, height: 10, rotation: 0, shape: 'rectangle' as const },
            { number: 5, name: 'שולחן 5', capacity: 6, notes: 'שולחן ברירת מחדל', x: 20, y: 25, width: 10, height: 10, rotation: 0, shape: 'circle' as const },
            { number: 6, name: 'שולחן 6', capacity: 4, notes: 'שולחן ברירת מחדל', x: 35, y: 25, width: 10, height: 10, rotation: 0, shape: 'rectangle' as const },
            { number: 7, name: 'שולחן 7', capacity: 8, notes: 'שולחן ברירת מחדל', x: 5, y: 45, width: 10, height: 10, rotation: 0, shape: 'circle' as const },
            { number: 8, name: 'שולחן 8', capacity: 6, notes: 'שולחן ברירת מחדל', x: 20, y: 45, width: 10, height: 10, rotation: 0, shape: 'rectangle' as const },
            { number: 9, name: 'שולחן 9', capacity: 4, notes: 'שולחן ברירת מחדל', x: 35, y: 45, width: 10, height: 10, rotation: 0, shape: 'oval' as const }
          ];
          
          // Add each default table to venue layout
          const tablesWithGuests = defaultTables.map(table => ({
              ...table,
              guests: []
          }));
          
          createVenueLayout(eventId, {
            name: `סקיצת ${event.venue}`,
            width: 300,
            height: 500,
            tables: tablesWithGuests
          });
        }
        
        const unassigned = event.guests.filter(guest => !guest.tableId);
        setUnassignedGuests(unassigned);
      }
    }
  }, [eventId, events, setCurrentEvent, createVenueLayout]);

  // Initialize table positions if not set
  useEffect(() => {
    if (!eventId || !currentEvent?.venueLayout?.tables || currentEvent.venueLayout.tables.length === 0) return;
    const tables = currentEvent.venueLayout.tables;
    
    const needsUpdate = tables.some(table => 
      table.x === undefined || 
      table.y === undefined || 
      table.width === undefined || 
      table.height === undefined || 
      table.rotation === undefined || 
      table.shape === undefined
    );
    
    if (needsUpdate) {
      tables.forEach((table, index) => {
        if (table.x === undefined || table.y === undefined) {
          updateTablePosition(eventId, table.id, 
            (index % 4) * 150 + 50, 
            Math.floor(index / 4) * 120 + 50
          );
        }
        if (table.width === undefined || table.height === undefined) {
          updateTableSize(eventId, table.id, 100, 60);
        }
        if (table.rotation === undefined) {
          updateTableRotation(eventId, table.id, 0);
        }
        if (table.shape === undefined) {
          updateTableShape(eventId, table.id, 'rectangle');
        }
      });
    }
  }, [eventId, currentEvent?.tables?.length]);

  const handleMouseDown = (e: React.MouseEvent, tableId: string) => {
    e.preventDefault();
    setIsDragging(true);
    setDraggedTable(tableId);
    setSelectedTable(tableId);
    
    const rect = canvasRef.current?.getBoundingClientRect();
    if (rect && currentEvent?.venueLayout?.tables) {
      const table = currentEvent.venueLayout.tables.find(t => t.id === tableId);
      setDragStart({
        x: e.clientX - rect.left - (table?.x || 0),
        y: e.clientY - rect.top - (table?.y || 0)
      });
    }
  };

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (isDragging && draggedTable && canvasRef.current) {
      const rect = canvasRef.current.getBoundingClientRect();
      const newX = (e.clientX - rect.left - dragStart.x) / zoom;
      const newY = (e.clientY - rect.top - dragStart.y) / zoom;
      
      updateTablePosition(eventId!, draggedTable, Math.max(0, newX), Math.max(0, newY));
    }
  }, [isDragging, draggedTable, dragStart, zoom, eventId, updateTablePosition]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
    setDraggedTable(null);
  }, []);

  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, handleMouseMove, handleMouseUp]);

  const handleElementMouseMove = useCallback((e: MouseEvent) => {
    if (isDraggingElement && draggedElement && canvasRef.current) {
      const rect = canvasRef.current.getBoundingClientRect();
      const newX = (e.clientX - rect.left - elementDragStart.x) / zoom;
      const newY = (e.clientY - rect.top - elementDragStart.y) / zoom;
      
      let updatedVenueElements;
      
      if (draggedElement === 'entrance') {
        updatedVenueElements = {
          ...venueElements,
          entrance: { ...venueElements.entrance, x: Math.max(0, newX), y: Math.max(0, newY) }
        };
      } else if (draggedElement === 'danceFloor') {
        updatedVenueElements = {
          ...venueElements,
          danceFloor: { ...venueElements.danceFloor, x: Math.max(0, newX), y: Math.max(0, newY) }
        };
      } else if (draggedElement === 'bar') {
        updatedVenueElements = {
          ...venueElements,
          bar: { ...venueElements.bar, x: Math.max(0, newX), y: Math.max(0, newY) }
        };
      } else if (draggedElement === 'dj') {
        updatedVenueElements = {
          ...venueElements,
          dj: { ...venueElements.dj, x: Math.max(0, newX), y: Math.max(0, newY) }
        };
      } else if (draggedElement === 'partition' && draggedPartitionId) {
        updatedVenueElements = {
          ...venueElements,
          partitions: venueElements.partitions.map(p => 
            p.id === draggedPartitionId 
              ? { ...p, x: Math.max(0, newX), y: Math.max(0, newY) }
              : p
          )
        };
      } else {
        return;
      }

      // Update local state
      setVenueElements(updatedVenueElements);

      // Update the store
      if (eventId && currentEvent?.venueLayout) {
        updateVenueLayout(eventId, {
          ...currentEvent.venueLayout,
          venueElements: updatedVenueElements
        });
      }
    }
  }, [isDraggingElement, draggedElement, draggedPartitionId, elementDragStart, zoom, venueElements, eventId, currentEvent?.venueLayout, updateVenueLayout]);

  const handleElementMouseUp = useCallback(() => {
    setIsDraggingElement(false);
    setDraggedElement(null);
    setDraggedPartitionId(null);
  }, []);

  useEffect(() => {
    if (isDraggingElement) {
      document.addEventListener('mousemove', handleElementMouseMove);
      document.addEventListener('mouseup', handleElementMouseUp);
      return () => {
        document.removeEventListener('mousemove', handleElementMouseMove);
        document.removeEventListener('mouseup', handleElementMouseUp);
      };
    }
  }, [isDraggingElement, handleElementMouseMove, handleElementMouseUp]);

  const handleAddTable = async () => {
    if (!eventId || !currentEvent?.venueLayout) return;
    
    const existingNumbers = (currentEvent.venueLayout.tables || []).map(t => t.number);
    const maxNumber = existingNumbers.length > 0 ? Math.max(...existingNumbers) : 0;
    const nextNumber = maxNumber + 1;
    
    const newTableData = {
      id: `table_${Date.now()}`,
      number: newTable.number || nextNumber,
      name: newTable.name,
      capacity: newTable.capacity,
      notes: newTable.notes,
      guests: [],
      x: 100 + ((currentEvent.venueLayout.tables || []).length % 4) * 150,
      y: 100 + Math.floor((currentEvent.venueLayout.tables || []).length / 4) * 120,
      width: 100,
      height: 60,
      rotation: 0,
      shape: 'rectangle' as const,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    // Add to venue layout
    await updateVenueLayout(eventId, {
      ...currentEvent.venueLayout,
      tables: [...(currentEvent.venueLayout.tables || []), newTableData]
    });
    
    setNewTable({ number: nextNumber + 1, name: '', capacity: 8, notes: '', width: 25, height: 25, x: 25, y: 25 });
    setShowAddTableModal(false);
  };

  const handleAddGuestToTable = (tableId: string) => {
    setSelectedTableForGuest(tableId);
    setShowAddGuestModal(true);
  };

  const handleAddGuest = async () => {
    if (!eventId || !selectedTableForGuest || !newGuest.firstName) return;
    
    try {
      await addGuest(eventId, {
        firstName: newGuest.firstName,
        lastName: '', // שם משפחה לא נדרש יותר
        phoneNumber: newGuest.phone,
        guestCount: newGuest.guestCount,
        tableId: selectedTableForGuest,
        rsvpStatus: 'confirmed',
        channel: 'manual'
      });
      
      setNewGuest({ firstName: '', lastName: '', phone: '', guestCount: 1 });
      setShowAddGuestModal(false);
      setSelectedTableForGuest(null);
    } catch (error) {
      console.error('Error adding guest:', error);
    }
  };

  const handleAddTableFromTemplate = async (template: typeof tableTemplates[0]) => {
    if (!eventId || !currentEvent?.venueLayout) return;
    
    const existingNumbers = (currentEvent.venueLayout.tables || []).map(t => t.number);
    const maxNumber = existingNumbers.length > 0 ? Math.max(...existingNumbers) : 0;
    const nextNumber = maxNumber + 1;
    
    const newTableData = {
      id: `table_${Date.now()}`,
      number: nextNumber,
      name: template.name,
      capacity: template.capacity,
      notes: `תבנית: ${template.name}`,
      guests: [],
      x: 100 + ((currentEvent.venueLayout.tables || []).length % 4) * 150,
      y: 100 + Math.floor((currentEvent.venueLayout.tables || []).length / 4) * 120,
      width: template.width,
      height: template.height,
      rotation: 0,
      shape: template.type as 'rectangle' | 'circle' | 'oval',
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    // Add to venue layout
    await updateVenueLayout(eventId, {
      ...currentEvent.venueLayout,
      tables: [...(currentEvent.venueLayout.tables || []), newTableData]
    });
  };

  const handleEditTable = (table: Table) => {
    setEditingTable(table);
    setShowEditTableModal(true);
  };

  const handleSaveEditTable = async () => {
    if (!editingTable || !eventId) return;
    
    await updateTable(eventId, editingTable.id, {
      number: editingTable.number,
      name: editingTable.name,
      capacity: editingTable.capacity,
      notes: editingTable.notes
    });
    
    setShowEditTableModal(false);
    setEditingTable(null);
  };

  const handleDeleteTable = (tableId: string) => {
    if (window.confirm('האם אתה בטוח שברצונך למחוק את השולחן?')) {
      deleteTable(eventId!, tableId);
      setSelectedTable(null);
    }
  };

  const handleRotate = (tableId: string) => {
    if (!currentEvent?.venueLayout?.tables) return;
    const table = currentEvent.venueLayout.tables.find(t => t.id === tableId);
    if (table) {
      const newRotation = ((table.rotation || 0) + 15) % 360;
      updateTableRotation(eventId!, tableId, newRotation);
    }
  };

  const handleShapeChange = (tableId: string, shape: 'rectangle' | 'circle' | 'oval') => {
    updateTableShape(eventId!, tableId, shape);
  };

  const handleAddElement = () => {
    if (!eventId) return;
    
    const newElementData = {
      type: newElement.type,
      name: newElement.name || `אלמנט ${new Date().getTime()}`,
      width: newElement.width,
      height: newElement.height,
      x: newElement.x,
      y: newElement.y,
      visible: true
    };

    // Update venue elements in state
    let updatedVenueElements;
    if (newElement.type === 'entrance') {
      updatedVenueElements = {
        ...venueElements,
        entrance: { ...venueElements.entrance, ...newElementData }
      };
    } else if (newElement.type === 'danceFloor') {
      updatedVenueElements = {
        ...venueElements,
        danceFloor: { ...venueElements.danceFloor, ...newElementData }
      };
    } else if (newElement.type === 'bar') {
      updatedVenueElements = {
        ...venueElements,
        bar: { ...venueElements.bar, ...newElementData }
      };
    } else if (newElement.type === 'dj') {
      updatedVenueElements = {
        ...venueElements,
        dj: { ...venueElements.dj, ...newElementData }
      };
    } else if (newElement.type === 'partition') {
      const newPartition = {
        id: `partition_${Date.now()}`,
        ...newElementData
      };
      updatedVenueElements = {
        ...venueElements,
        partitions: [...venueElements.partitions, newPartition]
      };
    } else {
      return; // Invalid element type
    }

    // Update local state
    setVenueElements(updatedVenueElements);

    // Update the venue layout in the store with the new venue elements
    if (currentEvent?.venueLayout) {
      updateVenueLayout(eventId, {
        name: currentEvent.venueLayout.name,
        width: currentEvent.venueLayout.width,
        height: currentEvent.venueLayout.height,
        backgroundImage: currentEvent.venueLayout.backgroundImage,
        tables: currentEvent.venueLayout.tables,
        venueElements: updatedVenueElements
      });
    }

    setNewElement({
      type: 'entrance',
      name: '',
      width: 100,
      height: 60,
      x: 50,
      y: 50
    });
    setShowAddElementModal(false);
  };

  const handleSeatingMode = () => {
    setSeatingMode(!seatingMode);
    if (!seatingMode) {
      // Enter seating mode - show unassigned guests
      const unassigned = currentEvent?.guests?.filter(guest => !guest.tableId) || [];
      setUnassignedGuests(unassigned);
    }
  };

  const handlePrintSketch = async () => {
    console.log('Print button clicked!');
    console.log('canvasRef.current:', canvasRef.current);
    console.log('currentEvent:', currentEvent);
    
    if (!canvasRef.current || !currentEvent) {
      console.log('Missing canvas or event data');
      return;
    }
    
    try {
      console.log('Starting print process...');
      setIsSaving(true);
      
      // Capture the canvas as image
      console.log('Capturing canvas...');
      const canvas = await html2canvas(canvasRef.current, {
        backgroundColor: '#ffffff',
        scale: 2,
        useCORS: true,
        allowTaint: true,
        width: canvasSize.width,
        height: canvasSize.height
      });
      console.log('Canvas captured successfully');
      
      // Create PDF
      console.log('Creating PDF...');
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });
      
      // Try different encoding for Hebrew
      pdf.setFont('helvetica', 'normal');
      
      // Set text direction to RTL
      pdf.setProperties({
        title: 'סקיצת אירוע',
        subject: 'סקיצת אולם',
        author: 'מערכת ניהול הזמנות',
        creator: 'RSVP Management System'
      });
      
      // Calculate dimensions to fit A4
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      const imgWidth = pdfWidth - 20; // 10mm margin on each side
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      
      // Add the sketch image (centered, no text for now)
      const imgX = (pdfWidth - imgWidth) / 2;
      const imgY = 20;
      pdf.addImage(imgData, 'PNG', imgX, imgY, imgWidth, imgHeight);
      
      // Save the PDF
      console.log('Saving PDF...');
      pdf.save('Venue_Sketch_' + currentEvent.venue + '_' + currentEvent.coupleName + '.pdf');
      console.log('PDF saved successfully!');
      
      setLastSaved(new Date());
    } catch (error) {
      console.error('Error printing sketch:', error);
      alert('שגיאה בהדפסת הסקיצה: ' + (error as Error).message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleTableClick = (tableId: string) => {
    if (seatingMode) {
      // In seating mode, show modal to assign guests to this table
      setSelectedTable(tableId);
      setShowSeatingModal(true);
    } else {
      // Normal mode - just select the table
      setSelectedTable(tableId);
    }
  };

  const handleAssignGuestToTable = async (guestId: string, tableId: string) => {
    if (!eventId) return;
    
    try {
      await assignGuestToTable(eventId, guestId, tableId);
      
      // Update unassigned guests list
      const unassigned = currentEvent?.guests?.filter(guest => !guest.tableId) || [];
      setUnassignedGuests(unassigned);
      
      // Close modal
      setShowSeatingModal(false);
      setSelectedTable(null);
    } catch (error) {
      console.error('Error assigning guest to table:', error);
    }
  };

  const handleRemoveGuestFromTable = async (guestId: string) => {
    if (!eventId) return;
    
    try {
      await removeGuestFromTable(eventId, guestId);
      
      // Update unassigned guests list
      const unassigned = currentEvent?.guests?.filter(guest => !guest.tableId) || [];
      setUnassignedGuests(unassigned);
    } catch (error) {
      console.error('Error removing guest from table:', error);
    }
  };

  const handleElementMouseDown = (e: React.MouseEvent, elementType: string, elementId?: string) => {
    e.preventDefault();
    setIsDraggingElement(true);
    setDraggedElement(elementType);
    if (elementId) {
      setDraggedPartitionId(elementId);
    }
    
    const rect = canvasRef.current?.getBoundingClientRect();
    if (rect) {
      let currentX = 0, currentY = 0;
      
      if (elementType === 'entrance') {
        currentX = venueElements.entrance.x;
        currentY = venueElements.entrance.y;
      } else if (elementType === 'danceFloor') {
        currentX = venueElements.danceFloor.x;
        currentY = venueElements.danceFloor.y;
      } else if (elementType === 'bar') {
        currentX = venueElements.bar.x;
        currentY = venueElements.bar.y;
      } else if (elementType === 'dj') {
        currentX = venueElements.dj.x;
        currentY = venueElements.dj.y;
      } else if (elementType === 'partition' && elementId) {
        const partition = venueElements.partitions.find(p => p.id === elementId);
        if (partition) {
          currentX = partition.x;
          currentY = partition.y;
        }
      }
      
      setElementDragStart({
        x: e.clientX - rect.left - currentX,
        y: e.clientY - rect.top - currentY
      });
    }
  };

  // Calculate canvas size and offset based on open panels
  const calculateCanvasLayout = useCallback(() => {
    const hasSidePanel = seatingMode; // Guest search is always visible now
    const panelWidth = hasSidePanel ? 320 : 0; // 80 * 4 = 320px for w-80
    
    const availableWidth = window.innerWidth - panelWidth - 40; // 40px for padding
    const availableHeight = window.innerHeight - 200; // 200px for header and padding
    
    // Make canvas smaller and more responsive
    const newCanvasSize = {
      width: Math.min(550, Math.max(500, availableWidth * 0.55)),
      height: Math.min(600, Math.max(550, availableHeight * 0.7))
    };
    
    // Center the canvas
    const newOffset = {
      x: hasSidePanel ? (availableWidth - newCanvasSize.width) / 2 : (availableWidth - newCanvasSize.width) / 2,
      y: (availableHeight - newCanvasSize.height) / 2
    };
    
    setCanvasSize(newCanvasSize);
    setCanvasOffset(newOffset);
  }, [seatingMode]);

  // Recalculate when panels open/close
  useEffect(() => {
    calculateCanvasLayout();
  }, [calculateCanvasLayout]);

  // Recalculate on window resize
  useEffect(() => {
    const handleResize = () => {
      calculateCanvasLayout();
    };
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [calculateCanvasLayout]);

  const getTableStyle = (table: Table) => {
    // Scale up the table positions and sizes for visibility
    const scaleFactor = 10; // Multiply by 10 to make tables visible
    const baseStyle = {
      position: 'absolute' as const,
      left: `${(table.x || 0) * scaleFactor}px`,
      top: `${(table.y || 0) * scaleFactor}px`,
      width: `${(table.width || 100) * scaleFactor}px`,
      height: `${(table.height || 60) * scaleFactor}px`,
      transform: `rotate(${table.rotation || 0}deg)`,
      cursor: isDragging && draggedTable === table.id ? 'grabbing' : 'grab',
      zIndex: selectedTable === table.id ? 10 : 1,
    };

    if (table.shape === 'circle') {
      return {
        ...baseStyle,
        borderRadius: '50%',
      };
    } else if (table.shape === 'oval') {
      return {
        ...baseStyle,
        borderRadius: '50%',
        width: `${(table.width || 100) * 1.5}px`,
      };
    }

    return baseStyle;
  };

  const getTableColor = (table: Table) => {
    if (table.shape === 'circle') {
      return 'bg-purple-100 border-purple-400 text-purple-700';
    } else if (table.capacity >= 20) {
      return 'bg-green-100 border-green-400 text-green-700';
    } else if (table.capacity >= 12) {
      return 'bg-blue-100 border-blue-400 text-blue-700';
    } else {
      return 'bg-gray-100 border-gray-400 text-gray-700';
    }
  };

  const event = currentEvent;
  const venueLayout = event?.venueLayout;

  // Create venue layout if it doesn't exist
  if (event && !venueLayout) {
    createVenueLayout(event.id, {
      name: `סקיצת ${event.venue}`,
      width: 450,
      height: 500,
      backgroundImage: '',
      tables: [],
      venueElements: {
        entrance: { x: 10, y: 50, width: 20, height: 15, visible: false },
        danceFloor: { x: 50, y: 30, width: 40, height: 25, visible: false },
        bar: { x: 120, y: 15, width: 15, height: 20, visible: false },
        dj: { x: 140, y: 50, width: 12, height: 12, visible: false },
        partitions: []
      }
    });
  }

  // Tables are stored in currentEvent.tables, not venueLayout.tables
  const tables = currentEvent?.tables || [];
  console.log('Event:', event);
  console.log('CurrentEvent:', currentEvent);
  console.log('VenueLayout:', venueLayout);
  console.log('VenueLayout tables:', venueLayout?.tables);
  console.log('CurrentEvent tables:', currentEvent?.tables);
  console.log('Tables length:', tables.length);
  console.log('Tables details:', tables);
  if (tables.length > 0) {
    console.log('First table:', tables[0]);
    console.log('First table position:', { x: tables[0].x, y: tables[0].y });
    console.log('First table size:', { width: tables[0].width, height: tables[0].height });
    console.log('Canvas size:', canvasSize);
    console.log('First table full object:', JSON.stringify(tables[0], null, 2));
  }

  const venueCenterX = venueLayout ? (canvasSize.width - venueLayout.width) / 2 : 0;
  const venueCenterY = venueLayout ? (canvasSize.height - venueLayout.height) / 2 : 0;

  // Show loading if currentEvent is not loaded
  if (!currentEvent) {
    return (
      <div className="h-screen flex items-center justify-center bg-white">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">טוען אירוע...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-white">
      {/* Enhanced Toolbar */}
      <div className="bg-gradient-to-r from-white to-gray-50 shadow-xl border-b-2 border-gray-200 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-6">
            <Link
              to={eventId ? `/event/${eventId}/manage` : '/'}
              className="flex items-center gap-2 text-gray-600 hover:text-gray-800 transition-colors p-3 rounded-xl hover:bg-gray-100 border border-gray-200"
              title="חזור לאירוע"
            >
              <ArrowLeft className="w-5 h-5" />
              <span className="text-sm font-semibold">חזור לאירוע</span>
            </Link>
            <div className="flex items-center gap-4">
              <div className="p-3 bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl shadow-lg">
                <Home className="w-7 h-7 text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-gray-800">עורך סקיצת אולם</h2>
              </div>
            </div>
          </div>
          
          {/* Enhanced Center Section - Zoom Controls */}
          <div className="flex items-center gap-4">
            <div className="flex items-center bg-gradient-to-r from-gray-100 to-gray-200 rounded-xl p-1 shadow-inner">
              <button
                onClick={() => setZoom(Math.max(0.5, zoom - 0.1))}
                className="p-3 hover:bg-gray-300 rounded-lg transition-all duration-200 hover:shadow-md"
                title="הקטן"
              >
                <ZoomOut className="w-5 h-5 text-gray-700" />
              </button>
              <span className="px-4 py-2 text-sm font-bold text-gray-800 min-w-[70px] text-center bg-white rounded-lg shadow-sm">
                {Math.round(zoom * 100)}%
              </span>
              <button
                onClick={() => setZoom(Math.min(2, zoom + 0.1))}
                className="p-3 hover:bg-gray-300 rounded-lg transition-all duration-200 hover:shadow-md"
                title="הגדל"
              >
                <ZoomIn className="w-5 h-5 text-gray-700" />
              </button>
            </div>
            
            <button
              onClick={() => setShowGrid(!showGrid)}
              className={`p-3 rounded-xl transition-all duration-200 ${
                showGrid 
                  ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-lg' 
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200 hover:shadow-md'
              }`}
              title="רשת"
            >
              <Grid className="w-5 h-5" />
            </button>
            <button
              onClick={() => {
                setScrollY(0);
                setZoom(1);
              }}
              className="p-2 rounded-lg transition-colors bg-gray-100 text-gray-600 hover:bg-gray-200"
              title="חזור למיקום ראשי"
            >
              <Home className="w-4 h-4" />
            </button>
          </div>
          
          {/* Enhanced Right Section - Actions */}
          <div className="flex items-center gap-4">
            {/* Table Templates Dropdown */}
            <div className="relative group">
              <button className="bg-gradient-to-r from-orange-500 to-orange-600 text-white px-6 py-3 rounded-xl hover:from-orange-600 hover:to-orange-700 flex items-center gap-3 transition-all duration-200 shadow-lg hover:shadow-xl font-semibold">
                <Plus className="w-5 h-5" />
                תבניות שולחנות
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              
              <div className="absolute top-full right-0 mt-2 w-80 bg-white rounded-lg shadow-xl border border-gray-200 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
                <div className="p-4">
                  <h3 className="text-sm font-semibold text-gray-800 mb-3">בחר תבנית שולחן</h3>
                  <div className="grid grid-cols-1 gap-2">
                    {tableTemplates.map((template) => (
                      <button
                        key={template.id}
                        onClick={() => handleAddTableFromTemplate(template)}
                        className={`p-3 rounded-lg border-2 text-right hover:shadow-md transition-all ${template.color}`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            {template.type === 'circle' ? (
                              <Circle className="w-5 h-5" />
                            ) : (
                              <Square className="w-5 h-5" />
                            )}
                            <span className="text-sm font-medium">{template.capacity} מושבים</span>
                          </div>
                          <div className="text-xs">{template.name}</div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <button
              onClick={() => setShowAddElementModal(true)}
              className="bg-gradient-to-r from-purple-500 to-purple-600 text-white px-5 py-3 rounded-xl hover:from-purple-600 hover:to-purple-700 flex items-center gap-3 transition-all duration-200 shadow-lg hover:shadow-xl font-semibold"
            >
              <Plus className="w-5 h-5" />
              הוסף אלמנט
            </button>
            <button
              onClick={() => setShowAddTableModal(true)}
              className="bg-gradient-to-r from-green-500 to-green-600 text-white px-5 py-3 rounded-xl hover:from-green-600 hover:to-green-700 flex items-center gap-3 transition-all duration-200 shadow-lg hover:shadow-xl font-semibold"
            >
              <Plus className="w-5 h-5" />
              הוסף שולחן
            </button>
            <button
              onClick={() => updateVenueLayout(eventId!, { name: `סקיצת ${event?.venue} - ${new Date().toLocaleDateString()}` })}
              className="bg-gradient-to-r from-blue-500 to-blue-600 text-white px-5 py-3 rounded-xl hover:from-blue-600 hover:to-blue-700 flex items-center gap-3 transition-all duration-200 shadow-lg hover:shadow-xl font-semibold"
            >
              <Save className="w-5 h-5" />
              שמור סקיצה
            </button>
            <button
              onClick={handlePrintSketch}
              disabled={isSaving}
              className="bg-gradient-to-r from-green-500 to-green-600 text-white px-5 py-3 rounded-xl hover:from-green-600 hover:to-green-700 flex items-center gap-3 transition-all duration-200 shadow-lg hover:shadow-xl font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Printer className="w-5 h-5" />
              {isSaving ? 'מדפיס...' : 'הדפס סקיצה'}
            </button>
          </div>
        </div>
      </div>

      <div className="flex-1 flex">
        {/* Seating Statistics Panel - Always visible */}
        <div className="w-80 bg-white border-l border-gray-200 shadow-lg h-full">
            <div className="p-4 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-800">נתוני הושבה</h3>
              </div>
            </div>
            
            <div className="p-4 space-y-4">
              {/* Total Guests */}
              <div className="bg-blue-50 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Users className="w-5 h-5 text-blue-600" />
                    <span className="text-sm font-medium text-gray-800">סה"כ אורחים</span>
                  </div>
                  <span className="text-xl font-bold text-blue-600">
                    {event?.guests?.reduce((total, guest) => total + guest.guestCount, 0) || 0}
                  </span>
                </div>
              </div>

              {/* Total Tables */}
              <div className="bg-green-50 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Square className="w-5 h-5 text-green-600" />
                    <span className="text-sm font-medium text-gray-800">סה"כ שולחנות</span>
                  </div>
                  <span className="text-xl font-bold text-green-600">
                    {tables?.length || 0}
                  </span>
                </div>
              </div>

              {/* Seated Guests */}
              <div className="bg-purple-50 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-5 h-5 text-purple-600" />
                    <span className="text-sm font-medium text-gray-800">אורחים יושבים</span>
                  </div>
                  <span className="text-xl font-bold text-purple-600">
                    {event?.guests?.filter(guest => guest.tableId).reduce((total, guest) => total + guest.guestCount, 0) || 0}
                  </span>
                </div>
              </div>

              {/* Unseated Guests */}
              <div className="bg-orange-50 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Users className="w-5 h-5 text-orange-600" />
                    <span className="text-sm font-medium text-gray-800">אורחים ללא שולחן</span>
                  </div>
                  <span className="text-xl font-bold text-orange-600">
                    {event?.guests?.filter(guest => !guest.tableId).reduce((total, guest) => total + guest.guestCount, 0) || 0}
                  </span>
                </div>
              </div>

              {/* Total Capacity */}
              <div className="bg-indigo-50 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Square className="w-5 h-5 text-indigo-600" />
                    <span className="text-sm font-medium text-gray-800">סה"כ מושבים</span>
                  </div>
                  <span className="text-xl font-bold text-indigo-600">
                    {tables?.reduce((total, table) => total + table.capacity, 0) || 0}
                  </span>
                </div>
              </div>

              {/* Occupancy Rate */}
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-5 h-5 text-gray-600" />
                    <span className="text-sm font-medium text-gray-800">אחוז תפוסה</span>
                  </div>
                  <span className="text-xl font-bold text-gray-600">
                    {(() => {
                      const totalCapacity = tables?.reduce((total, table) => total + table.capacity, 0) || 0;
                      const seatedGuests = event?.guests?.filter(guest => guest.tableId).reduce((total, guest) => total + guest.guestCount, 0) || 0;
                      return totalCapacity > 0 ? Math.round((seatedGuests / totalCapacity) * 100) : 0;
                    })()}%
                  </span>
                </div>
              </div>
            </div>
          </div>

        {/* Enhanced Canvas */}
        <div className="flex-1 relative overflow-hidden bg-gradient-to-br from-gray-100 to-gray-200 z-10">
          <div
            ref={canvasRef}
            className="w-full h-full relative bg-white shadow-2xl overflow-auto border-2 border-gray-300"
            style={{
              transform: `scale(${zoom}) translateY(${-scrollY}px)`,
              transformOrigin: 'center center',
              backgroundImage: 'none',
              backgroundSize: 'auto',
              minWidth: `${canvasSize.width}px`,
              minHeight: `${canvasSize.height}px`,
            marginLeft: `${canvasOffset.x + 50}px`,
              marginTop: `${canvasOffset.y}px`,
            }}
          >
            {/* Venue Name - Stretched to match board width */}
            <div
              className="absolute text-center z-50"
              style={{
                left: `${(canvasSize.width - 450) / 2}px`,
                top: `20px`,
                width: `450px`,
              }}
            >
              <h3 className="text-lg font-bold text-gray-800 bg-white px-4 py-2 rounded-lg shadow-lg border-2 border-gray-300">
                <div className="flex justify-between items-center">
                  <span>{event?.venue} - {event?.coupleName}</span>
                  <span className="text-sm font-normal text-gray-600">
                    {event?.eventDate ? new Date(event.eventDate).toLocaleDateString() : 'תאריך לא זמין'}
                  </span>
                </div>
              </h3>
            </div>

            {/* Enhanced Venue Background */}
            <div
              className="absolute border-4 border-gray-400 bg-gradient-to-br from-white to-gray-50 shadow-2xl rounded-2xl"
              style={{
                width: `450px`,
                height: `500px`,
                left: `${(canvasSize.width - 450) / 2}px`,
                top: `60px`,
                backgroundImage: showGrid ? 
                  `linear-gradient(to right, #9ca3af 1px, transparent 1px), linear-gradient(to bottom, #9ca3af 1px, transparent 1px)` : 
                  'none',
                backgroundSize: showGrid ? '20px 20px' : 'auto',
              }}
            >
            </div>

            {/* Venue Elements */}
            {/* Entrance */}
            {venueElements.entrance.visible && (
              <div
                className="absolute bg-green-100 border-2 border-green-400 rounded-lg flex items-center justify-center text-green-700 font-medium shadow-md cursor-move hover:shadow-lg transition-shadow"
                style={{
                  left: `${venueElements.entrance.x}px`,
                  top: `${venueElements.entrance.y}px`,
                  width: `${venueElements.entrance.width}px`,
                  height: `${venueElements.entrance.height}px`,
                }}
                onMouseDown={(e) => handleElementMouseDown(e, 'entrance')}
              >
                <div className="text-center">
                  <DoorOpen className="w-6 h-6 mx-auto mb-1" />
                  <div className="text-xs">כניסה</div>
                </div>
              </div>
            )}

            {/* Dance Floor */}
            {venueElements.danceFloor.visible && (
              <div
                className="absolute bg-purple-100 border-2 border-purple-400 rounded-lg flex items-center justify-center text-purple-700 font-medium shadow-md cursor-move hover:shadow-lg transition-shadow"
                style={{
                  left: `${venueElements.danceFloor.x}px`,
                  top: `${venueElements.danceFloor.y}px`,
                  width: `${venueElements.danceFloor.width}px`,
                  height: `${venueElements.danceFloor.height}px`,
                }}
                onMouseDown={(e) => handleElementMouseDown(e, 'danceFloor')}
              >
                <div className="text-center">
                  <Music className="w-8 h-8 mx-auto mb-1" />
                  <div className="text-sm font-bold">רחבת ריקודים</div>
                </div>
              </div>
            )}

            {/* Bar */}
            {venueElements.bar.visible && (
              <div
                className="absolute bg-amber-100 border-2 border-amber-400 rounded-lg flex items-center justify-center text-amber-700 font-medium shadow-md cursor-move hover:shadow-lg transition-shadow"
                style={{
                  left: `${venueElements.bar.x}px`,
                  top: `${venueElements.bar.y}px`,
                  width: `${venueElements.bar.width}px`,
                  height: `${venueElements.bar.height}px`,
                }}
                onMouseDown={(e) => handleElementMouseDown(e, 'bar')}
              >
                <div className="text-center">
                  <Wine className="w-6 h-6 mx-auto mb-1" />
                  <div className="text-xs">בר</div>
                </div>
              </div>
            )}

            {/* DJ Booth */}
            {venueElements.dj.visible && (
              <div
                className="absolute bg-indigo-100 border-2 border-indigo-400 rounded-lg flex items-center justify-center text-indigo-700 font-medium shadow-md cursor-move hover:shadow-lg transition-shadow"
                style={{
                  left: `${venueElements.dj.x}px`,
                  top: `${venueElements.dj.y}px`,
                  width: `${venueElements.dj.width}px`,
                  height: `${venueElements.dj.height}px`,
                }}
                onMouseDown={(e) => handleElementMouseDown(e, 'dj')}
              >
                <div className="text-center">
                  <Mic className="w-5 h-5 mx-auto mb-1" />
                  <div className="text-xs">דיג'יי</div>
                </div>
              </div>
            )}

            {/* Partitions */}
            {venueElements.partitions.map((partition) => (
              partition.visible && (
                <div
                  key={partition.id}
                  className="absolute bg-gray-300 border border-gray-400 shadow-sm cursor-move hover:shadow-md transition-shadow"
                  style={{
                    left: `${partition.x}px`,
                    top: `${partition.y}px`,
                    width: `${partition.width}px`,
                    height: `${partition.height}px`,
                  }}
                  onMouseDown={(e) => handleElementMouseDown(e, 'partition', partition.id)}
                >
                  <div className="w-full h-full flex items-center justify-center">
                    <Divide className="w-4 h-4 text-gray-500" />
                  </div>
                </div>
              )
            ))}

            {/* Enhanced Tables */}
            {tables.length > 0 ? (
              tables.map((table) => (
              <div key={table.id} className="absolute z-50" style={{ zIndex: 1000 }}>
                {/* Table */}
              <div
                  className={`border-2 transition-all duration-200 ${
                  selectedTable === table.id 
                    ? 'shadow-lg scale-105 border-blue-500' 
                    : `${getTableColor(table)} hover:shadow-md`
                } rounded-lg flex items-center justify-center text-sm font-medium select-none cursor-pointer group`}
                style={{
                  ...getTableStyle(table),
                    backgroundColor: '#f0f0f0',
                    border: '2px solid #333',
                    minWidth: '50px',
                    minHeight: '30px'
                }}
                onMouseDown={(e) => {
                  if (seatingMode) {
                    e.preventDefault();
                    handleTableClick(table.id);
                  } else {
                    handleMouseDown(e, table.id);
                  }
                }}
                onClick={() => {
                  if (seatingMode) {
                    handleTableClick(table.id);
                  }
                }}
              >
                <div className="text-center p-2">
                  <div className="font-bold text-sm">שולחן {table.number}</div>
                  {table.name && <div className="text-xs opacity-80 mt-1 font-medium">{table.name}</div>}
                  <div className="flex items-center justify-center gap-1 text-xs opacity-80 mt-1 font-semibold">
                    <Users className="w-3 h-3" />
                    <span>{table.capacity} מושבים</span>
                  </div>
                  
                  {/* Show seating button in seating mode */}
                  {seatingMode && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleTableClick(table.id);
                      }}
                      className="mt-2 px-2 py-1 bg-gradient-to-r from-yellow-500 to-yellow-600 text-white text-xs rounded-lg hover:from-yellow-600 hover:to-yellow-700 transition-all duration-200 shadow-lg font-semibold"
                    >
                      הושב אורחים
                    </button>
                  )}
                </div>
                
                {/* Enhanced Action Buttons - Show on Hover */}
                <div className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-all duration-300 flex gap-1">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleEditTable(table);
                    }}
                    className="p-1 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg hover:from-blue-600 hover:to-blue-700 transition-all duration-200 shadow-lg"
                    title="ערוך שולחן"
                  >
                    <Edit className="w-3 h-3" />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRotate(table.id);
                    }}
                    className="p-1 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-lg hover:from-green-600 hover:to-green-700 transition-all duration-200 shadow-lg"
                    title="סובב שולחן"
                  >
                    <RotateCw className="w-3 h-3" />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteTable(table.id);
                    }}
                    className="p-1 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-lg hover:from-red-600 hover:to-red-700 transition-all duration-200 shadow-lg"
                    title="מחק שולחן"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
                
                {/* Add Guest Button - Always visible */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleAddGuestToTable(table.id);
                  }}
                  className="absolute -top-2 -right-2 w-6 h-6 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-full hover:from-green-600 hover:to-green-700 transition-all duration-200 shadow-lg flex items-center justify-center z-10"
                  title="הוסף אורח לשולחן"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
              </div>
            ))
            ) : (
              <div className="absolute inset-0 flex items-center justify-center text-gray-500">
                <p>אין שולחנות בסקיצה</p>
              </div>
            )}
          </div>
        </div>

        {/* Enhanced Seating Panel - Show when in seating mode */}
        {seatingMode && (
          <div className="w-80 bg-gradient-to-b from-gray-50 to-white border-l border-gray-200 shadow-xl">
            {/* Header */}
            <div className="bg-gradient-to-r from-blue-600 to-blue-700 p-4 text-white">
              <h3 className="text-lg font-bold">מצב הושבה</h3>
              <p className="text-sm text-blue-100">ניהול הושבות אורחים</p>
            </div>
            
            {/* Stats Cards */}
            <div className="p-4 space-y-3">
              <div className="bg-gradient-to-r from-blue-50 to-blue-100 border-2 border-blue-200 rounded-xl p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-semibold text-blue-700">סה"כ אורחים</div>
                    <div className="text-3xl font-bold text-blue-600">
                      {currentEvent?.guests?.length || 0}
                    </div>
                  </div>
                  <Users className="w-8 h-8 text-blue-500" />
                </div>
              </div>
              
              <div className="bg-gradient-to-r from-green-50 to-green-100 border-2 border-green-200 rounded-xl p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-semibold text-green-700">יושבים</div>
                    <div className="text-3xl font-bold text-green-600">
                      {currentEvent?.guests?.filter(g => g.tableId).reduce((sum, guest) => sum + (guest.guestCount || 1), 0) || 0}
                    </div>
                  </div>
                  <CheckCircle className="w-8 h-8 text-green-500" />
                </div>
              </div>
              
              <div className="bg-gradient-to-r from-orange-50 to-orange-100 border-2 border-orange-200 rounded-xl p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-semibold text-orange-700">נותרו להושיב</div>
                    <div className="text-3xl font-bold text-orange-600">
                      {currentEvent?.guests?.filter(g => !g.tableId).length || 0}
                    </div>
                  </div>
                  <Users className="w-8 h-8 text-orange-500" />
                </div>
              </div>
            </div>
            
            <div className="mb-4">
              <h4 className="text-md font-semibold text-gray-700 mb-2">אורחים ללא שולחן</h4>
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {unassignedGuests.map((guest) => (
                  <div
                    key={guest.id}
                    className="p-3 bg-gray-50 rounded-lg border border-gray-200 hover:bg-gray-100 transition-colors cursor-pointer"
                    onClick={() => {
                      setSelectedGuest(guest);
                      setShowMoveGuestModal(true);
                    }}
                  >
                    <div className="font-medium text-gray-800">{guest.name}</div>
                    <div className="text-sm text-gray-600">
                      {guest.guestCount} אנשים • {guest.channel}
                    </div>
                  </div>
                ))}
                {unassignedGuests.length === 0 && (
                  <div className="text-center text-gray-500 py-4">
                    כל האורחים יושבים! 🎉
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

      {/* Add Table Modal */}
      {showAddTableModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-96 max-w-md mx-4">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-800">הוסף שולחן חדש</h3>
                <button
                  onClick={() => setShowAddTableModal(false)}
                  className="p-1 hover:bg-gray-100 rounded"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    מספר שולחן
                  </label>
                  <input
                    type="number"
                    value={newTable.number}
                    onChange={(e) => setNewTable({...newTable, number: parseInt(e.target.value) || 1})}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    min="1"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    שם השולחן (אופציונלי)
                  </label>
                  <input
                    type="text"
                    value={newTable.name}
                    onChange={(e) => setNewTable({...newTable, name: e.target.value})}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="למשל: שולחן משפחה"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    כמות מושבים
                  </label>
                  <input
                    type="number"
                    value={newTable.capacity}
                    onChange={(e) => setNewTable({...newTable, capacity: parseInt(e.target.value) || 8})}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    min="1"
                    max="20"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    הערות (אופציונלי)
                  </label>
                  <textarea
                    value={newTable.notes}
                    onChange={(e) => setNewTable({...newTable, notes: e.target.value})}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    rows={3}
                    placeholder="הערות נוספות על השולחן..."
                  />
                </div>
              </div>
              
              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => setShowAddTableModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  ביטול
                </button>
                <button
                  onClick={handleAddTable}
                  className="flex-1 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 flex items-center justify-center gap-2 transition-colors"
                >
                  <Check className="w-4 h-4" />
                  הוסף שולחן
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add Element Modal */}
      {showAddElementModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-96 max-w-md mx-4">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-800">הוסף אלמנט לאולם</h3>
                <button
                  onClick={() => setShowAddElementModal(false)}
                  className="p-1 hover:bg-gray-100 rounded"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    סוג אלמנט
                  </label>
                  <select
                    value={newElement.type}
                    onChange={(e) => setNewElement({...newElement, type: e.target.value as any})}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="entrance">כניסה</option>
                    <option value="danceFloor">רחבת ריקודים</option>
                    <option value="bar">בר</option>
                    <option value="dj">דיג'יי</option>
                    <option value="partition">מחיצה</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    שם האלמנט (אופציונלי)
                  </label>
                  <input
                    type="text"
                    value={newElement.name}
                    onChange={(e) => setNewElement({...newElement, name: e.target.value})}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="למשל: כניסה ראשית"
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      רוחב
                    </label>
                    <input
                      type="number"
                      value={newElement.width}
                      onChange={(e) => setNewElement({...newElement, width: parseInt(e.target.value) || 100})}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      min="20"
                      max="500"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      גובה
                    </label>
                    <input
                      type="number"
                      value={newElement.height}
                      onChange={(e) => setNewElement({...newElement, height: parseInt(e.target.value) || 60})}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      min="20"
                      max="500"
                    />
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      מיקום X
                    </label>
                    <input
                      type="number"
                      value={newElement.x}
                      onChange={(e) => setNewElement({...newElement, x: parseInt(e.target.value) || 50})}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      min="0"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      מיקום Y
                    </label>
                    <input
                      type="number"
                      value={newElement.y}
                      onChange={(e) => setNewElement({...newElement, y: parseInt(e.target.value) || 50})}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      min="0"
                    />
                  </div>
                </div>
              </div>
              
              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => setShowAddElementModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  ביטול
                </button>
                <button
                  onClick={handleAddElement}
                  className="flex-1 bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 flex items-center justify-center gap-2 transition-colors"
                >
                  <Check className="w-4 h-4" />
                  הוסף אלמנט
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Seating Modal */}
      {showSeatingModal && selectedTable && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-96 max-w-md mx-4">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-800">
                  הושב אורחים לשולחן {currentEvent?.tables?.find(t => t.id === selectedTable)?.number}
                </h3>
                <button
                  onClick={() => {
                    setShowSeatingModal(false);
                    setSelectedTable(null);
                  }}
                  className="p-1 hover:bg-gray-100 rounded"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              <div className="mb-4">
                <div className="bg-blue-50 p-3 rounded-lg">
                  <div className="text-sm font-medium text-blue-800">מידע על השולחן</div>
                  <div className="text-sm text-blue-600">
                    {(() => {
                      const table = currentEvent?.tables?.find(t => t.id === selectedTable);
                      if (!table) return '0';
                      const tableGuests = currentEvent?.guests?.filter(g => g.tableId === table.id) || [];
                      const totalGuestCount = tableGuests.reduce((sum, guest) => sum + (guest.guestCount || 1), 0);
                      return totalGuestCount;
                    })()} / {currentEvent?.tables?.find(t => t.id === selectedTable)?.capacity} מושבים
                  </div>
                </div>
              </div>
              
              <div className="mb-4">
                <h4 className="text-md font-semibold text-gray-700 mb-2">אורחים ללא שולחן</h4>
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {unassignedGuests.map((guest) => (
                    <div
                      key={guest.id}
                      className="p-3 bg-gray-50 rounded-lg border border-gray-200 hover:bg-gray-100 transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-medium text-gray-800">{formatFullName(guest.firstName, guest.lastName)}</div>
                          <div className="text-sm text-gray-600">
                            {guest.guestCount} אנשים • {guest.channel}
                          </div>
                        </div>
                        <button
                          onClick={() => handleAssignGuestToTable(guest.id, selectedTable)}
                          className="px-3 py-1 bg-green-500 text-white text-sm rounded hover:bg-green-600 transition-colors"
                        >
                          הושב
                        </button>
                      </div>
                    </div>
                  ))}
                  {unassignedGuests.length === 0 && (
                    <div className="text-center text-gray-500 py-4">
                      אין אורחים ללא שולחן
                    </div>
                  )}
                </div>
              </div>
              
              <div className="mb-4">
                <h4 className="text-md font-semibold text-gray-700 mb-2">אורחים בשולחן זה</h4>
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {currentEvent?.guests?.filter(g => g.tableId === selectedTable).map((guest) => (
                    <div
                      key={guest.id}
                      className="p-3 bg-green-50 rounded-lg border border-green-200"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-medium text-gray-800">{formatFullName(guest.firstName, guest.lastName)}</div>
                          <div className="text-sm text-gray-600">
                            {guest.guestCount} אנשים • {guest.channel}
                          </div>
                        </div>
                        <button
                          onClick={() => handleRemoveGuestFromTable(guest.id)}
                          className="px-3 py-1 bg-red-500 text-white text-sm rounded hover:bg-red-600 transition-colors"
                        >
                          הסר
                        </button>
                      </div>
                    </div>
                  ))}
                  {(!currentEvent?.guests?.filter(g => g.tableId === selectedTable) || currentEvent?.guests?.filter(g => g.tableId === selectedTable).length === 0) && (
                    <div className="text-center text-gray-500 py-4">
                      אין אורחים בשולחן זה
                    </div>
                  )}
                </div>
              </div>
              
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setShowSeatingModal(false);
                    setSelectedTable(null);
                  }}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  סגור
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Table Modal */}
      {showEditTableModal && editingTable && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-96 max-w-md mx-4">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-800">ערוך שולחן</h3>
                <button
                  onClick={() => setShowEditTableModal(false)}
                  className="p-1 hover:bg-gray-100 rounded"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    מספר שולחן
                  </label>
                  <input
                    type="number"
                    value={editingTable.number}
                    onChange={(e) => setEditingTable({...editingTable, number: parseInt(e.target.value) || 1})}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    min="1"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    שם השולחן
                  </label>
                  <input
                    type="text"
                    value={editingTable.name || ''}
                    onChange={(e) => setEditingTable({...editingTable, name: e.target.value})}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="למשל: שולחן משפחה"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    כמות מושבים
                  </label>
                  <input
                    type="number"
                    value={editingTable.capacity}
                    onChange={(e) => setEditingTable({...editingTable, capacity: parseInt(e.target.value) || 8})}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    min="1"
                    max="20"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    הערות
                  </label>
                  <textarea
                    value={editingTable.notes || ''}
                    onChange={(e) => setEditingTable({...editingTable, notes: e.target.value})}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    rows={3}
                    placeholder="הערות נוספות על השולחן..."
                  />
                </div>
              </div>
              
              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => setShowEditTableModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  ביטול
                </button>
                <button
                  onClick={handleSaveEditTable}
                  className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center justify-center gap-2 transition-colors"
                >
                  <Check className="w-4 h-4" />
                  שמור שינויים
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add Guest to Table Modal */}
      {showAddGuestModal && selectedTableForGuest && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-96 max-w-md mx-4">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-800">
                  הוסף אורח לשולחן {currentEvent?.tables?.find(t => t.id === selectedTableForGuest)?.number}
                </h3>
                <button
                  onClick={() => {
                    setShowAddGuestModal(false);
                    setSelectedTableForGuest(null);
                  }}
                  className="p-1 hover:bg-gray-100 rounded"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    שם מלא
                  </label>
                  <input
                    type="text"
                    value={newGuest.firstName}
                    onChange={(e) => setNewGuest({...newGuest, firstName: e.target.value})}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="הכנס שם מלא"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    מספר טלפון
                  </label>
                  <input
                    type="tel"
                    value={newGuest.phone}
                    onChange={(e) => setNewGuest({...newGuest, phone: e.target.value})}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="הכנס מספר טלפון"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    מספר אורחים
                  </label>
                  <input
                    type="number"
                    value={newGuest.guestCount}
                    onChange={(e) => setNewGuest({...newGuest, guestCount: parseInt(e.target.value) || 1})}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    min="1"
                    max="20"
                  />
                </div>
              </div>
              
              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => {
                    setShowAddGuestModal(false);
                    setSelectedTableForGuest(null);
                  }}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  ביטול
                </button>
                <button
                  onClick={handleAddGuest}
                  className="flex-1 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 flex items-center justify-center gap-2 transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  הוסף אורח
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      </div>
    </div>
  );
};

export default VenueEditor;
