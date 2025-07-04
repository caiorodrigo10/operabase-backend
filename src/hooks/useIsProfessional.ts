import { useQuery } from '@tanstack/react-query';
import { getQueryFn } from '@/lib/queryClient';

interface ClinicUser {
  id: number;
  name: string;
  email: string;
  role: string;
  is_professional: boolean;
  is_active: boolean;
  joined_at: string;
}

/**
 * Hook para verificar se o usuário atual é profissional
 * Usado para condicionar acesso à integração Google Calendar
 */
export function useIsProfessional() {
  // Buscar dados do usuário na clínica atual
  const { data: clinicUsers = [], isLoading, error } = useQuery({
    queryKey: ['/api/clinic/1/users/management'],
    queryFn: getQueryFn({ on401: "returnNull" }),
  });

  // Encontrar dados do usuário atual na lista de usuários da clínica
  // Assumindo que os dados do usuário atual estão disponíveis no contexto
  const currentUserEmail = localStorage.getItem('userEmail') || 
                          sessionStorage.getItem('userEmail');

  const currentUser = (clinicUsers as ClinicUser[]).find(
    user => user.email === currentUserEmail
  );

  const isProfessional = currentUser?.is_professional === true;
  const userRole = currentUser?.role;

  console.log('🔍 useIsProfessional hook:', {
    currentUserEmail,
    currentUser,
    isProfessional,
    userRole,
    totalUsers: clinicUsers.length
  });

  return {
    isProfessional,
    userRole,
    isLoading,
    error,
    currentUser
  };
}