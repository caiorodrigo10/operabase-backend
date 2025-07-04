import { Request, Response, NextFunction } from 'express';
import { db } from '../db';
import { api_keys } from '../../shared/schema';
import { eq, and, sql } from 'drizzle-orm';
import bcrypt from 'bcryptjs';

interface ApiKeyRequest extends Request {
  apiKey?: any;
  clinicId?: number;
  apiKeyPermissions?: string[];
}

/**
 * Middleware de autenticação por API Key para integração N8N
 * Formato esperado: Authorization: Bearer tk_clinic_{clinic_id}_{32_chars}
 */
export const apiKeyAuth = async (req: ApiKeyRequest, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;
    
    // Verificar se header existe e tem formato correto
    if (!authHeader?.startsWith('Bearer tk_clinic_')) {
      return res.status(401).json({
        success: false,
        error: 'API Key obrigatória no formato: Bearer tk_clinic_{clinic_id}_{hash}',
        code: 'INVALID_API_KEY_FORMAT'
      });
    }

    const apiKey = authHeader.replace('Bearer ', '');
    
    // Validar formato da API Key
    if (!apiKey.match(/^tk_clinic_\d+_[a-f0-9]{32}$/)) {
      return res.status(401).json({
        success: false,
        error: 'Formato de API Key inválido. Esperado: tk_clinic_{clinic_id}_{32_hex_chars}',
        code: 'MALFORMED_API_KEY'
      });
    }

    // Extrair clinic_id da API Key
    const clinicIdMatch = apiKey.match(/^tk_clinic_(\d+)_/);
    if (!clinicIdMatch) {
      return res.status(401).json({
        success: false,
        error: 'Não foi possível extrair clinic_id da API Key',
        code: 'CLINIC_ID_EXTRACTION_ERROR'
      });
    }

    const clinicId = parseInt(clinicIdMatch[1]);

    // Buscar API Key no banco de dados
    const keyData = await db.select()
      .from(api_keys)
      .where(and(
        eq(api_keys.api_key, apiKey),
        eq(api_keys.is_active, true),
        eq(api_keys.clinic_id, clinicId)
      ))
      .limit(1);

    if (!keyData.length) {
      return res.status(401).json({
        success: false,
        error: 'API Key inválida, inativa ou não pertence à clínica especificada',
        code: 'API_KEY_NOT_FOUND'
      });
    }

    const key = keyData[0];

    // Verificar expiração
    if (key.expires_at && new Date() > new Date(key.expires_at)) {
      return res.status(401).json({
        success: false,
        error: 'API Key expirada',
        code: 'API_KEY_EXPIRED',
        expired_at: key.expires_at
      });
    }

    // Atualizar estatísticas de uso (fire-and-forget)
    db.update(api_keys)
      .set({
        last_used_at: new Date(),
        usage_count: sql`${api_keys.usage_count} + 1`,
        updated_at: new Date()
      })
      .where(eq(api_keys.id, key.id))
      .execute()
      .catch(error => {
        console.error('❌ Erro ao atualizar estatísticas da API Key:', error);
      });

    // Adicionar dados da API Key ao request
    req.apiKey = key;
    req.clinicId = clinicId;
    req.apiKeyPermissions = Array.isArray(key.permissions) ? key.permissions : ['read', 'write'];

    // Log de uso da API Key (sanitizado)
    console.log('🔑 API Key autenticada:', {
      keyId: key.id,
      keyName: key.key_name,
      clinicId: clinicId,
      permissions: req.apiKeyPermissions,
      endpoint: req.path,
      method: req.method,
      userAgent: req.headers['user-agent']
    });

    next();
  } catch (error) {
    console.error('❌ Erro no middleware de API Key:', error);
    return res.status(500).json({
      success: false,
      error: 'Erro interno na validação da API Key',
      code: 'INTERNAL_AUTH_ERROR'
    });
  }
};

/**
 * Middleware para verificar permissões específicas
 */
export const requirePermission = (permission: 'read' | 'write' | 'admin') => {
  return (req: ApiKeyRequest, res: Response, next: NextFunction) => {
    if (!req.apiKeyPermissions?.includes(permission)) {
      return res.status(403).json({
        success: false,
        error: `Permissão '${permission}' necessária para esta operação`,
        code: 'INSUFFICIENT_PERMISSIONS',
        required_permission: permission,
        available_permissions: req.apiKeyPermissions
      });
    }
    next();
  };
};

/**
 * Middleware para operações que requerem permissão de leitura
 */
export const requireReadPermission = requirePermission('read');

/**
 * Middleware para operações que requerem permissão de escrita
 */
export const requireWritePermission = requirePermission('write');

/**
 * Middleware para operações que requerem permissão de admin
 */
export const requireAdminPermission = requirePermission('admin');

export type { ApiKeyRequest };