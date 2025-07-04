import { useEffect } from 'react';
import { useAuth } from './useAuth';

declare global {
  interface Window {
    Gleap: any;
  }
}

export function useGleap(shouldInitialize: boolean = true) {
  const { user } = useAuth();

  useEffect(() => {
    if (typeof window !== 'undefined' && window.Gleap && user && shouldInitialize) {
      // Configurar dados do usuário no Gleap
      window.Gleap.identify(user.id, {
        name: user.name || user.email,
        email: user.email,
        value: user.role || 'user',
        role: user.role,
        // Dados customizados para melhor suporte
        userId: user.id,
        userRole: user.role,
        platform: 'Taskmed',
        loginTime: new Date().toISOString()
      });

      // Configurar dados da empresa/clínica
      window.Gleap.setCustomData({
        clinicId: 1, // ID da clínica principal
        clinicName: 'Taskmed Clinic',
        environment: import.meta.env.MODE || 'development',
        version: '1.0.0',
        userAgent: navigator.userAgent,
        timestamp: new Date().toISOString()
      });

      // Configurar tags para categorização
      const tags = ['taskmed-user'];
      if (user.role === 'super_admin') {
        tags.push('admin');
      }
      if (user.role === 'doctor') {
        tags.push('doctor');
      }
      if (user.role === 'receptionist') {
        tags.push('receptionist');
      }

      window.Gleap.attachCustomData({
        tags: tags,
        subscription: 'active',
        features: ['appointments', 'contacts', 'medical-records', 'calendar'],
        lastActivity: new Date().toISOString()
      });

      // Configurar idioma
      window.Gleap.setLanguage('pt');

      console.log('Gleap configurado com dados do usuário:', user.email);
    }
  }, [user, shouldInitialize]);

  // Função para enviar evento customizado
  const trackEvent = (eventName: string, properties?: Record<string, any>) => {
    if (window.Gleap) {
      window.Gleap.trackEvent(eventName, {
        ...properties,
        userId: user?.id,
        timestamp: new Date().toISOString()
      });
    }
  };

  // Função para abrir o Gleap programaticamente
  const openGleap = () => {
    if (window.Gleap) {
      window.Gleap.open();
    }
  };

  // Função para fechar o Gleap
  const closeGleap = () => {
    if (window.Gleap) {
      window.Gleap.close();
    }
  };

  return {
    trackEvent,
    openGleap,
    closeGleap
  };
}