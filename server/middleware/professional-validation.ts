import { Request, Response, NextFunction } from 'express';
import type { IStorage } from '../storage';

/**
 * Middleware para validar se usuário é profissional
 * Aplica-se APENAS às rotas do Google Calendar
 */
export const createRequireProfessional = (storage: IStorage) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = (req as any).user?.id;
      const userEmail = (req as any).user?.email;
      
      if (!userId || !userEmail) {
        return res.status(401).json({ 
          error: 'Usuário não autenticado',
          code: 'UNAUTHORIZED' 
        });
      }

      console.log('🔍 Verificando se usuário é profissional:', { userId, userEmail });

      // Buscar dados do usuário na clínica usando método alternativo
      const clinicUsers = await storage.getClinicUsers(1); // Assumindo clínica 1 por padrão
      const clinicUser = clinicUsers.find(cu => cu.user_id === parseInt(userId));
      
      if (!clinicUser) {
        return res.status(403).json({ 
          error: 'Usuário não encontrado na clínica',
          code: 'USER_NOT_FOUND' 
        });
      }

      if (!clinicUser.is_professional) {
        console.log('❌ Usuário não é profissional:', { userId, is_professional: clinicUser.is_professional });
        return res.status(403).json({ 
          error: 'Apenas profissionais podem integrar calendários externos',
          code: 'PROFESSIONAL_REQUIRED',
          details: 'Esta funcionalidade está disponível apenas para usuários marcados como profissionais'
        });
      }

      console.log('✅ Usuário é profissional, permitindo acesso:', { userId, is_professional: clinicUser.is_professional });
      next();

    } catch (error) {
      console.error('❌ Erro na validação de profissional:', error);
      res.status(500).json({ 
        error: 'Erro interno do servidor',
        code: 'INTERNAL_ERROR' 
      });
    }
  };
};