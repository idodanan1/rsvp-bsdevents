import React, { useState, useEffect, useRef } from 'react';
import { ZoomIn, ZoomOut, Contrast, Type, Keyboard, Accessibility as AccessibilityIcon, X } from 'lucide-react';

const Accessibility: React.FC = () => {
  const [fontSize, setFontSize] = useState(100);
  const [highContrast, setHighContrast] = useState(false);
  const [showKeyboardShortcuts, setShowKeyboardShortcuts] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [position, setPosition] = useState({ x: 20, y: 20 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [longPressTimer, setLongPressTimer] = useState<NodeJS.Timeout | null>(null);
  const [isLongPress, setIsLongPress] = useState(false);
  const toolbarRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Detect device type
    const isMobile = window.innerWidth < 768;
    const isTablet = window.innerWidth >= 768 && window.innerWidth < 1024;
    const isDesktop = window.innerWidth >= 1024;
    
    // Calculate default position: top-right corner
    const calculateDefaultPosition = () => {
      const buttonWidth = 120;
      const buttonHeight = 60;
      return {
        x: window.innerWidth - buttonWidth - 10, // Right side with 10px padding
        y: 10 // Top with 10px padding
      };
    };
    
    // Load saved position from localStorage
    const savedPosition = localStorage.getItem('rsvp-accessibility-position');
    if (savedPosition && isDesktop) {
      // Only use saved position on desktop
      try {
        const pos = JSON.parse(savedPosition);
        setPosition(pos);
      } catch (e: any) {
        console.warn('Failed to load accessibility position, using default');
        setPosition(calculateDefaultPosition());
      }
    } else {
      // On mobile/tablet or if no saved position, use top-right as default
      setPosition(calculateDefaultPosition());
    }

    // Apply font size
    document.documentElement.style.fontSize = `${fontSize}%`;
    
    // Apply high contrast
    if (highContrast) {
      document.body.classList.add('high-contrast');
    } else {
      document.body.classList.remove('high-contrast');
    }

    return () => {
      document.documentElement.style.fontSize = '';
      document.body.classList.remove('high-contrast');
    };
  }, [fontSize, highContrast]);

  // Handle dragging (mouse)
  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      const newX = e.clientX - dragStart.x;
      const newY = e.clientY - dragStart.y;
      
      // Keep within viewport bounds
      const toolbarWidth = toolbarRef.current?.offsetWidth || 200;
      const toolbarHeight = toolbarRef.current?.offsetHeight || (isOpen ? 400 : 60);
      const padding = 10; // Add padding to keep button visible
      const maxX = window.innerWidth - toolbarWidth - padding;
      const maxY = window.innerHeight - toolbarHeight - padding;
      
      const clampedX = Math.max(padding, Math.min(newX, maxX));
      const clampedY = Math.max(padding, Math.min(newY, maxY));
      
      setPosition({
        x: clampedX,
        y: clampedY
      });
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      // Save position to localStorage
      setPosition(prev => {
        localStorage.setItem('rsvp-accessibility-position', JSON.stringify(prev));
        return prev;
      });
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, dragStart, isOpen]);

  // Handle dragging (touch)
  useEffect(() => {
    if (!isDragging) return;

    window.addEventListener('touchmove', handleTouchMove, { passive: false });
    window.addEventListener('touchend', handleTouchEnd);
    window.addEventListener('touchcancel', handleTouchCancel);

    return () => {
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleTouchEnd);
      window.removeEventListener('touchcancel', handleTouchCancel);
    };
  }, [isDragging, dragStart, isOpen, longPressTimer, isLongPress]);

  const handleMouseDown = (e: React.MouseEvent | React.TouchEvent) => {
    // Only allow dragging from the header area, not from buttons
    if ((e.target as HTMLElement).closest('button')) {
      return;
    }
    
    // For mouse events, allow immediate dragging
    if (!('touches' in e)) {
      if (toolbarRef.current) {
        setIsDragging(true);
        setDragStart({
          x: e.clientX - position.x,
          y: e.clientY - position.y
        });
      }
      return;
    }
    
    // For touch events, require long press (500ms) before allowing drag
    const touch = e.touches[0];
    setIsLongPress(false);
    
    const timer = setTimeout(() => {
      setIsLongPress(true);
      if (toolbarRef.current) {
        setIsDragging(true);
        setDragStart({
          x: touch.clientX - position.x,
          y: touch.clientY - position.y
        });
        // Provide haptic feedback if available
        if (navigator.vibrate) {
          navigator.vibrate(50);
        }
      }
    }, 500); // 500ms long press
    
    setLongPressTimer(timer);
  };
  
  const handleTouchEnd = () => {
    // Clear long press timer if touch ended before long press
    if (longPressTimer) {
      clearTimeout(longPressTimer);
      setLongPressTimer(null);
    }
    
    // If it was a long press and we were dragging, save position
    if (isLongPress && isDragging) {
      setPosition(prev => {
        localStorage.setItem('rsvp-accessibility-position', JSON.stringify(prev));
        return prev;
      });
    }
    
    setIsDragging(false);
    setIsLongPress(false);
  };
  
  const handleTouchCancel = () => {
    // Clear long press timer if touch was cancelled
    if (longPressTimer) {
      clearTimeout(longPressTimer);
      setLongPressTimer(null);
    }
    setIsDragging(false);
    setIsLongPress(false);
  };

  const handleTouchMove = (e: TouchEvent) => {
    // If not dragging yet (long press not completed), cancel the long press timer
    if (!isDragging && longPressTimer) {
      clearTimeout(longPressTimer);
      setLongPressTimer(null);
      return;
    }
    
    if (!isDragging) return;
    e.preventDefault(); // Prevent scrolling while dragging
    
    const newX = e.touches[0].clientX - dragStart.x;
    const newY = e.touches[0].clientY - dragStart.y;
    
    // Keep within viewport bounds
    const toolbarWidth = toolbarRef.current?.offsetWidth || 200;
    const toolbarHeight = toolbarRef.current?.offsetHeight || (isOpen ? 400 : 60);
    const padding = 10; // Add padding to keep button visible
    const maxX = window.innerWidth - toolbarWidth - padding;
    const maxY = window.innerHeight - toolbarHeight - padding;
    
    const clampedX = Math.max(padding, Math.min(newX, maxX));
    const clampedY = Math.max(padding, Math.min(newY, maxY));
    
    setPosition({
      x: clampedX,
      y: clampedY
    });
  };

  const increaseFont = () => {
    setFontSize(prev => Math.min(prev + 10, 200));
  };

  const decreaseFont = () => {
    setFontSize(prev => Math.max(prev - 10, 80));
  };

  const resetFont = () => {
    setFontSize(100);
  };

  return (
    <>
      {/* Skip to main content link */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:right-4 focus:z-50 focus:bg-teal-600 focus:text-white focus:px-4 focus:py-2 focus:rounded-lg focus:shadow-lg"
      >
        דלג לתוכן הראשי
      </a>

      {/* Accessibility Toolbar */}
      <div
        ref={toolbarRef}
        className="fixed bg-white rounded-xl shadow-2xl border-2 border-teal-200 transition-all duration-200 max-w-[90vw] sm:max-w-none"
        style={{
          left: `${Math.min(position.x, window.innerWidth - 200)}px`,
          top: `${Math.min(position.y, window.innerHeight - 100)}px`,
          cursor: isDragging ? 'grabbing' : 'default',
          touchAction: 'none', // Prevent default touch behaviors
          zIndex: 9999 // Very high z-index to ensure it's always on top
        }}
        role="toolbar"
        aria-label="כלי נגישות"
      >
        {/* Main button - always visible */}
        <div
          className="flex items-center justify-between p-2 sm:p-3 select-none"
          onMouseDown={handleMouseDown}
          onTouchStart={handleMouseDown}
          style={{ 
            cursor: isDragging ? 'grabbing' : 'grab',
            userSelect: 'none',
            WebkitUserSelect: 'none'
          }}
        >
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="flex items-center gap-2 px-3 sm:px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 active:bg-teal-800 transition-colors font-semibold text-sm sm:text-base"
            aria-label={isOpen ? 'סגור תפריט נגישות' : 'פתח תפריט נגישות'}
            aria-expanded={isOpen}
          >
            <AccessibilityIcon className="w-4 h-4 sm:w-5 sm:h-5" />
            <span className="hidden sm:inline">נגישות</span>
          </button>
          {isOpen && (
            <button
              onClick={() => setIsOpen(false)}
              className="p-1 hover:bg-gray-100 rounded transition-colors"
              aria-label="סגור"
            >
              <X className="w-4 h-4 text-gray-600" />
            </button>
          )}
        </div>

        {/* Expandable menu */}
        {isOpen && (
          <div className="p-4 border-t border-teal-100">
            <div className="flex flex-col space-y-3">
              <button
                onClick={increaseFont}
                className="flex items-center gap-3 p-3 hover:bg-teal-50 rounded-lg transition-all hover:scale-105 active:scale-95 border border-gray-200 hover:border-teal-300"
                aria-label="הגדל טקסט"
                title="הגדל טקסט"
              >
                <ZoomIn className="w-5 h-5 text-teal-600" />
                <span className="text-sm font-medium text-gray-700">הגדל טקסט</span>
              </button>
              <button
                onClick={decreaseFont}
                className="flex items-center gap-3 p-3 hover:bg-teal-50 rounded-lg transition-all hover:scale-105 active:scale-95 border border-gray-200 hover:border-teal-300"
                aria-label="הקטן טקסט"
                title="הקטן טקסט"
              >
                <ZoomOut className="w-5 h-5 text-teal-600" />
                <span className="text-sm font-medium text-gray-700">הקטן טקסט</span>
              </button>
              <button
                onClick={resetFont}
                className="flex items-center gap-3 p-3 hover:bg-teal-50 rounded-lg transition-all hover:scale-105 active:scale-95 border border-gray-200 hover:border-teal-300"
                aria-label="איפוס גודל טקסט"
                title="איפוס גודל טקסט"
              >
                <Type className="w-5 h-5 text-teal-600" />
                <span className="text-sm font-medium text-gray-700">איפוס גודל ({fontSize}%)</span>
              </button>
              <button
                onClick={() => setHighContrast(!highContrast)}
                className={`flex items-center gap-3 p-3 rounded-lg transition-all hover:scale-105 active:scale-95 border ${
                  highContrast ? 'bg-teal-600 text-white border-teal-700' : 'border-gray-200 hover:border-teal-300 hover:bg-teal-50'
                }`}
                aria-label={highContrast ? 'כבה ניגודיות גבוהה' : 'הפעל ניגודיות גבוהה'}
                title={highContrast ? 'כבה ניגודיות גבוהה' : 'הפעל ניגודיות גבוהה'}
                aria-pressed={highContrast}
              >
                <Contrast className={`w-5 h-5 ${highContrast ? 'text-white' : 'text-teal-600'}`} />
                <span className={`text-sm font-medium ${highContrast ? 'text-white' : 'text-gray-700'}`}>
                  ניגודיות גבוהה
                </span>
              </button>
              <button
                onClick={() => setShowKeyboardShortcuts(!showKeyboardShortcuts)}
                className="flex items-center gap-3 p-3 hover:bg-teal-50 rounded-lg transition-all hover:scale-105 active:scale-95 border border-gray-200 hover:border-teal-300"
                aria-label="הצג קיצורי מקלדת"
                title="הצג קיצורי מקלדת"
              >
                <Keyboard className="w-5 h-5 text-teal-600" />
                <span className="text-sm font-medium text-gray-700">קיצורי מקלדת</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Keyboard Shortcuts Modal */}
      {showKeyboardShortcuts && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
          onClick={() => setShowKeyboardShortcuts(false)}
          role="dialog"
          aria-modal="true"
          aria-labelledby="keyboard-shortcuts-title"
        >
          <div
            className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full p-6"
            onClick={(e: React.MouseEvent<HTMLDivElement>) => e.stopPropagation()}
          >
            <h2 id="keyboard-shortcuts-title" className="text-2xl font-bold text-gray-800 mb-4">
              קיצורי מקלדת
            </h2>
            <div className="space-y-3">
              <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                <span className="text-gray-700">דלג לתוכן הראשי</span>
                <kbd className="px-3 py-1 bg-white border border-gray-300 rounded text-sm font-mono">
                  Tab
                </kbd>
              </div>
              <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                <span className="text-gray-700">ניווט בין שדות</span>
                <kbd className="px-3 py-1 bg-white border border-gray-300 rounded text-sm font-mono">
                  Tab / Shift+Tab
                </kbd>
              </div>
              <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                <span className="text-gray-700">הפעל כפתור או קישור</span>
                <kbd className="px-3 py-1 bg-white border border-gray-300 rounded text-sm font-mono">
                  Enter
                </kbd>
              </div>
              <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                <span className="text-gray-700">חזור</span>
                <kbd className="px-3 py-1 bg-white border border-gray-300 rounded text-sm font-mono">
                  Esc
                </kbd>
              </div>
            </div>
            <button
              onClick={() => setShowKeyboardShortcuts(false)}
              className="mt-6 w-full bg-teal-600 text-white py-2 rounded-lg font-semibold hover:bg-teal-700 transition-colors"
            >
              סגור
            </button>
          </div>
        </div>
      )}
    </>
  );
};

export default Accessibility;

