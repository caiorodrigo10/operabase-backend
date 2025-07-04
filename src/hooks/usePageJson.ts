import { useState, useEffect } from 'react';
import { mockPageJson } from '../data/mockPageJson';

const STORAGE_KEY = 'editor2-page-json';

export const usePageJson = () => {
  const [pageJson, setPageJson] = useState(mockPageJson);
  const [isLoading, setIsLoading] = useState(true);

  // Load JSON from localStorage on component mount
  useEffect(() => {
    try {
      const savedJson = localStorage.getItem(STORAGE_KEY);
      if (savedJson) {
        const parsed = JSON.parse(savedJson);
        setPageJson(parsed);
        console.log('📄 JSON loaded from localStorage');
      } else {
        console.log('📄 Using default mock JSON');
      }
    } catch (error) {
      console.error('❌ Error loading JSON from localStorage:', error);
      setPageJson(mockPageJson);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Save JSON to localStorage
  const savePageJson = (json: any) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(json, null, 2));
      setPageJson(json);
      console.log('✅ JSON saved to localStorage');
      return true;
    } catch (error) {
      console.error('❌ Error saving JSON to localStorage:', error);
      return false;
    }
  };

  // Reset to default template
  const resetToDefault = () => {
    localStorage.removeItem(STORAGE_KEY);
    setPageJson(mockPageJson);
    console.log('🔄 JSON reset to default template');
  };

  // Export JSON as file
  const exportJson = () => {
    const blob = new Blob([JSON.stringify(pageJson, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `page-builder-${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    console.log('💾 JSON exported as file');
  };

  return {
    pageJson,
    isLoading,
    savePageJson,
    resetToDefault,
    exportJson
  };
};