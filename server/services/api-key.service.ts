import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { db } from '../db';
import { api_keys } from '../../shared/schema';
import { eq, and, sql } from 'drizzle-orm';

interface CreateApiKeyData {
  clinic_id: number;
  key_name: string;
  created_by: number;
  permissions?: string[];
  expires_at?: Date;
}

interface ApiKeyUsageStats {
  total_requests: number;
  requests_today: number;
  requests_this_week: number;
  requests_this_month: number;
  last_used_at: Date | null;
  most_used_endpoint: string | null;
  avg_requests_per_day: number;
}

export class ApiKeyService {
  /**
   * Gera uma nova API Key para uma clínica
   */
  async generateApiKey(data: CreateApiKeyData) {
    try {
      const { clinic_id, key_name, created_by, permissions = ['read', 'write'], expires_at } = data;

      // Gerar parte aleatória da API Key (32 caracteres hexadecimais)
      const randomPart = crypto.randomBytes(16).toString('hex');
      const apiKey = `tk_clinic_${clinic_id}_${randomPart}`;

      // Criar hash da API Key para armazenamento seguro
      const keyHash = await bcrypt.hash(apiKey, 12);

      // Definir data de expiração padrão (1 ano)
      const defaultExpirationDate = expires_at || new Date(Date.now() + 365 * 24 * 60 * 60 * 1000);

      // Inserir no banco de dados
      const newKey = await db.insert(api_keys).values({
        clinic_id,
        key_name,
        api_key: apiKey,
        key_hash: keyHash,
        permissions: permissions,
        expires_at: defaultExpirationDate,
        created_by
      }).returning();

      console.log('🔑 Nova API Key gerada:', {
        keyId: newKey[0].id,
        keyName: key_name,
        clinicId: clinic_id,
        permissions,
        expiresAt: defaultExpirationDate
      });

      return {
        ...newKey[0],
        api_key: apiKey // Retorna a API Key apenas na criação
      };
    } catch (error) {
      console.error('❌ Erro ao gerar API Key:', error);
      throw new Error('Falha ao gerar API Key');
    }
  }

  /**
   * Lista todas as API Keys de uma clínica (sem expor as keys)
   */
  async listClinicKeys(clinicId: number) {
    try {
      const keys = await db.select({
        id: api_keys.id,
        key_name: api_keys.key_name,
        api_key_preview: sql`CONCAT(SUBSTRING(${api_keys.api_key}, 1, 20), '...')`.as('api_key_preview'),
        is_active: api_keys.is_active,
        permissions: api_keys.permissions,
        last_used_at: api_keys.last_used_at,
        usage_count: api_keys.usage_count,
        expires_at: api_keys.expires_at,
        created_at: api_keys.created_at
      })
      .from(api_keys)
      .where(eq(api_keys.clinic_id, clinicId))
      .orderBy(api_keys.created_at);

      return keys;
    } catch (error) {
      console.error('❌ Erro ao listar API Keys:', error);
      throw new Error('Falha ao listar API Keys');
    }
  }

  /**
   * Revoga uma API Key (torna inativa)
   */
  async revokeApiKey(keyId: number, clinicId: number) {
    try {
      const result = await db.update(api_keys)
        .set({ 
          is_active: false,
          updated_at: new Date()
        })
        .where(and(
          eq(api_keys.id, keyId),
          eq(api_keys.clinic_id, clinicId)
        ))
        .returning();

      if (!result.length) {
        throw new Error('API Key não encontrada ou não pertence à clínica');
      }

      console.log('🔒 API Key revogada:', {
        keyId,
        keyName: result[0].key_name,
        clinicId
      });

      return result[0];
    } catch (error) {
      console.error('❌ Erro ao revogar API Key:', error);
      throw error;
    }
  }

  /**
   * Atualiza permissões de uma API Key
   */
  async updateKeyPermissions(keyId: number, clinicId: number, permissions: string[]) {
    try {
      const result = await db.update(api_keys)
        .set({ 
          permissions,
          updated_at: new Date()
        })
        .where(and(
          eq(api_keys.id, keyId),
          eq(api_keys.clinic_id, clinicId)
        ))
        .returning();

      if (!result.length) {
        throw new Error('API Key não encontrada ou não pertence à clínica');
      }

      console.log('🔧 Permissões da API Key atualizadas:', {
        keyId,
        keyName: result[0].key_name,
        clinicId,
        newPermissions: permissions
      });

      return result[0];
    } catch (error) {
      console.error('❌ Erro ao atualizar permissões da API Key:', error);
      throw error;
    }
  }

  /**
   * Obtém estatísticas de uso de uma API Key
   */
  async getKeyUsageStats(keyId: number, clinicId: number): Promise<ApiKeyUsageStats> {
    try {
      const key = await db.select()
        .from(api_keys)
        .where(and(
          eq(api_keys.id, keyId),
          eq(api_keys.clinic_id, clinicId)
        ))
        .limit(1);

      if (!key.length) {
        throw new Error('API Key não encontrada');
      }

      const keyData = key[0];
      const now = new Date();
      const dayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const weekStart = new Date(dayStart.getTime() - 7 * 24 * 60 * 60 * 1000);
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

      // Calcular estatísticas básicas
      const totalRequests = keyData.usage_count || 0;
      const createdDaysAgo = keyData.created_at 
        ? Math.floor((now.getTime() - keyData.created_at.getTime()) / (24 * 60 * 60 * 1000)) + 1
        : 1;
      
      const avgRequestsPerDay = totalRequests / createdDaysAgo;

      // Para estatísticas mais detalhadas, seria necessário uma tabela de logs
      // Por agora, retornamos estimativas baseadas no usage_count
      const estimatedRequestsToday = Math.floor(avgRequestsPerDay);
      const estimatedRequestsThisWeek = Math.floor(avgRequestsPerDay * 7);
      const estimatedRequestsThisMonth = Math.floor(avgRequestsPerDay * 30);

      return {
        total_requests: totalRequests,
        requests_today: estimatedRequestsToday,
        requests_this_week: Math.min(estimatedRequestsThisWeek, totalRequests),
        requests_this_month: Math.min(estimatedRequestsThisMonth, totalRequests),
        last_used_at: keyData.last_used_at,
        most_used_endpoint: null, // Requer tabela de logs separada
        avg_requests_per_day: avgRequestsPerDay
      };
    } catch (error) {
      console.error('❌ Erro ao obter estatísticas da API Key:', error);
      throw error;
    }
  }

  /**
   * Renova uma API Key (gera nova key mantendo metadados)
   */
  async renewApiKey(keyId: number, clinicId: number) {
    try {
      const existingKey = await db.select()
        .from(api_keys)
        .where(and(
          eq(api_keys.id, keyId),
          eq(api_keys.clinic_id, clinicId)
        ))
        .limit(1);

      if (!existingKey.length) {
        throw new Error('API Key não encontrada');
      }

      const oldKey = existingKey[0];

      // Gerar nova API Key
      const randomPart = crypto.randomBytes(16).toString('hex');
      const newApiKey = `tk_clinic_${clinicId}_${randomPart}`;
      const newKeyHash = await bcrypt.hash(newApiKey, 12);

      // Atualizar com nova key
      const result = await db.update(api_keys)
        .set({
          api_key: newApiKey,
          key_hash: newKeyHash,
          updated_at: new Date(),
          // Reset usage stats
          usage_count: 0,
          last_used_at: null
        })
        .where(eq(api_keys.id, keyId))
        .returning();

      console.log('🔄 API Key renovada:', {
        keyId,
        keyName: oldKey.key_name,
        clinicId
      });

      return {
        ...result[0],
        api_key: newApiKey // Retorna a nova API Key apenas na renovação
      };
    } catch (error) {
      console.error('❌ Erro ao renovar API Key:', error);
      throw error;
    }
  }

  /**
   * Verifica se uma API Key é válida
   */
  async validateApiKey(apiKey: string): Promise<boolean> {
    try {
      const keyData = await db.select()
        .from(api_keys)
        .where(and(
          eq(api_keys.api_key, apiKey),
          eq(api_keys.is_active, true)
        ))
        .limit(1);

      if (!keyData.length) {
        return false;
      }

      const key = keyData[0];

      // Verificar expiração
      if (key.expires_at && new Date() > new Date(key.expires_at)) {
        return false;
      }

      return true;
    } catch (error) {
      console.error('❌ Erro ao validar API Key:', error);
      return false;
    }
  }
}

export const apiKeyService = new ApiKeyService();