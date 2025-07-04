import { Router, Request, Response } from 'express';
import { apiKeyService } from '../services/api-key.service';
import { insertApiKeySchema } from '../../shared/schema';
import { isAuthenticated, hasClinicAccess } from '../auth';
import { z } from 'zod';

const router = Router();

interface AuthenticatedRequest extends Request {
  user?: {
    id: number;
    email: string;
    name: string;
    role: string;
  };
}

/**
 * POST /api/clinic/:clinicId/api-keys
 * Criar nova API Key para a clínica
 */
router.post('/clinic/:clinicId/api-keys', 
  isAuthenticated, 
  hasClinicAccess(), 
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const clinicId = parseInt(req.params.clinicId);
      const validatedData = insertApiKeySchema.parse({
        ...req.body,
        clinic_id: clinicId,
        created_by: req.user?.id
      });

      if (!req.user?.id) {
        return res.status(401).json({
          success: false,
          error: 'Usuário não autenticado'
        });
      }

      const apiKey = await apiKeyService.generateApiKey({
        clinic_id: clinicId,
        key_name: validatedData.key_name,
        created_by: req.user.id,
        permissions: validatedData.permissions,
        expires_at: validatedData.expires_at || undefined
      });

      res.status(201).json({
        success: true,
        data: {
          id: apiKey.id,
          key_name: apiKey.key_name,
          api_key: apiKey.api_key, // Retorna apenas na criação
          permissions: apiKey.permissions,
          expires_at: apiKey.expires_at,
          created_at: apiKey.created_at
        },
        message: 'API Key criada com sucesso. Guarde-a em local seguro, pois não será possível visualizá-la novamente.'
      });
    } catch (error) {
      console.error('❌ Erro ao criar API Key:', error);
      
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          success: false,
          error: 'Dados inválidos',
          details: error.errors
        });
      }

      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor'
      });
    }
  }
);

/**
 * GET /api/clinic/:clinicId/api-keys
 * Listar API Keys da clínica
 */
router.get('/clinic/:clinicId/api-keys', 
  isAuthenticated, 
  hasClinicAccess(), 
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const clinicId = parseInt(req.params.clinicId);
      const keys = await apiKeyService.listClinicKeys(clinicId);

      res.json({
        success: true,
        data: keys,
        total: keys.length
      });
    } catch (error) {
      console.error('❌ Erro ao listar API Keys:', error);
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor'
      });
    }
  }
);

/**
 * PUT /api/clinic/:clinicId/api-keys/:keyId/permissions
 * Atualizar permissões de uma API Key
 */
router.put('/clinic/:clinicId/api-keys/:keyId/permissions', 
  isAuthenticated, 
  hasClinicAccess(), 
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const clinicId = parseInt(req.params.clinicId);
      const keyId = parseInt(req.params.keyId);
      
      const permissionsSchema = z.object({
        permissions: z.array(z.enum(['read', 'write', 'admin'])).min(1, 'Pelo menos uma permissão é obrigatória')
      });

      const { permissions } = permissionsSchema.parse(req.body);

      const updatedKey = await apiKeyService.updateKeyPermissions(keyId, clinicId, permissions);

      res.json({
        success: true,
        data: {
          id: updatedKey.id,
          key_name: updatedKey.key_name,
          permissions: updatedKey.permissions,
          updated_at: updatedKey.updated_at
        },
        message: 'Permissões atualizadas com sucesso'
      });
    } catch (error) {
      console.error('❌ Erro ao atualizar permissões:', error);
      
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          success: false,
          error: 'Dados inválidos',
          details: error.errors
        });
      }

      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor'
      });
    }
  }
);

/**
 * DELETE /api/clinic/:clinicId/api-keys/:keyId
 * Revogar API Key
 */
router.delete('/clinic/:clinicId/api-keys/:keyId', 
  isAuthenticated, 
  hasClinicAccess(), 
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const clinicId = parseInt(req.params.clinicId);
      const keyId = parseInt(req.params.keyId);

      const revokedKey = await apiKeyService.revokeApiKey(keyId, clinicId);

      res.json({
        success: true,
        data: {
          id: revokedKey.id,
          key_name: revokedKey.key_name,
          is_active: revokedKey.is_active,
          revoked_at: revokedKey.updated_at
        },
        message: 'API Key revogada com sucesso'
      });
    } catch (error) {
      console.error('❌ Erro ao revogar API Key:', error);
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor'
      });
    }
  }
);

/**
 * GET /api/clinic/:clinicId/api-keys/:keyId/usage
 * Obter estatísticas de uso de uma API Key
 */
router.get('/clinic/:clinicId/api-keys/:keyId/usage', 
  isAuthenticated, 
  hasClinicAccess(), 
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const clinicId = parseInt(req.params.clinicId);
      const keyId = parseInt(req.params.keyId);

      const stats = await apiKeyService.getKeyUsageStats(keyId, clinicId);

      res.json({
        success: true,
        data: stats
      });
    } catch (error) {
      console.error('❌ Erro ao obter estatísticas:', error);
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor'
      });
    }
  }
);

/**
 * POST /api/clinic/:clinicId/api-keys/:keyId/renew
 * Renovar API Key (gerar nova key)
 */
router.post('/clinic/:clinicId/api-keys/:keyId/renew', 
  isAuthenticated, 
  hasClinicAccess(), 
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const clinicId = parseInt(req.params.clinicId);
      const keyId = parseInt(req.params.keyId);

      const renewedKey = await apiKeyService.renewApiKey(keyId, clinicId);

      res.json({
        success: true,
        data: {
          id: renewedKey.id,
          key_name: renewedKey.key_name,
          api_key: renewedKey.api_key, // Nova API Key
          permissions: renewedKey.permissions,
          updated_at: renewedKey.updated_at
        },
        message: 'API Key renovada com sucesso. Atualize suas integrações com a nova chave.'
      });
    } catch (error) {
      console.error('❌ Erro ao renovar API Key:', error);
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor'
      });
    }
  }
);

export default router;