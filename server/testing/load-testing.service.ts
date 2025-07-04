import { structuredLogger, LogCategory } from '../shared/structured-logger.service.js';
import { medicalScenarios, MedicalScenario, ScenarioResult } from './medical-scenarios.js';
import { resourceMonitor, ResourceSnapshot } from './resource-monitor.service.js';
import { smartAlerts } from '../shared/smart-alerts.service.js';
import { EventEmitter } from 'events';
import { nanoid } from 'nanoid';

/**
 * Load testing configuration
 */
export interface LoadTestConfig {
  id: string;
  name: string;
  description: string;
  scenarioIds: string[];
  maxConcurrentUsers: number;
  testDuration: number; // milliseconds
  rampUpStrategy: 'linear' | 'exponential' | 'step';
  abortOnFailure: boolean;
  targetMetrics: {
    maxResponseTime: number;
    maxErrorRate: number;
    minThroughput: number;
    maxCpuUsage: number;
    maxMemoryUsage: number;
  };
}

/**
 * Virtual user simulation
 */
interface VirtualUser {
  id: string;
  scenarioId: string;
  clinicId: number;
  startTime: number;
  requestCount: number;
  errorCount: number;
  totalResponseTime: number;
  isActive: boolean;
  currentOperation?: string;
}

/**
 * Load test execution state
 */
interface LoadTestExecution {
  testId: string;
  config: LoadTestConfig;
  startTime: number;
  endTime?: number;
  status: 'preparing' | 'running' | 'completed' | 'failed' | 'aborted';
  virtualUsers: Map<string, VirtualUser>;
  metrics: {
    totalRequests: number;
    successfulRequests: number;
    failedRequests: number;
    currentThroughput: number;
    avgResponseTime: number;
    p95ResponseTime: number;
    errorRate: number;
  };
  resourceSnapshots: ResourceSnapshot[];
  violations: string[];
  breakingPoint?: {
    userCount: number;
    timestamp: string;
    reason: string;
  };
}

/**
 * Load testing service for validating system capacity
 */
export class LoadTestingService extends EventEmitter {
  private currentExecution: LoadTestExecution | null = null;
  private executionHistory: LoadTestExecution[] = [];
  private testInterval: NodeJS.Timeout | null = null;
  private metricsInterval: NodeJS.Timeout | null = null;
  private isRunning = false;

  constructor() {
    super();
    this.setupResourceMonitoring();
  }

  /**
   * Setup resource monitoring integration
   */
  private setupResourceMonitoring(): void {
    resourceMonitor.on('threshold_violation', (data) => {
      if (this.currentExecution) {
        const violation = `Resource threshold violation: ${data.violations.map(v => `${v.metric} (${v.current})`).join(', ')}`;
        this.currentExecution.violations.push(violation);
        
        // Check if we should abort on critical violations
        const criticalViolations = data.violations.filter(v => v.severity === 'critical');
        if (criticalViolations.length > 0 && this.currentExecution.config.abortOnFailure) {
          this.abortTest('Critical resource threshold violations detected');
        }
      }
    });
  }

  /**
   * Start a load test execution
   */
  async startLoadTest(config: LoadTestConfig): Promise<string> {
    if (this.isRunning) {
      throw new Error('Load test already running. Stop current test before starting a new one.');
    }

    // Validate configuration
    const validationErrors = this.validateConfig(config);
    if (validationErrors.length > 0) {
      throw new Error(`Configuration validation failed: ${validationErrors.join(', ')}`);
    }

    const testId = nanoid();
    
    this.currentExecution = {
      testId,
      config,
      startTime: Date.now(),
      status: 'preparing',
      virtualUsers: new Map(),
      metrics: {
        totalRequests: 0,
        successfulRequests: 0,
        failedRequests: 0,
        currentThroughput: 0,
        avgResponseTime: 0,
        p95ResponseTime: 0,
        errorRate: 0
      },
      resourceSnapshots: [],
      violations: []
    };

    this.isRunning = true;

    structuredLogger.info(
      LogCategory.PERFORMANCE,
      'load_test_started',
      {
        test_id: testId,
        config_name: config.name,
        max_users: config.maxConcurrentUsers,
        duration: config.testDuration,
        scenarios: config.scenarioIds
      }
    );

    try {
      await this.executeLoadTest();
      return testId;
    } catch (error) {
      this.currentExecution.status = 'failed';
      this.isRunning = false;
      
      structuredLogger.error(
        LogCategory.PERFORMANCE,
        'load_test_execution_failed',
        { test_id: testId, error: (error as Error).message }
      );
      
      throw error;
    }
  }

  /**
   * Execute the load test
   */
  private async executeLoadTest(): Promise<void> {
    if (!this.currentExecution) return;

    const execution = this.currentExecution;
    execution.status = 'running';

    // Start resource monitoring
    resourceMonitor.startMonitoring(1000);

    // Start metrics collection
    this.startMetricsCollection();

    // Execute scenarios based on ramp-up strategy
    await this.executeRampUp();

    // Wait for test completion or timeout
    await this.waitForCompletion();

    // Stop monitoring and finalize
    resourceMonitor.stopMonitoring();
    this.stopMetricsCollection();

    execution.endTime = Date.now();
    execution.status = execution.status === 'running' ? 'completed' : execution.status;

    // Generate final results
    const result = this.generateTestResult();
    this.executionHistory.push(execution);

    structuredLogger.info(
      LogCategory.PERFORMANCE,
      'load_test_completed',
      {
        test_id: execution.testId,
        duration: execution.endTime - execution.startTime,
        total_requests: execution.metrics.totalRequests,
        error_rate: execution.metrics.errorRate,
        avg_response_time: execution.metrics.avgResponseTime,
        violations: execution.violations.length
      }
    );

    this.emit('test_completed', result);
    this.isRunning = false;
  }

  /**
   * Execute ramp-up strategy
   */
  private async executeRampUp(): Promise<void> {
    if (!this.currentExecution) return;

    const config = this.currentExecution.config;
    const scenarios = config.scenarioIds.map(id => medicalScenarios.getScenario(id)).filter(Boolean) as MedicalScenario[];
    
    if (scenarios.length === 0) {
      throw new Error('No valid scenarios found for load test');
    }

    // Calculate ramp-up steps
    const rampUpSteps = 10; // Number of ramp-up steps
    const stepDuration = Math.floor(config.testDuration * 0.3 / rampUpSteps); // 30% of total time for ramp-up
    const usersPerStep = Math.ceil(config.maxConcurrentUsers / rampUpSteps);

    for (let step = 0; step < rampUpSteps && this.isRunning; step++) {
      const currentUsers = Math.min((step + 1) * usersPerStep, config.maxConcurrentUsers);
      
      // Add new virtual users
      while (this.currentExecution.virtualUsers.size < currentUsers && this.isRunning) {
        const scenario = scenarios[Math.floor(Math.random() * scenarios.length)];
        const clinicId = Math.floor(Math.random() * 3) + 1; // Random clinic 1-3
        
        await this.createVirtualUser(scenario, clinicId);
      }

      structuredLogger.debug(
        LogCategory.PERFORMANCE,
        'ramp_up_step',
        {
          step: step + 1,
          current_users: this.currentExecution.virtualUsers.size,
          target_users: currentUsers
        }
      );

      // Wait for step duration
      await this.sleep(stepDuration);

      // Check for breaking point
      if (await this.checkBreakingPoint()) {
        break;
      }
    }
  }

  /**
   * Create a virtual user
   */
  private async createVirtualUser(scenario: MedicalScenario, clinicId: number): Promise<void> {
    if (!this.currentExecution) return;

    const userId = nanoid();
    const virtualUser: VirtualUser = {
      id: userId,
      scenarioId: scenario.id,
      clinicId,
      startTime: Date.now(),
      requestCount: 0,
      errorCount: 0,
      totalResponseTime: 0,
      isActive: true
    };

    this.currentExecution.virtualUsers.set(userId, virtualUser);

    // Start user simulation
    this.simulateUserBehavior(virtualUser, scenario);
  }

  /**
   * Simulate user behavior
   */
  private async simulateUserBehavior(user: VirtualUser, scenario: MedicalScenario): Promise<void> {
    while (user.isActive && this.isRunning) {
      try {
        // Select operation based on weight
        const operation = this.selectOperation(scenario);
        user.currentOperation = operation.name;

        // Simulate request
        const startTime = Date.now();
        resourceMonitor.trackRequest();

        // Simulate network delay and processing time
        const responseTime = await this.simulateRequest(operation, user.clinicId);
        
        const isError = responseTime > operation.maxResponseTime || Math.random() < 0.02; // 2% base error rate
        
        resourceMonitor.trackRequestComplete(responseTime, isError);

        // Update user metrics
        user.requestCount++;
        user.totalResponseTime += responseTime;
        
        if (isError) {
          user.errorCount++;
        }

        // Update execution metrics
        this.updateExecutionMetrics(responseTime, isError);

        // Random delay between requests (simulate think time)
        const thinkTime = Math.random() * 2000 + 500; // 0.5-2.5 seconds
        await this.sleep(thinkTime);

      } catch (error) {
        user.errorCount++;
        this.currentExecution?.violations.push(`User ${user.id} error: ${(error as Error).message}`);
      }
    }
  }

  /**
   * Select operation based on weights
   */
  private selectOperation(scenario: MedicalScenario): any {
    const totalWeight = scenario.operations.reduce((sum, op) => sum + op.weight, 0);
    let random = Math.random() * totalWeight;
    
    for (const operation of scenario.operations) {
      random -= operation.weight;
      if (random <= 0) {
        return operation;
      }
    }
    
    return scenario.operations[0]; // fallback
  }

  /**
   * Simulate HTTP request
   */
  private async simulateRequest(operation: any, clinicId: number): Promise<number> {
    // Simulate realistic response times based on operation type
    let baseTime = 100;
    
    if (operation.method === 'GET') {
      if (operation.endpoint.includes('search')) {
        baseTime = 200 + Math.random() * 400; // Search operations
      } else if (operation.endpoint.includes('analytics')) {
        baseTime = 500 + Math.random() * 1000; // Analytics operations
      } else {
        baseTime = 50 + Math.random() * 200; // Regular GET operations
      }
    } else if (operation.method === 'POST') {
      baseTime = 150 + Math.random() * 300; // Create operations
    } else {
      baseTime = 100 + Math.random() * 250; // Update/Delete operations
    }

    // Add clinic-based variance (simulate different clinic loads)
    const clinicMultiplier = clinicId === 1 ? 1.2 : clinicId === 2 ? 1.0 : 0.8;
    baseTime *= clinicMultiplier;

    // Add current load variance
    const currentLoad = this.currentExecution?.virtualUsers.size || 0;
    const loadMultiplier = 1 + (currentLoad / 1000); // Increase time with load
    baseTime *= loadMultiplier;

    // Simulate actual delay
    await this.sleep(baseTime);
    
    return Math.round(baseTime);
  }

  /**
   * Update execution metrics
   */
  private updateExecutionMetrics(responseTime: number, isError: boolean): void {
    if (!this.currentExecution) return;

    const metrics = this.currentExecution.metrics;
    
    metrics.totalRequests++;
    
    if (isError) {
      metrics.failedRequests++;
    } else {
      metrics.successfulRequests++;
    }

    // Update response time metrics
    const totalResponseTime = metrics.avgResponseTime * (metrics.totalRequests - 1) + responseTime;
    metrics.avgResponseTime = totalResponseTime / metrics.totalRequests;

    // Update error rate
    metrics.errorRate = (metrics.failedRequests / metrics.totalRequests) * 100;

    // Emit progress update
    this.emit('progress', {
      testId: this.currentExecution.testId,
      activeUsers: this.currentExecution.virtualUsers.size,
      metrics
    });
  }

  /**
   * Start metrics collection
   */
  private startMetricsCollection(): void {
    this.metricsInterval = setInterval(() => {
      if (!this.currentExecution) return;

      // Calculate current throughput
      const duration = (Date.now() - this.currentExecution.startTime) / 1000;
      this.currentExecution.metrics.currentThroughput = this.currentExecution.metrics.totalRequests / duration;

      // Collect resource snapshot
      const snapshot = resourceMonitor.getLatestSnapshot();
      if (snapshot) {
        this.currentExecution.resourceSnapshots.push(snapshot);
      }

      // Check target metrics
      this.checkTargetMetrics();

    }, 5000); // Every 5 seconds
  }

  /**
   * Stop metrics collection
   */
  private stopMetricsCollection(): void {
    if (this.metricsInterval) {
      clearInterval(this.metricsInterval);
      this.metricsInterval = null;
    }
  }

  /**
   * Check if target metrics are being met
   */
  private checkTargetMetrics(): void {
    if (!this.currentExecution) return;

    const metrics = this.currentExecution.metrics;
    const targets = this.currentExecution.config.targetMetrics;
    const violations = [];

    if (metrics.avgResponseTime > targets.maxResponseTime) {
      violations.push(`Average response time (${metrics.avgResponseTime}ms) exceeds target (${targets.maxResponseTime}ms)`);
    }

    if (metrics.errorRate > targets.maxErrorRate) {
      violations.push(`Error rate (${metrics.errorRate}%) exceeds target (${targets.maxErrorRate}%)`);
    }

    if (metrics.currentThroughput < targets.minThroughput) {
      violations.push(`Throughput (${metrics.currentThroughput} req/s) below target (${targets.minThroughput} req/s)`);
    }

    // Add resource-based violations
    const latestSnapshot = resourceMonitor.getLatestSnapshot();
    if (latestSnapshot) {
      if (latestSnapshot.system.cpu_usage > targets.maxCpuUsage) {
        violations.push(`CPU usage (${latestSnapshot.system.cpu_usage}%) exceeds target (${targets.maxCpuUsage}%)`);
      }

      if (latestSnapshot.system.memory_usage > targets.maxMemoryUsage) {
        violations.push(`Memory usage (${latestSnapshot.system.memory_usage}%) exceeds target (${targets.maxMemoryUsage}%)`);
      }
    }

    if (violations.length > 0) {
      this.currentExecution.violations.push(...violations);
      
      if (this.currentExecution.config.abortOnFailure) {
        this.abortTest('Target metrics exceeded');
      }
    }
  }

  /**
   * Check for breaking point
   */
  private async checkBreakingPoint(): Promise<boolean> {
    if (!this.currentExecution) return false;

    const metrics = this.currentExecution.metrics;
    const userCount = this.currentExecution.virtualUsers.size;

    // Define breaking point criteria
    const breakingPointReasons = [];

    if (metrics.errorRate > 25) { // 25% error rate
      breakingPointReasons.push('High error rate (>25%)');
    }

    if (metrics.avgResponseTime > 5000) { // 5 second average response time
      breakingPointReasons.push('Extremely high response time (>5s)');
    }

    const latestSnapshot = resourceMonitor.getLatestSnapshot();
    if (latestSnapshot) {
      if (latestSnapshot.system.cpu_usage > 95) {
        breakingPointReasons.push('CPU usage critical (>95%)');
      }

      if (latestSnapshot.system.memory_usage > 95) {
        breakingPointReasons.push('Memory usage critical (>95%)');
      }

      if (latestSnapshot.database.connection_pool_utilization > 90) {
        breakingPointReasons.push('Database connections exhausted (>90%)');
      }
    }

    if (breakingPointReasons.length > 0) {
      this.currentExecution.breakingPoint = {
        userCount,
        timestamp: new Date().toISOString(),
        reason: breakingPointReasons.join(', ')
      };

      structuredLogger.warn(
        LogCategory.PERFORMANCE,
        'breaking_point_detected',
        {
          test_id: this.currentExecution.testId,
          user_count: userCount,
          reasons: breakingPointReasons
        }
      );

      return true;
    }

    return false;
  }

  /**
   * Wait for test completion
   */
  private async waitForCompletion(): Promise<void> {
    if (!this.currentExecution) return;

    const endTime = this.currentExecution.startTime + this.currentExecution.config.testDuration;
    
    while (Date.now() < endTime && this.isRunning && this.currentExecution.status === 'running') {
      await this.sleep(1000);
    }

    // Stop all virtual users
    for (const user of this.currentExecution.virtualUsers.values()) {
      user.isActive = false;
    }
  }

  /**
   * Abort test execution
   */
  private abortTest(reason: string): void {
    if (!this.currentExecution) return;

    this.currentExecution.status = 'aborted';
    this.isRunning = false;

    // Stop all virtual users
    for (const user of this.currentExecution.virtualUsers.values()) {
      user.isActive = false;
    }

    structuredLogger.warn(
      LogCategory.PERFORMANCE,
      'load_test_aborted',
      {
        test_id: this.currentExecution.testId,
        reason,
        duration: Date.now() - this.currentExecution.startTime
      }
    );
  }

  /**
   * Stop current test
   */
  stopCurrentTest(): void {
    if (this.isRunning) {
      this.abortTest('Manual stop requested');
    }
  }

  /**
   * Generate test result
   */
  private generateTestResult(): ScenarioResult {
    if (!this.currentExecution) {
      throw new Error('No current execution to generate result from');
    }

    const execution = this.currentExecution;
    const duration = (execution.endTime || Date.now()) - execution.startTime;

    // Calculate P95 and P99 response times from virtual users
    const responseTimes: number[] = [];
    for (const user of execution.virtualUsers.values()) {
      if (user.requestCount > 0) {
        responseTimes.push(user.totalResponseTime / user.requestCount);
      }
    }
    responseTimes.sort((a, b) => a - b);

    const p95Index = Math.floor(responseTimes.length * 0.95);
    const p99Index = Math.floor(responseTimes.length * 0.99);

    // Calculate resource metrics averages
    const avgCpuUsage = execution.resourceSnapshots.length > 0 ?
      execution.resourceSnapshots.reduce((sum, s) => sum + s.system.cpu_usage, 0) / execution.resourceSnapshots.length : 0;

    const maxCpuUsage = execution.resourceSnapshots.length > 0 ?
      Math.max(...execution.resourceSnapshots.map(s => s.system.cpu_usage)) : 0;

    const avgMemoryUsage = execution.resourceSnapshots.length > 0 ?
      execution.resourceSnapshots.reduce((sum, s) => sum + s.system.memory_usage, 0) / execution.resourceSnapshots.length : 0;

    const maxMemoryUsage = execution.resourceSnapshots.length > 0 ?
      Math.max(...execution.resourceSnapshots.map(s => s.system.memory_usage)) : 0;

    const avgCacheHitRate = execution.resourceSnapshots.length > 0 ?
      execution.resourceSnapshots.reduce((sum, s) => sum + s.cache.hit_rate, 0) / execution.resourceSnapshots.length : 0;

    const avgDbConnUsage = execution.resourceSnapshots.length > 0 ?
      execution.resourceSnapshots.reduce((sum, s) => sum + s.database.connection_pool_utilization, 0) / execution.resourceSnapshots.length : 0;

    return {
      scenarioId: execution.config.id,
      startTime: new Date(execution.startTime).toISOString(),
      endTime: new Date(execution.endTime || Date.now()).toISOString(),
      duration,
      success: execution.status === 'completed' && execution.violations.length === 0,
      metrics: {
        totalRequests: execution.metrics.totalRequests,
        successfulRequests: execution.metrics.successfulRequests,
        failedRequests: execution.metrics.failedRequests,
        averageResponseTime: execution.metrics.avgResponseTime,
        p95ResponseTime: responseTimes.length > p95Index ? responseTimes[p95Index] : 0,
        p99ResponseTime: responseTimes.length > p99Index ? responseTimes[p99Index] : 0,
        throughput: execution.metrics.currentThroughput,
        errorRate: execution.metrics.errorRate
      },
      resourceMetrics: {
        avgCpuUsage,
        maxCpuUsage,
        avgMemoryUsage,
        maxMemoryUsage,
        avgCacheHitRate,
        dbConnectionUsage: avgDbConnUsage
      },
      violations: execution.violations,
      recommendations: this.generateRecommendations(execution)
    };
  }

  /**
   * Generate recommendations based on test results
   */
  private generateRecommendations(execution: LoadTestExecution): string[] {
    const recommendations: string[] = [];
    const metrics = execution.metrics;

    if (metrics.errorRate > 5) {
      recommendations.push('High error rate detected. Review application logs and error handling.');
    }

    if (metrics.avgResponseTime > 1000) {
      recommendations.push('Slow response times. Consider database optimization and caching improvements.');
    }

    if (execution.breakingPoint) {
      recommendations.push(`Breaking point reached at ${execution.breakingPoint.userCount} users. Consider horizontal scaling.`);
    }

    if (execution.resourceSnapshots.length > 0) {
      const maxCpuUsage = Math.max(...execution.resourceSnapshots.map(s => s.system.cpu_usage));
      if (maxCpuUsage > 80) {
        recommendations.push('High CPU usage detected. Consider CPU optimization or additional compute resources.');
      }

      const minCacheHitRate = Math.min(...execution.resourceSnapshots.map(s => s.cache.hit_rate));
      if (minCacheHitRate < 70) {
        recommendations.push('Low cache hit rate. Review caching strategy and TTL configurations.');
      }
    }

    if (recommendations.length === 0) {
      recommendations.push('System performed well under load. Monitor production metrics for similar patterns.');
    }

    return recommendations;
  }

  /**
   * Validate load test configuration
   */
  private validateConfig(config: LoadTestConfig): string[] {
    const errors: string[] = [];

    if (!config.id || config.id.trim() === '') {
      errors.push('Test ID is required');
    }

    if (!config.name || config.name.trim() === '') {
      errors.push('Test name is required');
    }

    if (config.maxConcurrentUsers <= 0) {
      errors.push('Max concurrent users must be greater than 0');
    }

    if (config.maxConcurrentUsers > 2000) {
      errors.push('Max concurrent users cannot exceed 2000 for safety');
    }

    if (config.testDuration <= 0) {
      errors.push('Test duration must be greater than 0');
    }

    if (!config.scenarioIds || config.scenarioIds.length === 0) {
      errors.push('At least one scenario ID is required');
    }

    // Validate that all scenario IDs exist
    config.scenarioIds.forEach(id => {
      if (!medicalScenarios.getScenario(id)) {
        errors.push(`Scenario '${id}' not found`);
      }
    });

    return errors;
  }

  /**
   * Get current execution status
   */
  getCurrentExecution(): LoadTestExecution | null {
    return this.currentExecution;
  }

  /**
   * Get execution history
   */
  getExecutionHistory(): LoadTestExecution[] {
    return [...this.executionHistory];
  }

  /**
   * Get execution by ID
   */
  getExecutionById(testId: string): LoadTestExecution | undefined {
    return this.executionHistory.find(exec => exec.testId === testId) || 
           (this.currentExecution?.testId === testId ? this.currentExecution : undefined);
  }

  /**
   * Create progressive load test plan
   */
  createProgressiveTestPlan(): LoadTestConfig[] {
    const baseConfig = {
      testDuration: 300000, // 5 minutes
      rampUpStrategy: 'linear' as const,
      abortOnFailure: false,
      targetMetrics: {
        maxResponseTime: 2000,
        maxErrorRate: 10,
        minThroughput: 10,
        maxCpuUsage: 90,
        maxMemoryUsage: 90
      }
    };

    return [
      {
        ...baseConfig,
        id: 'progressive_50',
        name: 'Progressive Test - 50 Users',
        description: 'Initial capacity validation with 50 concurrent users',
        scenarioIds: ['morning_rush', 'patient_records'],
        maxConcurrentUsers: 50
      },
      {
        ...baseConfig,
        id: 'progressive_100',
        name: 'Progressive Test - 100 Users',
        description: 'Medium load validation with 100 concurrent users',
        scenarioIds: ['patient_records', 'appointment_management'],
        maxConcurrentUsers: 100
      },
      {
        ...baseConfig,
        id: 'progressive_250',
        name: 'Progressive Test - 250 Users',
        description: 'High load validation with 250 concurrent users',
        scenarioIds: ['multi_clinic_stress', 'appointment_management'],
        maxConcurrentUsers: 250
      },
      {
        ...baseConfig,
        id: 'progressive_500',
        name: 'Progressive Test - 500 Users',
        description: 'Very high load validation with 500 concurrent users',
        scenarioIds: ['multi_clinic_stress', 'patient_records', 'report_generation'],
        maxConcurrentUsers: 500
      },
      {
        ...baseConfig,
        id: 'progressive_1000',
        name: 'Progressive Test - 1000 Users',
        description: 'Maximum capacity validation with 1000 concurrent users',
        scenarioIds: ['peak_load'],
        maxConcurrentUsers: 1000,
        testDuration: 600000, // 10 minutes for maximum load
        targetMetrics: {
          maxResponseTime: 3000,
          maxErrorRate: 15,
          minThroughput: 50,
          maxCpuUsage: 95,
          maxMemoryUsage: 95
        }
      }
    ];
  }

  /**
   * Utility sleep function
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Singleton instance
export const loadTestingService = new LoadTestingService();