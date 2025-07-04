import { db } from '../db';
import { system_logs, SystemLog, InsertSystemLog } from '../../shared/schema';
import { eq, and, desc, sql, inArray } from 'drizzle-orm';

/**
 * System Logs Service - Phase 1 Implementation
 * Provides centralized audit trail for all system actions
 * Maintains data integrity and compliance requirements
 */
export class SystemLogsService {
  
  /**
   * Log a system action with full context
   */
  async logAction(logData: Partial<InsertSystemLog> & {
    entity_type: string;
    action_type: string;
    clinic_id: number;
  }): Promise<SystemLog | null> {
    try {
      const [newLog] = await db
        .insert(system_logs)
        .values({
          ...logData,
          created_at: new Date(),
        })
        .returning();

      return newLog;
    } catch (error) {
      console.error('❌ Failed to log system action:', error);
      // Não falhar o processo principal se o log falhar
      return null;
    }
  }

  /**
   * Log contact actions (creation, updates, deletion)
   */
  async logContactAction(
    action: 'created' | 'updated' | 'deleted' | 'status_changed',
    contactId: number,
    clinicId: number,
    actorId?: string,
    actorType: 'professional' | 'system' = 'professional',
    previousData?: any,
    newData?: any,
    context?: {
      source?: string;
      ip_address?: string;
      user_agent?: string;
      session_id?: string;
      actor_name?: string;
    }
  ): Promise<SystemLog | null> {
    const changes = this.calculateChanges(previousData, newData);

    return this.logAction({
      entity_type: 'contact',
      entity_id: contactId,
      action_type: action,
      clinic_id: clinicId,
      actor_id: actorId,
      actor_type: actorType,
      actor_name: context?.actor_name,
      previous_data: previousData,
      new_data: newData,
      changes,
      source: context?.source || 'web',
      ip_address: context?.ip_address,
      user_agent: context?.user_agent,
      session_id: context?.session_id,
    });
  }

  /**
   * Log appointment actions (scheduling, updates, cancellations)
   */
  async logAppointmentAction(
    action: 'created' | 'updated' | 'deleted' | 'status_changed' | 'rescheduled' | 'completed' | 'cancelled' | 'no_show',
    appointmentId: number,
    clinicId: number,
    actorId?: string,
    actorType: 'professional' | 'system' = 'professional',
    previousData?: any,
    newData?: any,
    context?: {
      source?: string;
      ip_address?: string;
      user_agent?: string;
      session_id?: string;
      actor_name?: string;
      professional_id?: number;
      related_entity_id?: number; // contact_id
    }
  ): Promise<SystemLog | null> {
    const changes = this.calculateChanges(previousData, newData);

    return this.logAction({
      entity_type: 'appointment',
      entity_id: appointmentId,
      action_type: action,
      clinic_id: clinicId,
      actor_id: actorId,
      actor_type: actorType,
      actor_name: context?.actor_name,
      professional_id: context?.professional_id,
      related_entity_id: context?.related_entity_id,
      previous_data: previousData,
      new_data: newData,
      changes,
      source: context?.source || 'web',
      ip_address: context?.ip_address,
      user_agent: context?.user_agent,
      session_id: context?.session_id,
    });
  }

  /**
   * Log message actions (sent, received, AI responses)
   */
  async logMessageAction(
    action: 'sent' | 'received' | 'ai_response',
    messageId: number,
    clinicId: number,
    conversationId: number,
    actorId?: string,
    actorType: 'professional' | 'patient' | 'system' | 'ai' = 'system',
    context?: {
      source?: string;
      ip_address?: string;
      user_agent?: string;
      session_id?: string;
      actor_name?: string;
      professional_id?: number;
      contact_id?: number;
    }
  ): Promise<SystemLog | null> {
    return this.logAction({
      entity_type: 'message',
      entity_id: messageId,
      action_type: action,
      clinic_id: clinicId,
      actor_id: actorId,
      actor_type: actorType,
      actor_name: context?.actor_name,
      professional_id: context?.professional_id,
      related_entity_id: context?.contact_id,
      new_data: { 
        conversation_id: conversationId,
        contact_id: context?.contact_id 
      },
      source: context?.source || 'whatsapp',
      ip_address: context?.ip_address,
      user_agent: context?.user_agent,
      session_id: context?.session_id,
    });
  }

  /**
   * Log medical record actions (creation, updates, deletion)
   */
  async logMedicalRecordAction(
    action: 'created' | 'updated' | 'deleted' | 'signed' | 'reviewed',
    recordId: number,
    clinicId: number,
    actorId?: string,
    actorType: 'professional' | 'system' = 'professional',
    previousData?: any,
    newData?: any,
    context?: {
      source?: string;
      ip_address?: string;
      user_agent?: string;
      session_id?: string;
      actor_name?: string;
      professional_id?: number;
      contact_id?: number;
      appointment_id?: number;
    }
  ): Promise<SystemLog | null> {
    const changes = this.calculateChanges(previousData, newData);

    return this.logAction({
      entity_type: 'medical_record',
      entity_id: recordId,
      action_type: action,
      clinic_id: clinicId,
      actor_id: actorId,
      actor_type: actorType,
      actor_name: context?.actor_name,
      professional_id: context?.professional_id,
      related_entity_id: context?.contact_id,
      previous_data: previousData,
      new_data: {
        ...newData,
        appointment_id: context?.appointment_id,
        contact_id: context?.contact_id
      },
      changes,
      source: context?.source || 'web',
      ip_address: context?.ip_address,
      user_agent: context?.user_agent,
      session_id: context?.session_id,
    });
  }

  /**
   * Log anamnesis actions (creation, completion, review)
   */
  async logAnamnesisAction(
    action: 'created' | 'updated' | 'deleted' | 'filled' | 'reviewed' | 'shared',
    anamnesisId: number,
    clinicId: number,
    actorId?: string,
    actorType: 'professional' | 'patient' | 'system' = 'professional',
    previousData?: any,
    newData?: any,
    context?: {
      source?: string;
      ip_address?: string;
      user_agent?: string;
      session_id?: string;
      actor_name?: string;
      professional_id?: number;
      contact_id?: number;
      template_id?: number;
    }
  ): Promise<SystemLog | null> {
    const changes = this.calculateChanges(previousData, newData);

    return this.logAction({
      entity_type: 'anamnesis',
      entity_id: anamnesisId,
      action_type: action,
      clinic_id: clinicId,
      actor_id: actorId,
      actor_type: actorType,
      actor_name: context?.actor_name,
      professional_id: context?.professional_id,
      related_entity_id: context?.contact_id,
      previous_data: previousData,
      new_data: {
        ...newData,
        template_id: context?.template_id,
        contact_id: context?.contact_id
      },
      changes,
      source: context?.source || 'web',
      ip_address: context?.ip_address,
      user_agent: context?.user_agent,
      session_id: context?.session_id,
    });
  }

  /**
   * Log WhatsApp connection actions
   */
  async logWhatsAppAction(
    action: 'connected' | 'disconnected' | 'connecting' | 'created' | 'updated' | 'deleted',
    whatsappId: number,
    clinicId: number,
    actorId?: string,
    actorType: 'professional' | 'system' = 'system',
    previousData?: any,
    newData?: any,
    context?: {
      source?: string;
      ip_address?: string;
      user_agent?: string;
      session_id?: string;
      actor_name?: string;
      professional_id?: number;
      instance_name?: string;
      phone_number?: string;
    }
  ): Promise<SystemLog | null> {
    const changes = this.calculateChanges(previousData, newData);

    return this.logAction({
      entity_type: 'whatsapp_number',
      entity_id: whatsappId,
      action_type: action,
      clinic_id: clinicId,
      actor_id: actorId,
      actor_type: actorType,
      actor_name: context?.actor_name,
      professional_id: context?.professional_id,
      previous_data: previousData,
      new_data: {
        ...newData,
        instance_name: context?.instance_name,
        phone_number: context?.phone_number
      },
      changes,
      source: context?.source || 'whatsapp',
      ip_address: context?.ip_address,
      user_agent: context?.user_agent,
      session_id: context?.session_id,
    });
  }

  /**
   * Get patient timeline (all logs related to a contact)
   */
  async getPatientTimeline(
    contactId: number,
    clinicId: number,
    limit: number = 50
  ): Promise<SystemLog[]> {
    try {
      const logs = await db
        .select()
        .from(system_logs)
        .where(
          and(
            eq(system_logs.clinic_id, clinicId),
            sql`(
              (entity_type = 'contact' AND entity_id = ${contactId}) OR
              (entity_type IN ('appointment', 'medical_record', 'anamnesis') AND new_data->>'contact_id' = ${contactId.toString()}) OR
              (entity_type = 'message' AND related_entity_id = ${contactId})
            )`
          )
        )
        .orderBy(desc(system_logs.created_at))
        .limit(limit);

      return logs;
    } catch (error) {
      console.error('❌ Failed to get patient timeline:', error);
      return [];
    }
  }

  /**
   * Get recent activity for a clinic
   */
  async getRecentActivity(
    clinicId: number,
    limit: number = 100
  ): Promise<SystemLog[]> {
    try {
      const logs = await db
        .select()
        .from(system_logs)
        .where(eq(system_logs.clinic_id, clinicId))
        .orderBy(desc(system_logs.created_at))
        .limit(limit);

      return logs;
    } catch (error) {
      console.error('❌ Failed to get recent activity:', error);
      return [];
    }
  }

  /**
   * Get activity by professional
   */
  async getProfessionalActivity(
    clinicId: number,
    professionalId: number,
    limit: number = 50
  ): Promise<SystemLog[]> {
    try {
      const logs = await db
        .select()
        .from(system_logs)
        .where(
          and(
            eq(system_logs.clinic_id, clinicId),
            eq(system_logs.professional_id, professionalId)
          )
        )
        .orderBy(desc(system_logs.created_at))
        .limit(limit);

      return logs;
    } catch (error) {
      console.error('❌ Failed to get professional activity:', error);
      return [];
    }
  }

  /**
   * Get activity statistics for a time period
   */
  async getActivityStats(
    clinicId: number,
    days: number = 30
  ): Promise<{
    total_actions: number;
    by_entity_type: Record<string, number>;
    by_action_type: Record<string, number>;
    by_actor_type: Record<string, number>;
  }> {
    try {
      const stats = await db
        .select({
          entity_type: system_logs.entity_type,
          action_type: system_logs.action_type,
          actor_type: system_logs.actor_type,
          count: sql<number>`count(*)::int`,
        })
        .from(system_logs)
        .where(
          and(
            eq(system_logs.clinic_id, clinicId),
            sql`created_at >= (CURRENT_TIMESTAMP - INTERVAL '30 days')`
          )
        )
        .groupBy(
          system_logs.entity_type,
          system_logs.action_type,
          system_logs.actor_type
        );

      const result = {
        total_actions: 0,
        by_entity_type: {} as Record<string, number>,
        by_action_type: {} as Record<string, number>,
        by_actor_type: {} as Record<string, number>,
      };

      stats.forEach(stat => {
        result.total_actions += stat.count;
        result.by_entity_type[stat.entity_type] = (result.by_entity_type[stat.entity_type] || 0) + stat.count;
        result.by_action_type[stat.action_type] = (result.by_action_type[stat.action_type] || 0) + stat.count;
        if (stat.actor_type) {
          result.by_actor_type[stat.actor_type] = (result.by_actor_type[stat.actor_type] || 0) + stat.count;
        }
      });

      return result;
    } catch (error) {
      console.error('❌ Failed to get activity stats:', error);
      return {
        total_actions: 0,
        by_entity_type: {},
        by_action_type: {},
        by_actor_type: {},
      };
    }
  }

  /**
   * Calculate changes between previous and new data
   */
  private calculateChanges(previousData: any, newData: any): any {
    if (!previousData || !newData) {
      return null;
    }

    const changes: any = {};
    const allKeys = new Set([...Object.keys(previousData), ...Object.keys(newData)]);

    for (const key of allKeys) {
      const oldValue = previousData[key];
      const newValue = newData[key];

      if (JSON.stringify(oldValue) !== JSON.stringify(newValue)) {
        changes[key] = {
          from: oldValue,
          to: newValue,
        };
      }
    }

    return Object.keys(changes).length > 0 ? changes : null;
  }

  /**
   * Extract request context from Express request
   */
  extractRequestContext(req: any): {
    source: string;
    ip_address?: string;
    user_agent?: string;
    session_id?: string;
    actor_name?: string;
  } {
    return {
      source: req.headers['x-source'] || 'web',
      ip_address: req.ip || req.connection.remoteAddress,
      user_agent: req.headers['user-agent'],
      session_id: req.sessionID,
      actor_name: req.user?.name,
    };
  }
}

// Singleton instance
export const systemLogsService = new SystemLogsService();