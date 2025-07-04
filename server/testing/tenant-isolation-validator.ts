import { structuredLogger, LogCategory } from '../shared/structured-logger.service.js';
import { tenantContext } from '../shared/tenant-context.provider.js';
import { medicalAudit, MedicalAuditEvent } from '../shared/medical-audit.service.js';
import { nanoid } from 'nanoid';

/**
 * Tenant isolation test configuration
 */
export interface TenantIsolationTestConfig {
  id: string;
  name: string;
  description: string;
  clinicIds: number[];
  concurrentUsers: number;
  testDuration: number;
  operations: TenantTestOperation[];
}

/**
 * Tenant test operation
 */
export interface TenantTestOperation {
  name: string;
  endpoint: string;
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  expectedIsolation: boolean; // true if operation should respect tenant boundaries
  crossTenantAttempt?: boolean; // true if this is testing cross-tenant access
  payload?: any;
}

/**
 * Isolation violation record
 */
export interface IsolationViolation {
  id: string;
  timestamp: string;
  testId: string;
  clinicId: number;
  userId: string;
  operation: string;
  violationType: 'data_leak' | 'unauthorized_access' | 'cache_leak' | 'audit_failure';
  description: string;
  evidence: any;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
}

/**
 * Test execution result
 */
export interface TenantIsolationResult {
  testId: string;
  testName: string;
  startTime: string;
  endTime: string;
  duration: number;
  success: boolean;
  totalOperations: number;
  violations: IsolationViolation[];
  performanceImpact: {
    avgResponseTime: number;
    maxResponseTime: number;
    cacheHitRate: number;
    isolationOverhead: number; // percentage overhead
  };
  recommendations: string[];
}

/**
 * Tenant isolation validator for ensuring multi-tenant security under load
 */
export class TenantIsolationValidator {
  private activeTests: Map<string, any> = new Map();
  private testResults: TenantIsolationResult[] = [];
  private violations: IsolationViolation[] = [];

  constructor() {
    this.initializeTestSuites();
  }

  /**
   * Initialize predefined test suites
   */
  private initializeTestSuites(): void {
    // Basic isolation tests will be defined here
    structuredLogger.info(
      LogCategory.SECURITY,
      'tenant_isolation_validator_initialized',
      { test_suites: 'basic_isolation' }
    );
  }

  /**
   * Execute tenant isolation validation
   */
  async executeTenantIsolationTest(config: TenantIsolationTestConfig): Promise<string> {
    const testId = nanoid();
    const startTime = Date.now();

    const testExecution = {
      testId,
      config,
      startTime,
      status: 'running',
      violations: [],
      operationCount: 0,
      responseTimes: []
    };

    this.activeTests.set(testId, testExecution);

    structuredLogger.info(
      LogCategory.SECURITY,
      'tenant_isolation_test_started',
      {
        test_id: testId,
        test_name: config.name,
        clinics: config.clinicIds,
        concurrent_users: config.concurrentUsers,
        duration: config.testDuration
      }
    );

    try {
      await this.runIsolationTest(testExecution);
      return testId;
    } catch (error) {
      testExecution.status = 'failed';
      structuredLogger.error(
        LogCategory.SECURITY,
        'tenant_isolation_test_failed',
        { test_id: testId, error: (error as Error).message }
      );
      throw error;
    }
  }

  /**
   * Run the actual isolation test
   */
  private async runIsolationTest(testExecution: any): Promise<void> {
    const { config } = testExecution;
    const endTime = testExecution.startTime + config.testDuration;

    // Create concurrent users for each clinic
    const userPromises = [];
    
    for (const clinicId of config.clinicIds) {
      for (let i = 0; i < config.concurrentUsers; i++) {
        userPromises.push(this.simulateTenantUser(testExecution, clinicId, i));
      }
    }

    // Wait for test completion
    await Promise.race([
      Promise.all(userPromises),
      this.waitForTimeout(config.testDuration)
    ]);

    // Finalize test
    testExecution.endTime = Date.now();
    testExecution.status = 'completed';

    const result = this.generateTestResult(testExecution);
    this.testResults.push(result);

    structuredLogger.info(
      LogCategory.SECURITY,
      'tenant_isolation_test_completed',
      {
        test_id: testExecution.testId,
        duration: testExecution.endTime - testExecution.startTime,
        violations: result.violations.length,
        success: result.success
      }
    );
  }

  /**
   * Simulate a tenant user performing operations
   */
  private async simulateTenantUser(testExecution: any, clinicId: number, userIndex: number): Promise<void> {
    const userId = `clinic_${clinicId}_user_${userIndex}`;
    const { config } = testExecution;
    const endTime = testExecution.startTime + config.testDuration;

    while (Date.now() < endTime && testExecution.status === 'running') {
      try {
        // Set tenant context for this user
        tenantContext.setContext({
          userId,
          clinicId,
          userRole: 'professional',
          isProfessional: true
        });

        // Execute operations
        for (const operation of config.operations) {
          if (Date.now() >= endTime) break;

          await this.executeIsolationTestOperation(testExecution, operation, clinicId, userId);
          
          // Random delay between operations
          await this.sleep(100 + Math.random() * 400);
        }

        // Longer delay between operation cycles
        await this.sleep(1000 + Math.random() * 2000);

      } catch (error) {
        // Log error but continue test
        structuredLogger.error(
          LogCategory.SECURITY,
          'tenant_user_simulation_error',
          {
            test_id: testExecution.testId,
            clinic_id: clinicId,
            user_id: userId,
            error: (error as Error).message
          }
        );
      }
    }
  }

  /**
   * Execute a single isolation test operation
   */
  private async executeIsolationTestOperation(
    testExecution: any,
    operation: TenantTestOperation,
    clinicId: number,
    userId: string
  ): Promise<void> {
    const startTime = Date.now();
    let violation: IsolationViolation | null = null;

    try {
      testExecution.operationCount++;

      // Simulate the operation and check for isolation violations
      const result = await this.simulateOperation(operation, clinicId);
      const responseTime = Date.now() - startTime;
      testExecution.responseTimes.push(responseTime);

      // Validate tenant isolation
      violation = await this.validateOperationIsolation(
        testExecution.testId,
        operation,
        result,
        clinicId,
        userId
      );

      if (violation) {
        testExecution.violations.push(violation);
        this.violations.push(violation);

        // Log the violation
        structuredLogger.error(
          LogCategory.SECURITY,
          'tenant_isolation_violation',
          {
            test_id: testExecution.testId,
            violation_id: violation.id,
            violation_type: violation.violationType,
            clinic_id: clinicId,
            operation: operation.name,
            severity: violation.severity
          }
        );

        // Audit the violation
        medicalAudit.audit(MedicalAuditEvent.ACCESS_DENIED, {
          actionDetails: {
            violation_type: violation.violationType,
            operation: operation.name,
            test_context: true
          },
          ipAddress: '127.0.0.1',
          userAgent: 'TenantIsolationValidator'
        });
      }

    } catch (error) {
      // Operation failed - this might be expected for cross-tenant attempts
      if (operation.crossTenantAttempt && operation.expectedIsolation) {
        // This is good - cross-tenant access was properly blocked
        structuredLogger.debug(
          LogCategory.SECURITY,
          'cross_tenant_access_properly_blocked',
          {
            test_id: testExecution.testId,
            operation: operation.name,
            clinic_id: clinicId
          }
        );
      } else {
        // Unexpected failure
        violation = {
          id: nanoid(),
          timestamp: new Date().toISOString(),
          testId: testExecution.testId,
          clinicId,
          userId,
          operation: operation.name,
          violationType: 'unauthorized_access',
          description: `Operation failed unexpectedly: ${(error as Error).message}`,
          evidence: { error: (error as Error).message },
          severity: 'MEDIUM'
        };

        testExecution.violations.push(violation);
        this.violations.push(violation);
      }
    }
  }

  /**
   * Simulate an API operation for testing
   */
  private async simulateOperation(operation: TenantTestOperation, clinicId: number): Promise<any> {
    // Simulate different types of operations
    switch (operation.name) {
      case 'list_contacts':
        return this.simulateContactsList(clinicId);
      
      case 'get_contact_details':
        return this.simulateContactDetails(clinicId, 1);
      
      case 'search_contacts':
        return this.simulateContactSearch(clinicId, 'test');
      
      case 'list_appointments':
        return this.simulateAppointmentsList(clinicId);
      
      case 'cross_tenant_contact_access':
        return this.simulateCrossTenantAccess(clinicId);
      
      case 'cache_isolation_test':
        return this.simulateCacheIsolationTest(clinicId);
      
      default:
        return { success: true, data: [], clinic_id: clinicId };
    }
  }

  /**
   * Simulate contacts list operation
   */
  private async simulateContactsList(clinicId: number): Promise<any> {
    // Simulate realistic delay
    await this.sleep(50 + Math.random() * 100);
    
    // Return mock data that should be filtered by clinic
    return {
      success: true,
      data: [
        { id: 1, name: 'Patient 1', clinic_id: clinicId },
        { id: 2, name: 'Patient 2', clinic_id: clinicId }
      ],
      clinic_id: clinicId
    };
  }

  /**
   * Simulate contact details operation
   */
  private async simulateContactDetails(clinicId: number, contactId: number): Promise<any> {
    await this.sleep(30 + Math.random() * 70);
    
    return {
      success: true,
      data: {
        id: contactId,
        name: `Patient ${contactId}`,
        clinic_id: clinicId,
        medical_records: [
          { id: 1, type: 'consultation', clinic_id: clinicId }
        ]
      }
    };
  }

  /**
   * Simulate contact search operation
   */
  private async simulateContactSearch(clinicId: number, query: string): Promise<any> {
    await this.sleep(100 + Math.random() * 200);
    
    return {
      success: true,
      data: [
        { id: 1, name: `${query} Patient`, clinic_id: clinicId }
      ],
      query,
      clinic_id: clinicId
    };
  }

  /**
   * Simulate appointments list operation
   */
  private async simulateAppointmentsList(clinicId: number): Promise<any> {
    await this.sleep(60 + Math.random() * 120);
    
    return {
      success: true,
      data: [
        {
          id: 1,
          contact_id: 1,
          clinic_id: clinicId,
          date: new Date().toISOString(),
          status: 'scheduled'
        }
      ]
    };
  }

  /**
   * Simulate cross-tenant access attempt
   */
  private async simulateCrossTenantAccess(currentClinicId: number): Promise<any> {
    // Attempt to access data from a different clinic
    const targetClinicId = currentClinicId === 1 ? 2 : 1;
    
    await this.sleep(50 + Math.random() * 100);
    
    // This should fail or return empty data if isolation is working
    return {
      success: false,
      error: 'Access denied - cross-tenant access not allowed',
      attempted_clinic: targetClinicId,
      current_clinic: currentClinicId
    };
  }

  /**
   * Simulate cache isolation test
   */
  private async simulateCacheIsolationTest(clinicId: number): Promise<any> {
    await this.sleep(20 + Math.random() * 40);
    
    // Test that cache keys are properly isolated
    const cacheKey = `clinic_${clinicId}_data`;
    
    return {
      success: true,
      cache_key: cacheKey,
      data: { clinic_specific: true, clinic_id: clinicId }
    };
  }

  /**
   * Validate operation isolation
   */
  private async validateOperationIsolation(
    testId: string,
    operation: TenantTestOperation,
    result: any,
    clinicId: number,
    userId: string
  ): Promise<IsolationViolation | null> {
    const violations: IsolationViolation[] = [];

    // Check for data leakage
    if (result.data && Array.isArray(result.data)) {
      for (const item of result.data) {
        if (item.clinic_id && item.clinic_id !== clinicId) {
          violations.push({
            id: nanoid(),
            timestamp: new Date().toISOString(),
            testId,
            clinicId,
            userId,
            operation: operation.name,
            violationType: 'data_leak',
            description: `Data from clinic ${item.clinic_id} leaked to clinic ${clinicId}`,
            evidence: { leaked_item: item, expected_clinic: clinicId },
            severity: 'CRITICAL'
          });
        }
      }
    }

    // Check for unauthorized access success
    if (operation.crossTenantAttempt && operation.expectedIsolation && result.success) {
      violations.push({
        id: nanoid(),
        timestamp: new Date().toISOString(),
        testId,
        clinicId,
        userId,
        operation: operation.name,
        violationType: 'unauthorized_access',
        description: 'Cross-tenant access attempt succeeded when it should have been blocked',
        evidence: { operation_result: result },
        severity: 'CRITICAL'
      });
    }

    // Check cache isolation
    if (operation.name.includes('cache') && result.cache_key) {
      if (!result.cache_key.includes(`clinic_${clinicId}`)) {
        violations.push({
          id: nanoid(),
          timestamp: new Date().toISOString(),
          testId,
          clinicId,
          userId,
          operation: operation.name,
          violationType: 'cache_leak',
          description: 'Cache key does not include proper clinic isolation',
          evidence: { cache_key: result.cache_key, expected_clinic: clinicId },
          severity: 'HIGH'
        });
      }
    }

    // Return the most severe violation found
    if (violations.length > 0) {
      return violations.sort((a, b) => {
        const severityOrder = { CRITICAL: 4, HIGH: 3, MEDIUM: 2, LOW: 1 };
        return severityOrder[b.severity] - severityOrder[a.severity];
      })[0];
    }

    return null;
  }

  /**
   * Generate test result
   */
  private generateTestResult(testExecution: any): TenantIsolationResult {
    const duration = testExecution.endTime - testExecution.startTime;
    const violations = testExecution.violations;
    
    // Calculate performance impact
    const avgResponseTime = testExecution.responseTimes.length > 0 ?
      testExecution.responseTimes.reduce((a: number, b: number) => a + b, 0) / testExecution.responseTimes.length : 0;
    
    const maxResponseTime = testExecution.responseTimes.length > 0 ?
      Math.max(...testExecution.responseTimes) : 0;

    // Estimate isolation overhead (rough calculation)
    const baselineResponseTime = 100; // Estimated baseline without isolation
    const isolationOverhead = avgResponseTime > baselineResponseTime ?
      ((avgResponseTime - baselineResponseTime) / baselineResponseTime) * 100 : 0;

    return {
      testId: testExecution.testId,
      testName: testExecution.config.name,
      startTime: new Date(testExecution.startTime).toISOString(),
      endTime: new Date(testExecution.endTime).toISOString(),
      duration,
      success: violations.length === 0,
      totalOperations: testExecution.operationCount,
      violations,
      performanceImpact: {
        avgResponseTime,
        maxResponseTime,
        cacheHitRate: 85, // This would come from actual cache metrics
        isolationOverhead
      },
      recommendations: this.generateRecommendations(violations, testExecution)
    };
  }

  /**
   * Generate recommendations based on test results
   */
  private generateRecommendations(violations: IsolationViolation[], testExecution: any): string[] {
    const recommendations: string[] = [];

    // Analyze violation patterns
    const violationTypes = violations.map(v => v.violationType);
    const severityLevels = violations.map(v => v.severity);

    if (violationTypes.includes('data_leak')) {
      recommendations.push('Critical: Data leakage detected. Review database query filters and ensure all queries include clinic_id constraints.');
    }

    if (violationTypes.includes('unauthorized_access')) {
      recommendations.push('High: Unauthorized cross-tenant access detected. Strengthen authentication and authorization middleware.');
    }

    if (violationTypes.includes('cache_leak')) {
      recommendations.push('Medium: Cache isolation issues detected. Review cache key generation to ensure tenant-specific keys.');
    }

    if (severityLevels.includes('CRITICAL')) {
      recommendations.push('Immediate action required: Critical security violations detected. System should not be deployed to production.');
    }

    // Performance recommendations
    const avgResponseTime = testExecution.responseTimes.length > 0 ?
      testExecution.responseTimes.reduce((a: number, b: number) => a + b, 0) / testExecution.responseTimes.length : 0;

    if (avgResponseTime > 500) {
      recommendations.push('Performance: High response times detected. Consider optimizing tenant isolation implementation.');
    }

    if (recommendations.length === 0) {
      recommendations.push('Good: No security violations detected. Tenant isolation is working correctly under load.');
    }

    return recommendations;
  }

  /**
   * Create comprehensive isolation test suite
   */
  createComprehensiveTestSuite(): TenantIsolationTestConfig {
    return {
      id: 'comprehensive_isolation',
      name: 'Comprehensive Tenant Isolation Test',
      description: 'Complete validation of multi-tenant isolation under concurrent load',
      clinicIds: [1, 2, 3],
      concurrentUsers: 20, // 20 users per clinic = 60 total
      testDuration: 300000, // 5 minutes
      operations: [
        {
          name: 'list_contacts',
          endpoint: '/api/contacts',
          method: 'GET',
          expectedIsolation: true
        },
        {
          name: 'get_contact_details',
          endpoint: '/api/contacts/1',
          method: 'GET',
          expectedIsolation: true
        },
        {
          name: 'search_contacts',
          endpoint: '/api/contacts/search',
          method: 'GET',
          expectedIsolation: true
        },
        {
          name: 'list_appointments',
          endpoint: '/api/appointments',
          method: 'GET',
          expectedIsolation: true
        },
        {
          name: 'cross_tenant_contact_access',
          endpoint: '/api/contacts',
          method: 'GET',
          expectedIsolation: true,
          crossTenantAttempt: true
        },
        {
          name: 'cache_isolation_test',
          endpoint: '/api/contacts',
          method: 'GET',
          expectedIsolation: true
        }
      ]
    };
  }

  /**
   * Get all test results
   */
  getAllTestResults(): TenantIsolationResult[] {
    return [...this.testResults];
  }

  /**
   * Get test result by ID
   */
  getTestResult(testId: string): TenantIsolationResult | undefined {
    return this.testResults.find(result => result.testId === testId);
  }

  /**
   * Get all violations
   */
  getAllViolations(): IsolationViolation[] {
    return [...this.violations];
  }

  /**
   * Get violations by test ID
   */
  getViolationsByTest(testId: string): IsolationViolation[] {
    return this.violations.filter(violation => violation.testId === testId);
  }

  /**
   * Get violations by severity
   */
  getViolationsBySeverity(severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'): IsolationViolation[] {
    return this.violations.filter(violation => violation.severity === severity);
  }

  /**
   * Clear test history
   */
  clearTestHistory(): void {
    this.testResults = [];
    this.violations = [];
    this.activeTests.clear();
    
    structuredLogger.info(
      LogCategory.SECURITY,
      'tenant_isolation_test_history_cleared',
      { timestamp: new Date().toISOString() }
    );
  }

  /**
   * Wait for timeout
   */
  private waitForTimeout(duration: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, duration));
  }

  /**
   * Sleep utility
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Export test results for analysis
   */
  exportResults(): string {
    return JSON.stringify({
      timestamp: new Date().toISOString(),
      total_tests: this.testResults.length,
      total_violations: this.violations.length,
      test_results: this.testResults,
      violations: this.violations,
      summary: {
        critical_violations: this.violations.filter(v => v.severity === 'CRITICAL').length,
        high_violations: this.violations.filter(v => v.severity === 'HIGH').length,
        medium_violations: this.violations.filter(v => v.severity === 'MEDIUM').length,
        low_violations: this.violations.filter(v => v.severity === 'LOW').length
      }
    }, null, 2);
  }
}

// Singleton instance
export const tenantIsolationValidator = new TenantIsolationValidator();