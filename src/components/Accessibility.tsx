import React, { useState, useEffect } from 'react';
import { ZoomIn, ZoomOut, Contrast, Type, Keyboard } from 'lucide-react';

const Accessibility: React.FC = () => {
  const [fontSize, setFontSize] = useState(100);
  const [highContrast, setHighContrast] = useState(false);
  const [showKeyboardShortcuts, setShowKeyboardShortcuts] = useState(false);

  useEffect(() => {
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
        className="fixed bottom-4 left-4 z-50 bg-white rounded-lg shadow-xl border border-gray-200 p-3"
        role="toolbar"
        aria-label="כלי נגישות"
      >
        <div className="flex flex-col space-y-2">
          <button
            onClick={increaseFont}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            aria-label="הגדל טקסט"
            title="הגדל טקסט"
          >
            <ZoomIn className="w-5 h-5 text-gray-700" />
          </button>
          <button
            onClick={decreaseFont}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            aria-label="הקטן טקסט"
            title="הקטן טקסט"
          >
            <ZoomOut className="w-5 h-5 text-gray-700" />
          </button>
          <button
            onClick={resetFont}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors text-xs"
            aria-label="איפוס גודל טקסט"
            title="איפוס גודל טקסט"
          >
            {fontSize}%
          </button>
          <button
            onClick={() => setHighContrast(!highContrast)}
            className={`p-2 rounded-lg transition-colors ${
              highContrast ? 'bg-teal-600 text-white' : 'hover:bg-gray-100'
            }`}
            aria-label={highContrast ? 'כבה ניגודיות גבוהה' : 'הפעל ניגודיות גבוהה'}
            title={highContrast ? 'כבה ניגודיות גבוהה' : 'הפעל ניגודיות גבוהה'}
            aria-pressed={highContrast}
          >
            <Contrast className="w-5 h-5" />
          </button>
          <button
            onClick={() => setShowKeyboardShortcuts(!showKeyboardShortcuts)}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            aria-label="הצג קיצורי מקלדת"
            title="הצג קיצורי מקלדת"
          >
            <Keyboard className="w-5 h-5 text-gray-700" />
          </button>
        </div>
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

