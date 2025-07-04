import React, { useEffect } from 'react';
import { EditorLayout } from '../components/editor2';
import { PageProvider } from '../contexts/PageProvider';
import { EditorProvider } from '../contexts/EditorContext';
import '../styles/editor2.css';

export default function Editor2() {
  // Force hide Gleap widget on this page
  useEffect(() => {
    const hideGleap = () => {
      // Hide Gleap widget if it exists
      const gleapWidget = document.querySelector('[id^="gleap"]') || 
                         document.querySelector('.gleap-widget') ||
                         document.querySelector('div[data-gleap]');
      
      if (gleapWidget) {
        (gleapWidget as HTMLElement).style.display = 'none';
      }

      // Also try to hide by common Gleap selectors
      const gleapElements = document.querySelectorAll('[class*="gleap"], [id*="gleap"]');
      gleapElements.forEach(element => {
        (element as HTMLElement).style.display = 'none';
      });
    };

    // Hide immediately
    hideGleap();

    // Set up interval to keep checking and hiding
    const interval = setInterval(hideGleap, 500);

    // Cleanup interval on unmount
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="editor2-page">
      <PageProvider>
        <EditorProvider>
          <EditorLayout />
        </EditorProvider>
      </PageProvider>
    </div>
  );
}