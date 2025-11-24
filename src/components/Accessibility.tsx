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
  const toolbarRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Load saved position from localStorage
    const savedPosition = localStorage.getItem('rsvp-accessibility-position');
    if (savedPosition) {
      try {
        const pos = JSON.parse(savedPosition);
        setPosition(pos);
      } catch (e) {
        console.warn('Failed to load accessibility position');
      }
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

  // Handle dragging
  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      const newX = e.clientX - dragStart.x;
      const newY = e.clientY - dragStart.y;
      
      // Keep within viewport bounds
      const maxX = window.innerWidth - (toolbarRef.current?.offsetWidth || 300);
      const maxY = window.innerHeight - (toolbarRef.current?.offsetHeight || 400);
      
      setPosition({
        x: Math.max(0, Math.min(newX, maxX)),
        y: Math.max(0, Math.min(newY, maxY))
      });
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      // Save position to localStorage
      if (toolbarRef.current) {
        localStorage.setItem('rsvp-accessibility-position', JSON.stringify(position));
      }
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, dragStart, position]);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (toolbarRef.current) {
      setIsDragging(true);
      setDragStart({
        x: e.clientX - position.x,
        y: e.clientY - position.y
      });
    }
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
        className="fixed z-50 bg-white rounded-xl shadow-2xl border-2 border-teal-200 transition-all duration-200"
        style={{
          left: `${position.x}px`,
          top: `${position.y}px`,
          cursor: isDragging ? 'grabbing' : 'default'
        }}
        role="toolbar"
        aria-label="כלי נגישות"
      >
        {/* Main button - always visible */}
        <div
          className="flex items-center justify-between p-3 cursor-move select-none"
          onMouseDown={handleMouseDown}
          style={{ cursor: isDragging ? 'grabbing' : 'grab' }}
        >
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="flex items-center gap-2 px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors font-semibold"
            aria-label={isOpen ? 'סגור תפריט נגישות' : 'פתח תפריט נגישות'}
            aria-expanded={isOpen}
          >
            <AccessibilityIcon className="w-5 h-5" />
            <span>נגישות</span>
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
            onClick={(e) => e.stopPropagation()}
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

