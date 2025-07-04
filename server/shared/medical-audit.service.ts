import { structuredLogger, LogCategory } from './structured-logger.service.js';
import { tenantContext } from './tenant-context.provider.js';
import { nanoid } from 'nanoid';

/**
 * Medical audit event types for compliance tracking
 */
export enum MedicalAuditEvent {
  // Patient data access
  PATIENT_VIEW = 'patient_view',
  PATIENT_CREATE = 'patient_create',
  PATIENT_UPDATE = 'patient_update',
  PATIENT_DELETE = 'patient_delete',
  PATIENT_EXPORT = 'patient_export',
  
  // Medical records
  RECORD_VIEW = 'record_view',
  RECORD_CREATE = 'record_create',
  RECORD_UPDATE = 'record_update',
  RECORD_DELETE = 'record_delete',
  RECORD_PRINT = 'record_print',
  RECORD_SHARE = 'record_share',
  
  // Appointments
  APPOINTMENT_VIEW = 'appointment_view',
  APPOINTMENT_CREATE = 'appointment_create',
  APPOINTMENT_UPDATE = 'appointment_update',
  APPOINTMENT_CANCEL = 'appointment_cancel',
  APPOINTMENT_COMPLETE = 'appointment_complete',
  
  // Access control
  PERMISSION_GRANT = 'permission_grant',
  PERMISSION_REVOKE = 'permission_revoke',
  ACCESS_DENIED = 'access_denied',
  
  // Data export/privacy
  DATA_EXPORT = 'data_export',
  DATA_ANONYMIZE = 'data_anonymize',
  DATA_DELETE = 'data_delete',
  GDPR_REQUEST = 'gdpr_request'
}

/**
 * Audit trail entry for medical compliance
 */
export interface MedicalAuditEntry {
  id: string;
  timestamp: string;
  clinic_id: number;
  user_id: string;
  user_role: string;
  event_type: MedicalAuditEvent;
  patient_id?: number;
  resource_id?: number;
  resource_type?: string;
  action_details: Record<string, any>;
  ip_address?: string;
  user_agent?: string;
  session_id?: string;
  before_state?: Record<string, any>;
  after_state?: Record<string, any>;
  compliance_tags: string[];
  risk_level: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  legal_basis?: string;
}

/**
 * Medical audit service for LGPD/GDPR compliance
 */
export class MedicalAuditService {
  private auditQueue: MedicalAuditEntry[] = [];
  private readonly maxQueueSize = 50;

  /**
   * Record a medical audit event
   */
  audit(
    eventType: MedicalAuditEvent,
    details: {
      patientId?: number;
      resourceId?: number;
      resourceType?: string;
      actionDetails?: Record<string, any>;
      beforeState?: Record<string, any>;
      afterState?: Record<string, any>;
      ipAddress?: string;
      userAgent?: string;
      sessionId?: string;
      legalBasis?: string;
    } = {}
  ): void {
    try {
      const context = tenantContext.getContext();
      
      if (!context?.clinicId || !context?.userId) {
        structuredLogger.warn(
          LogCategory.AUDIT,
          'audit_missing_context',
          { event_type: eventType, ...details }
        );
        return;
      }

      const auditEntry: MedicalAuditEntry = {
        id: nanoid(16),
        timestamp: new Date().toISOString(),
        clinic_id: context.clinicId,
        user_id: context.userId,
        user_role: context.userRole || 'unknown',
        event_type: eventType,
        patient_id: details.patientId,
        resource_id: details.resourceId,
        resource_type: details.resourceType,
        action_details: this.sanitizeActionDetails(details.actionDetails || {}),
        ip_address: details.ipAddress,
        user_agent: details.userAgent,
        session_id: details.sessionId,
        before_state: this.sanitizeState(details.beforeState),
        after_state: this.sanitizeState(details.afterState),
        compliance_tags: this.generateComplianceTags(eventType, details),
        risk_level: this.assessRiskLevel(eventType, details),
        legal_basis: details.legalBasis || this.getDefaultLegalBasis(eventType)
      };

      this.auditQueue.push(auditEntry);
      
      // Log to structured logger for immediate availability
      structuredLogger.info(
        LogCategory.AUDIT,
        `medical_audit_${eventType}`,
        {
          audit_id: auditEntry.id,
          patient_id: auditEntry.patient_id,
          resource_type: auditEntry.resource_type,
          risk_level: auditEntry.risk_level,
          compliance_tags: auditEntry.compliance_tags,
          action_details: auditEntry.action_details
        },
        `${auditEntry.resource_type}:${auditEntry.resource_id}`
      );

      // Force flush if queue is full
      if (this.auditQueue.length >= this.maxQueueSize) {
        this.flushAuditQueue();
      }

      // Log critical events immediately
      if (auditEntry.risk_level === 'CRITICAL') {
        this.handleCriticalEvent(auditEntry);
      }

    } catch (error) {
      structuredLogger.error(
        LogCategory.AUDIT,
        'audit_recording_failed',
        { error: (error as Error).message, event_type: eventType }
      );
    }
  }

  /**
   * Sanitize action details to remove sensitive information
   */
  private sanitizeActionDetails(details: Record<string, any>): Record<string, any> {
    const sensitiveFields = [
      'password', 'token', 'secret', 'key', 'authorization',
      'credit_card', 'bank_account', 'social_security'
    ];

    const sanitized = { ...details };
    
    for (const field of sensitiveFields) {
      if (field in sanitized) {
        sanitized[field] = '[REDACTED]';
      }
    }

    return sanitized;
  }

  /**
   * Sanitize state data for audit trails
   */
  private sanitizeState(state?: Record<string, any>): Record<string, any> | undefined {
    if (!state) return undefined;

    const sensitiveFields = [
      'password', 'token', 'secret', 'authorization',
      'detailed_medical_history', 'psychiatric_notes'
    ];

    const sanitized = { ...state };
    
    for (const field of sensitiveFields) {
      if (field in sanitized) {
        sanitized[field] = '[REDACTED]';
      }
    }

    return sanitized;
  }

  /**
   * Generate compliance tags based on event type
   */
  private generateComplianceTags(
    eventType: MedicalAuditEvent,
    details: any
  ): string[] {
    const tags: string[] = ['medical_data'];

    // LGPD/GDPR compliance tags
    if (this.isPersonalDataEvent(eventType)) {
      tags.push('personal_data', 'lgpd_article_7', 'gdpr_article_6');
    }

    if (this.isSensitiveDataEvent(eventType)) {
      tags.push('sensitive_data', 'lgpd_article_11', 'gdpr_article_9');
    }

    // Medical compliance tags
    if (this.isMedicalRecordEvent(eventType)) {
      tags.push('medical_record', 'cfm_resolution', 'hipaa_equivalent');
    }

    // Access control tags
    if (this.isAccessControlEvent(eventType)) {
      tags.push('access_control', 'authorization', 'rbac');
    }

    // Export/privacy tags
    if (this.isDataExportEvent(eventType)) {
      tags.push('data_export', 'data_portability', 'lgpd_article_18');
    }

    // Risk-based tags
    if (details.patientId) {
      tags.push('patient_specific');
    }

    return tags;
  }

  /**
   * Assess risk level of the audit event
   */
  private assessRiskLevel(
    eventType: MedicalAuditEvent,
    details: any
  ): 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' {
    // Critical events
    if ([
      MedicalAuditEvent.PATIENT_DELETE,
      MedicalAuditEvent.RECORD_DELETE,
      MedicalAuditEvent.DATA_DELETE,
      MedicalAuditEvent.PERMISSION_GRANT
    ].includes(eventType)) {
      return 'CRITICAL';
    }

    // High risk events
    if ([
      MedicalAuditEvent.DATA_EXPORT,
      MedicalAuditEvent.PATIENT_EXPORT,
      MedicalAuditEvent.RECORD_SHARE,
      MedicalAuditEvent.ACCESS_DENIED
    ].includes(eventType)) {
      return 'HIGH';
    }

    // Medium risk events
    if ([
      MedicalAuditEvent.PATIENT_UPDATE,
      MedicalAuditEvent.RECORD_UPDATE,
      MedicalAuditEvent.PERMISSION_REVOKE
    ].includes(eventType)) {
      return 'MEDIUM';
    }

    // Low risk by default
    return 'LOW';
  }

  /**
   * Get default legal basis for event type
   */
  private getDefaultLegalBasis(eventType: MedicalAuditEvent): string {
    const medicalCareEvents = [
      MedicalAuditEvent.PATIENT_VIEW,
      MedicalAuditEvent.RECORD_VIEW,
      MedicalAuditEvent.APPOINTMENT_VIEW,
      MedicalAuditEvent.RECORD_CREATE,
      MedicalAuditEvent.APPOINTMENT_CREATE
    ];

    if (medicalCareEvents.includes(eventType)) {
      return 'LGPD Art. 7, VI - Medical care';
    }

    return 'LGPD Art. 7, I - Consent';
  }

  /**
   * Check if event involves personal data
   */
  private isPersonalDataEvent(eventType: MedicalAuditEvent): boolean {
    return ![
      MedicalAuditEvent.PERMISSION_GRANT,
      MedicalAuditEvent.PERMISSION_REVOKE
    ].includes(eventType);
  }

  /**
   * Check if event involves sensitive data
   */
  private isSensitiveDataEvent(eventType: MedicalAuditEvent): boolean {
    return [
      MedicalAuditEvent.RECORD_VIEW,
      MedicalAuditEvent.RECORD_CREATE,
      MedicalAuditEvent.RECORD_UPDATE,
      MedicalAuditEvent.RECORD_DELETE
    ].includes(eventType);
  }

  /**
   * Check if event involves medical records
   */
  private isMedicalRecordEvent(eventType: MedicalAuditEvent): boolean {
    return eventType.toString().includes('record');
  }

  /**
   * Check if event involves access control
   */
  private isAccessControlEvent(eventType: MedicalAuditEvent): boolean {
    return [
      MedicalAuditEvent.PERMISSION_GRANT,
      MedicalAuditEvent.PERMISSION_REVOKE,
      MedicalAuditEvent.ACCESS_DENIED
    ].includes(eventType);
  }

  /**
   * Check if event involves data export
   */
  private isDataExportEvent(eventType: MedicalAuditEvent): boolean {
    return [
      MedicalAuditEvent.DATA_EXPORT,
      MedicalAuditEvent.PATIENT_EXPORT,
      MedicalAuditEvent.RECORD_SHARE
    ].includes(eventType);
  }

  /**
   * Handle critical audit events
   */
  private handleCriticalEvent(auditEntry: MedicalAuditEntry): void {
    structuredLogger.error(
      LogCategory.SECURITY,
      'critical_medical_event',
      {
        audit_id: auditEntry.id,
        event_type: auditEntry.event_type,
        patient_id: auditEntry.patient_id,
        user_id: auditEntry.user_id,
        clinic_id: auditEntry.clinic_id,
        compliance_tags: auditEntry.compliance_tags
      }
    );

    // TODO: Integrate with alert system when implemented
    console.warn(`CRITICAL MEDICAL AUDIT EVENT: ${auditEntry.event_type} by ${auditEntry.user_id}`);
  }

  /**
   * Flush audit queue (called periodically)
   */
  private async flushAuditQueue(): Promise<void> {
    if (this.auditQueue.length === 0) return;

    const auditEntries = [...this.auditQueue];
    this.auditQueue = [];

    // Store audit entries persistently
    for (const entry of auditEntries) {
      try {
        // Log each audit entry as structured log
        structuredLogger.info(
          LogCategory.AUDIT,
          'audit_entry_persistent',
          {
            audit_id: entry.id,
            event_type: entry.event_type,
            risk_level: entry.risk_level,
            compliance_tags: entry.compliance_tags,
            patient_id: entry.patient_id
          }
        );
      } catch (error) {
        structuredLogger.error(
          LogCategory.AUDIT,
          'audit_persistence_failed',
          { audit_id: entry.id, error: (error as Error).message }
        );
      }
    }
  }

  /**
   * Get audit trail for a specific patient
   */
  async getPatientAuditTrail(
    patientId: number,
    limit: number = 100
  ): Promise<MedicalAuditEntry[]> {
    try {
      const context = tenantContext.getContext();
      if (!context?.clinicId) {
        throw new Error('No clinic context for audit trail retrieval');
      }

      // Get logs from structured logger
      const logs = await structuredLogger.getLogsByTenant(
        context.clinicId,
        LogCategory.AUDIT,
        limit * 2 // Get more to filter
      );

      // Filter for patient-specific audit entries
      const patientLogs = logs
        .filter(log => 
          log.action.startsWith('medical_audit_') &&
          log.details.patient_id === patientId
        )
        .slice(0, limit);

      // Convert to audit entries (simplified for now)
      return patientLogs.map(log => ({
        id: log.details.audit_id || log.request_id,
        timestamp: log.timestamp,
        clinic_id: log.clinic_id!,
        user_id: log.user_id!,
        user_role: 'unknown', // Would need to lookup
        event_type: log.action.replace('medical_audit_', '') as MedicalAuditEvent,
        patient_id: patientId,
        resource_id: log.details.resource_id,
        resource_type: log.details.resource_type,
        action_details: log.details.action_details || {},
        compliance_tags: log.details.compliance_tags || [],
        risk_level: log.details.risk_level || 'LOW'
      }));

    } catch (error) {
      structuredLogger.error(
        LogCategory.AUDIT,
        'audit_trail_retrieval_failed',
        { patient_id: patientId, error: (error as Error).message }
      );
      return [];
    }
  }

  /**
   * Generate compliance report for a clinic
   */
  async generateComplianceReport(
    startDate: Date,
    endDate: Date
  ): Promise<{
    totalEvents: number;
    riskDistribution: Record<string, number>;
    complianceTagsUsed: string[];
    criticalEvents: number;
    lgpdCompliance: boolean;
  }> {
    try {
      const context = tenantContext.getContext();
      if (!context?.clinicId) {
        throw new Error('No clinic context for compliance report');
      }

      const logs = await structuredLogger.getLogsByTenant(
        context.clinicId,
        LogCategory.AUDIT,
        1000
      );

      // Filter by date range
      const filteredLogs = logs.filter(log => {
        const logDate = new Date(log.timestamp);
        return logDate >= startDate && logDate <= endDate;
      });

      const auditLogs = filteredLogs.filter(log => 
        log.action.startsWith('medical_audit_')
      );

      // Calculate metrics
      const riskDistribution: Record<string, number> = {};
      const complianceTagsSet = new Set<string>();
      let criticalEvents = 0;

      for (const log of auditLogs) {
        const riskLevel = log.details.risk_level || 'LOW';
        riskDistribution[riskLevel] = (riskDistribution[riskLevel] || 0) + 1;

        if (riskLevel === 'CRITICAL') {
          criticalEvents++;
        }

        if (log.details.compliance_tags) {
          log.details.compliance_tags.forEach((tag: string) => 
            complianceTagsSet.add(tag)
          );
        }
      }

      return {
        totalEvents: auditLogs.length,
        riskDistribution,
        complianceTagsUsed: Array.from(complianceTagsSet),
        criticalEvents,
        lgpdCompliance: complianceTagsSet.has('lgpd_article_7') || 
                       complianceTagsSet.has('lgpd_article_11')
      };

    } catch (error) {
      structuredLogger.error(
        LogCategory.AUDIT,
        'compliance_report_failed',
        { error: (error as Error).message }
      );
      throw error;
    }
  }

  /**
   * Helper methods for common audit events
   */
  auditPatientAccess(patientId: number, action: 'view' | 'create' | 'update', details?: Record<string, any>): void {
    const eventMap = {
      view: MedicalAuditEvent.PATIENT_VIEW,
      create: MedicalAuditEvent.PATIENT_CREATE,
      update: MedicalAuditEvent.PATIENT_UPDATE
    };

    this.audit(eventMap[action], {
      patientId,
      resourceType: 'patient',
      actionDetails: details
    });
  }

  auditMedicalRecord(recordId: number, patientId: number, action: 'view' | 'create' | 'update', details?: Record<string, any>): void {
    const eventMap = {
      view: MedicalAuditEvent.RECORD_VIEW,
      create: MedicalAuditEvent.RECORD_CREATE,
      update: MedicalAuditEvent.RECORD_UPDATE
    };

    this.audit(eventMap[action], {
      resourceId: recordId,
      patientId,
      resourceType: 'medical_record',
      actionDetails: details
    });
  }

  auditAccessDenied(resource: string, reason: string, details?: Record<string, any>): void {
    this.audit(MedicalAuditEvent.ACCESS_DENIED, {
      resourceType: resource,
      actionDetails: { reason, ...details }
    });
  }
}

// Singleton instance
export const medicalAudit = new MedicalAuditService();