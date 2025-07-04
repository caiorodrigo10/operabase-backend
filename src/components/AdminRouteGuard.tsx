import { ReactNode } from 'react';
import { useAuth } from '@/hooks/useAuth';

interface AdminRouteGuardProps {
  children: ReactNode;
}

export function AdminRouteGuard({ children }: AdminRouteGuardProps) {
  const { user } = useAuth();

  // Check if user has admin privileges
  const hasAdminAccess = user?.role === 'super_admin' || user?.role === 'admin';
  
  if (!hasAdminAccess) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Acesso Negado</h1>
          <p className="text-gray-600">Você não tem permissão para acessar esta área.</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}