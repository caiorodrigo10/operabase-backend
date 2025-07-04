import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useLocation } from 'wouter';

interface AdminContextType {
  isAdminView: boolean;
  toggleAdminView: () => void;
  setAdminView: (value: boolean) => void;
}

const AdminContext = createContext<AdminContextType | undefined>(undefined);

interface AdminProviderProps {
  children: ReactNode;
}

export function AdminProvider({ children }: AdminProviderProps) {
  const [isAdminView, setIsAdminView] = useState<boolean>(false); // Always start with user view
  const [location, navigate] = useLocation();

  // Persiste o estado no localStorage sempre que mudar
  useEffect(() => {
    localStorage.setItem('taskmed-admin-view', JSON.stringify(isAdminView));
  }, [isAdminView]);

  // Detect route changes and sync admin view state
  useEffect(() => {
    const isOnAdminRoute = location.startsWith('/admin');
    if (isOnAdminRoute !== isAdminView) {
      setIsAdminView(isOnAdminRoute);
    }
  }, [location, isAdminView]);

  const toggleAdminView = () => {
    const newAdminView = !isAdminView;
    setIsAdminView(newAdminView);
    
    // Navigate automatically based on new state
    if (newAdminView) {
      navigate('/admin');
    } else {
      navigate('/');
    }
  };

  const setAdminView = (value: boolean) => {
    setIsAdminView(value);
    
    // Navigate automatically when setting admin view programmatically
    if (value && !location.startsWith('/admin')) {
      navigate('/admin');
    } else if (!value && location.startsWith('/admin')) {
      navigate('/');
    }
  };

  return (
    <AdminContext.Provider value={{ isAdminView, toggleAdminView, setAdminView }}>
      {children}
    </AdminContext.Provider>
  );
}

export function useAdmin() {
  const context = useContext(AdminContext);
  if (context === undefined) {
    throw new Error('useAdmin must be used within an AdminProvider');
  }
  return context;
}