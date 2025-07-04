import { structuredLogger, LogCategory } from '../shared/structured-logger.service.js';
import { resourceMonitor } from './resource-monitor.service.js';
import { nanoid } from 'nanoid';

/**
 * Medical scenario configuration
 */
export interface MedicalScenario {
  id: string;
  name: string;
  description: string;
  userCount: number;
  duration: number; // in milliseconds
  rampUpTime: number; // in milliseconds
  operations: ScenarioOperation[];
  expectedMetrics: ExpectedMetrics;
}

/**
 * Individual operation within a scenario
 */
export interface ScenarioOperation {
  name: string;
  endpoint: string;
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  weight: number; // probability weight (1-100)
  payload?: any;
  headers?: Record<string, string>;
  expectedStatus: number;
  maxResponseTime: number;
  description: string;
}

/**
 * Expected performance metrics for validation
 */
export interface ExpectedMetrics {
  maxResponseTime: number;
  maxErrorRate: number;
  minThroughput: number;
  maxCpuUsage: number;
  maxMemoryUsage: number;
  minCacheHitRate: number;
}

/**
 * Test execution result
 */
export interface ScenarioResult {
  scenarioId: string;
  startTime: string;
  endTime: string;
  duration: number;
  success: boolean;
  metrics: {
    totalRequests: number;
    successfulRequests: number;
    failedRequests: number;
    averageResponseTime: number;
    p95ResponseTime: number;
    p99ResponseTime: number;
    throughput: number;
    errorRate: number;
  };
  resourceMetrics: {
    avgCpuUsage: number;
    maxCpuUsage: number;
    avgMemoryUsage: number;
    maxMemoryUsage: number;
    avgCacheHitRate: number;
    dbConnectionUsage: number;
  };
  violations: string[];
  recommendations: string[];
}

/**
 * Medical scenarios for healthcare platform load testing
 */
export class MedicalScenarios {
  private scenarios: Map<string, MedicalScenario> = new Map();
  private executionResults: ScenarioResult[] = [];

  constructor() {
    this.initializeScenarios();
  }

  /**
   * Initialize predefined medical scenarios
   */
  private initializeScenarios(): void {
    // Scenario 1: Morning Rush - Multiple doctors logging in
    this.addScenario({
      id: 'morning_rush',
      name: 'Morning Rush Hour',
      description: 'Multiple healthcare professionals logging in simultaneously at start of day',
      userCount: 50,
      duration: 300000, // 5 minutes
      rampUpTime: 60000, // 1 minute ramp-up
      operations: [
        {
          name: 'doctor_login',
          endpoint: '/api/auth/login',
          method: 'POST',
          weight: 100,
          payload: {
            email: 'doctor@clinic.com',
            password: 'password123'
          },
          expectedStatus: 200,
          maxResponseTime: 500,
          description: 'Healthcare professional authentication'
        },
        {
          name: 'get_user_profile',
          endpoint: '/api/user/profile',
          method: 'GET',
          weight: 90,
          expectedStatus: 200,
          maxResponseTime: 300,
          description: 'Load user profile and permissions'
        },
        {
          name: 'get_clinic_config',
          endpoint: '/api/clinic/1/config',
          method: 'GET',
          weight: 80,
          expectedStatus: 200,
          maxResponseTime: 400,
          description: 'Load clinic configuration and settings'
        }
      ],
      expectedMetrics: {
        maxResponseTime: 500,
        maxErrorRate: 2,
        minThroughput: 20,
        maxCpuUsage: 70,
        maxMemoryUsage: 80,
        minCacheHitRate: 75
      }
    });

    // Scenario 2: Patient Record Access - Heavy database read operations
    this.addScenario({
      id: 'patient_records',
      name: 'Patient Records Access',
      description: 'Healthcare professionals accessing and viewing patient medical records',
      userCount: 100,
      duration: 600000, // 10 minutes
      rampUpTime: 120000, // 2 minutes ramp-up
      operations: [
        {
          name: 'list_contacts',
          endpoint: '/api/contacts',
          method: 'GET',
          weight: 100,
          expectedStatus: 200,
          maxResponseTime: 800,
          description: 'Load patient/contact list'
        },
        {
          name: 'get_contact_details',
          endpoint: '/api/contacts/1',
          method: 'GET',
          weight: 80,
          expectedStatus: 200,
          maxResponseTime: 600,
          description: 'Load specific patient details'
        },
        {
          name: 'get_medical_records',
          endpoint: '/api/medical-records/contact/1',
          method: 'GET',
          weight: 70,
          expectedStatus: 200,
          maxResponseTime: 1000,
          description: 'Load patient medical records'
        },
        {
          name: 'search_contacts',
          endpoint: '/api/contacts/search?q=João',
          method: 'GET',
          weight: 50,
          expectedStatus: 200,
          maxResponseTime: 1200,
          description: 'Search for specific patients'
        }
      ],
      expectedMetrics: {
        maxResponseTime: 1200,
        maxErrorRate: 3,
        minThroughput: 30,
        maxCpuUsage: 75,
        maxMemoryUsage: 85,
        minCacheHitRate: 80
      }
    });

    // Scenario 3: Appointment Management - Mixed read/write operations
    this.addScenario({
      id: 'appointment_management',
      name: 'Appointment Management',
      description: 'Creating, updating, and managing patient appointments',
      userCount: 75,
      duration: 900000, // 15 minutes
      rampUpTime: 180000, // 3 minutes ramp-up
      operations: [
        {
          name: 'list_appointments',
          endpoint: '/api/appointments',
          method: 'GET',
          weight: 100,
          expectedStatus: 200,
          maxResponseTime: 700,
          description: 'Load appointment calendar'
        },
        {
          name: 'create_appointment',
          endpoint: '/api/appointments',
          method: 'POST',
          weight: 40,
          payload: {
            contact_id: 1,
            date: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
            time: '10:00',
            duration: 60,
            type: 'consultation',
            notes: 'Regular checkup'
          },
          expectedStatus: 201,
          maxResponseTime: 1000,
          description: 'Schedule new appointment'
        },
        {
          name: 'update_appointment',
          endpoint: '/api/appointments/1',
          method: 'PUT',
          weight: 25,
          payload: {
            notes: 'Updated appointment notes',
            status: 'confirmed'
          },
          expectedStatus: 200,
          maxResponseTime: 800,
          description: 'Update existing appointment'
        },
        {
          name: 'get_available_times',
          endpoint: '/api/appointments/available-times?date=2024-01-01',
          method: 'GET',
          weight: 60,
          expectedStatus: 200,
          maxResponseTime: 900,
          description: 'Check available appointment slots'
        }
      ],
      expectedMetrics: {
        maxResponseTime: 1000,
        maxErrorRate: 4,
        minThroughput: 25,
        maxCpuUsage: 80,
        maxMemoryUsage: 85,
        minCacheHitRate: 70
      }
    });

    // Scenario 4: Concurrent Multi-Clinic - Multi-tenant stress test
    this.addScenario({
      id: 'multi_clinic_stress',
      name: 'Multi-Clinic Concurrent Operations',
      description: 'Multiple clinics operating simultaneously to test tenant isolation',
      userCount: 200,
      duration: 1200000, // 20 minutes
      rampUpTime: 300000, // 5 minutes ramp-up
      operations: [
        {
          name: 'clinic_1_operations',
          endpoint: '/api/contacts',
          method: 'GET',
          weight: 100,
          headers: { 'X-Clinic-ID': '1' },
          expectedStatus: 200,
          maxResponseTime: 800,
          description: 'Clinic 1 patient access'
        },
        {
          name: 'clinic_2_operations',
          endpoint: '/api/contacts',
          method: 'GET',
          weight: 100,
          headers: { 'X-Clinic-ID': '2' },
          expectedStatus: 200,
          maxResponseTime: 800,
          description: 'Clinic 2 patient access'
        },
        {
          name: 'clinic_3_operations',
          endpoint: '/api/appointments',
          method: 'GET',
          weight: 80,
          headers: { 'X-Clinic-ID': '3' },
          expectedStatus: 200,
          maxResponseTime: 900,
          description: 'Clinic 3 appointment management'
        },
        {
          name: 'cross_clinic_isolation_test',
          endpoint: '/api/contacts/search?q=test',
          method: 'GET',
          weight: 30,
          expectedStatus: 200,
          maxResponseTime: 1000,
          description: 'Test tenant isolation boundaries'
        }
      ],
      expectedMetrics: {
        maxResponseTime: 1000,
        maxErrorRate: 5,
        minThroughput: 40,
        maxCpuUsage: 85,
        maxMemoryUsage: 90,
        minCacheHitRate: 75
      }
    });

    // Scenario 5: Report Generation - Resource intensive operations
    this.addScenario({
      id: 'report_generation',
      name: 'Medical Reports Generation',
      description: 'Generate complex medical reports and analytics',
      userCount: 25,
      duration: 600000, // 10 minutes
      rampUpTime: 60000, // 1 minute ramp-up
      operations: [
        {
          name: 'analytics_overview',
          endpoint: '/api/analytics/overview',
          method: 'GET',
          weight: 100,
          expectedStatus: 200,
          maxResponseTime: 2000,
          description: 'Generate clinic overview analytics'
        },
        {
          name: 'patient_analytics',
          endpoint: '/api/analytics/patients',
          method: 'GET',
          weight: 80,
          expectedStatus: 200,
          maxResponseTime: 3000,
          description: 'Generate patient statistics'
        },
        {
          name: 'appointment_analytics',
          endpoint: '/api/analytics/appointments',
          method: 'GET',
          weight: 70,
          expectedStatus: 200,
          maxResponseTime: 2500,
          description: 'Generate appointment analytics'
        },
        {
          name: 'export_data',
          endpoint: '/api/analytics/export',
          method: 'POST',
          weight: 20,
          payload: {
            type: 'patients',
            format: 'xlsx',
            dateRange: 'last_month'
          },
          expectedStatus: 200,
          maxResponseTime: 5000,
          description: 'Export medical data reports'
        }
      ],
      expectedMetrics: {
        maxResponseTime: 5000,
        maxErrorRate: 6,
        minThroughput: 5,
        maxCpuUsage: 90,
        maxMemoryUsage: 95,
        minCacheHitRate: 60
      }
    });

    // Scenario 6: Peak Load Simulation - Maximum capacity test
    this.addScenario({
      id: 'peak_load',
      name: 'Peak Load Simulation',
      description: 'Simulate maximum expected load with 1000 concurrent users',
      userCount: 1000,
      duration: 1800000, // 30 minutes
      rampUpTime: 600000, // 10 minutes ramp-up
      operations: [
        {
          name: 'mixed_read_operations',
          endpoint: '/api/contacts',
          method: 'GET',
          weight: 60,
          expectedStatus: 200,
          maxResponseTime: 1000,
          description: 'Mixed read operations'
        },
        {
          name: 'appointment_operations',
          endpoint: '/api/appointments',
          method: 'GET',
          weight: 50,
          expectedStatus: 200,
          maxResponseTime: 1200,
          description: 'Appointment calendar access'
        },
        {
          name: 'medical_record_access',
          endpoint: '/api/medical-records/contact/1',
          method: 'GET',
          weight: 40,
          expectedStatus: 200,
          maxResponseTime: 1500,
          description: 'Medical records access'
        },
        {
          name: 'write_operations',
          endpoint: '/api/appointments',
          method: 'POST',
          weight: 15,
          payload: {
            contact_id: 1,
            date: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
            time: '14:00',
            duration: 30,
            type: 'follow_up'
          },
          expectedStatus: 201,
          maxResponseTime: 2000,
          description: 'Create new appointments'
        },
        {
          name: 'search_operations',
          endpoint: '/api/contacts/search?q=patient',
          method: 'GET',
          weight: 25,
          expectedStatus: 200,
          maxResponseTime: 1800,
          description: 'Patient search operations'
        }
      ],
      expectedMetrics: {
        maxResponseTime: 2000,
        maxErrorRate: 8,
        minThroughput: 100,
        maxCpuUsage: 95,
        maxMemoryUsage: 95,
        minCacheHitRate: 85
      }
    });

    structuredLogger.info(
      LogCategory.PERFORMANCE,
      'medical_scenarios_initialized',
      { total_scenarios: this.scenarios.size }
    );
  }

  /**
   * Add a custom scenario
   */
  addScenario(scenario: MedicalScenario): void {
    this.scenarios.set(scenario.id, scenario);
    
    structuredLogger.info(
      LogCategory.PERFORMANCE,
      'medical_scenario_added',
      {
        scenario_id: scenario.id,
        name: scenario.name,
        user_count: scenario.userCount,
        duration: scenario.duration,
        operations: scenario.operations.length
      }
    );
  }

  /**
   * Get scenario by ID
   */
  getScenario(id: string): MedicalScenario | undefined {
    return this.scenarios.get(id);
  }

  /**
   * Get all available scenarios
   */
  getAllScenarios(): MedicalScenario[] {
    return Array.from(this.scenarios.values());
  }

  /**
   * Get scenarios filtered by user count
   */
  getScenariosByUserCount(minUsers: number, maxUsers: number): MedicalScenario[] {
    return Array.from(this.scenarios.values()).filter(
      scenario => scenario.userCount >= minUsers && scenario.userCount <= maxUsers
    );
  }

  /**
   * Get progressive scenarios for gradual load testing
   */
  getProgressiveScenarios(): MedicalScenario[] {
    return Array.from(this.scenarios.values())
      .sort((a, b) => a.userCount - b.userCount);
  }

  /**
   * Validate scenario configuration
   */
  validateScenario(scenario: MedicalScenario): string[] {
    const errors: string[] = [];

    if (!scenario.id || scenario.id.trim() === '') {
      errors.push('Scenario ID is required');
    }

    if (!scenario.name || scenario.name.trim() === '') {
      errors.push('Scenario name is required');
    }

    if (scenario.userCount <= 0) {
      errors.push('User count must be greater than 0');
    }

    if (scenario.duration <= 0) {
      errors.push('Duration must be greater than 0');
    }

    if (scenario.rampUpTime < 0) {
      errors.push('Ramp-up time cannot be negative');
    }

    if (scenario.rampUpTime >= scenario.duration) {
      errors.push('Ramp-up time must be less than total duration');
    }

    if (!scenario.operations || scenario.operations.length === 0) {
      errors.push('At least one operation is required');
    }

    // Validate operations
    scenario.operations.forEach((op, index) => {
      if (!op.name || op.name.trim() === '') {
        errors.push(`Operation ${index + 1}: Name is required`);
      }

      if (!op.endpoint || op.endpoint.trim() === '') {
        errors.push(`Operation ${index + 1}: Endpoint is required`);
      }

      if (!['GET', 'POST', 'PUT', 'PATCH', 'DELETE'].includes(op.method)) {
        errors.push(`Operation ${index + 1}: Invalid HTTP method`);
      }

      if (op.weight < 1 || op.weight > 100) {
        errors.push(`Operation ${index + 1}: Weight must be between 1 and 100`);
      }

      if (op.expectedStatus < 100 || op.expectedStatus >= 600) {
        errors.push(`Operation ${index + 1}: Invalid expected status code`);
      }

      if (op.maxResponseTime <= 0) {
        errors.push(`Operation ${index + 1}: Max response time must be greater than 0`);
      }
    });

    // Validate expected metrics
    const metrics = scenario.expectedMetrics;
    if (metrics.maxResponseTime <= 0) {
      errors.push('Expected max response time must be greater than 0');
    }

    if (metrics.maxErrorRate < 0 || metrics.maxErrorRate > 100) {
      errors.push('Expected max error rate must be between 0 and 100');
    }

    if (metrics.minThroughput <= 0) {
      errors.push('Expected min throughput must be greater than 0');
    }

    return errors;
  }

  /**
   * Generate scenario execution plan
   */
  generateExecutionPlan(scenarioId: string): {
    scenario: MedicalScenario;
    executionSteps: Array<{
      step: number;
      time: number;
      activeUsers: number;
      operations: string[];
    }>;
    estimatedRequests: number;
  } | null {
    const scenario = this.scenarios.get(scenarioId);
    if (!scenario) {
      return null;
    }

    const steps = [];
    const stepDuration = 10000; // 10 seconds per step
    const totalSteps = Math.ceil(scenario.duration / stepDuration);
    const rampUpSteps = Math.ceil(scenario.rampUpTime / stepDuration);

    let estimatedRequests = 0;

    for (let step = 0; step < totalSteps; step++) {
      const time = step * stepDuration;
      let activeUsers: number;

      if (step < rampUpSteps) {
        // Ramp-up phase
        activeUsers = Math.floor((step + 1) * scenario.userCount / rampUpSteps);
      } else {
        // Steady state
        activeUsers = scenario.userCount;
      }

      const operations = scenario.operations
        .filter(op => Math.random() * 100 < op.weight)
        .map(op => op.name);

      steps.push({
        step: step + 1,
        time,
        activeUsers,
        operations
      });

      // Estimate requests for this step (rough calculation)
      estimatedRequests += activeUsers * operations.length;
    }

    return {
      scenario,
      executionSteps: steps,
      estimatedRequests
    };
  }

  /**
   * Get execution results history
   */
  getExecutionResults(): ScenarioResult[] {
    return [...this.executionResults];
  }

  /**
   * Get execution results for specific scenario
   */
  getScenarioResults(scenarioId: string): ScenarioResult[] {
    return this.executionResults.filter(result => result.scenarioId === scenarioId);
  }

  /**
   * Add execution result
   */
  addExecutionResult(result: ScenarioResult): void {
    this.executionResults.push(result);
    
    structuredLogger.info(
      LogCategory.PERFORMANCE,
      'scenario_execution_completed',
      {
        scenario_id: result.scenarioId,
        success: result.success,
        duration: result.duration,
        total_requests: result.metrics.totalRequests,
        error_rate: result.metrics.errorRate,
        avg_response_time: result.metrics.averageResponseTime
      }
    );
  }

  /**
   * Get scenario recommendations based on results
   */
  getScenarioRecommendations(scenarioId: string): string[] {
    const results = this.getScenarioResults(scenarioId);
    if (results.length === 0) {
      return ['No execution results available for analysis'];
    }

    const latestResult = results[results.length - 1];
    const scenario = this.scenarios.get(scenarioId);
    
    if (!scenario) {
      return ['Scenario not found'];
    }

    const recommendations: string[] = [];

    // Response time analysis
    if (latestResult.metrics.averageResponseTime > scenario.expectedMetrics.maxResponseTime) {
      recommendations.push(`Average response time (${latestResult.metrics.averageResponseTime}ms) exceeds target (${scenario.expectedMetrics.maxResponseTime}ms). Consider optimizing database queries or adding caching.`);
    }

    // Error rate analysis
    if (latestResult.metrics.errorRate > scenario.expectedMetrics.maxErrorRate) {
      recommendations.push(`Error rate (${latestResult.metrics.errorRate}%) exceeds target (${scenario.expectedMetrics.maxErrorRate}%). Review error logs and increase system stability.`);
    }

    // Throughput analysis
    if (latestResult.metrics.throughput < scenario.expectedMetrics.minThroughput) {
      recommendations.push(`Throughput (${latestResult.metrics.throughput} req/s) below target (${scenario.expectedMetrics.minThroughput} req/s). Consider horizontal scaling or performance optimization.`);
    }

    // Resource usage analysis
    if (latestResult.resourceMetrics.maxCpuUsage > scenario.expectedMetrics.maxCpuUsage) {
      recommendations.push(`CPU usage (${latestResult.resourceMetrics.maxCpuUsage}%) exceeds target (${scenario.expectedMetrics.maxCpuUsage}%). Consider CPU optimization or additional computing resources.`);
    }

    if (latestResult.resourceMetrics.maxMemoryUsage > scenario.expectedMetrics.maxMemoryUsage) {
      recommendations.push(`Memory usage (${latestResult.resourceMetrics.maxMemoryUsage}%) exceeds target (${scenario.expectedMetrics.maxMemoryUsage}%). Review memory leaks and optimize memory usage.`);
    }

    // Cache performance analysis
    if (latestResult.resourceMetrics.avgCacheHitRate < scenario.expectedMetrics.minCacheHitRate) {
      recommendations.push(`Cache hit rate (${latestResult.resourceMetrics.avgCacheHitRate}%) below target (${scenario.expectedMetrics.minCacheHitRate}%). Review caching strategy and TTL configurations.`);
    }

    if (recommendations.length === 0) {
      recommendations.push('All metrics within expected ranges. System performing well for this scenario.');
    }

    return recommendations;
  }

  /**
   * Export scenarios for external tools
   */
  exportScenarios(): string {
    const exportData = {
      generated_at: new Date().toISOString(),
      total_scenarios: this.scenarios.size,
      scenarios: Array.from(this.scenarios.values()),
      execution_results: this.executionResults
    };

    return JSON.stringify(exportData, null, 2);
  }
}

// Singleton instance
export const medicalScenarios = new MedicalScenarios();