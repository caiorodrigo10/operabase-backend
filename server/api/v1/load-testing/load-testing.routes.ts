import { Router, Request, Response } from 'express';
import { structuredLogger, LogCategory } from '../../../shared/structured-logger.service.js';
import { loadTestingService } from '../../../testing/load-testing.service.js';
import { medicalScenarios } from '../../../testing/medical-scenarios.js';
import { tenantIsolationValidator } from '../../../testing/tenant-isolation-validator.js';
import { loadTestReporter } from '../../../testing/load-test-reporter.js';
import { resourceMonitor } from '../../../testing/resource-monitor.service.js';
import { isAuthenticated } from '../../../auth.js';

/**
 * Load testing API routes for Phase 4 validation
 */
export function createLoadTestingRoutes(): Router {
  const router = Router();

  // Apply authentication to all load testing routes
  router.use(isAuthenticated);

  /**
   * GET /api/v1/load-testing/scenarios
   * Get all available medical scenarios
   */
  router.get('/scenarios', async (req: Request, res: Response) => {
    try {
      const scenarios = medicalScenarios.getAllScenarios();
      
      structuredLogger.info(
        LogCategory.API,
        'load_testing_scenarios_requested',
        { scenario_count: scenarios.length }
      );

      res.json({
        scenarios: scenarios.map(scenario => ({
          id: scenario.id,
          name: scenario.name,
          description: scenario.description,
          userCount: scenario.userCount,
          duration: scenario.duration,
          operations: scenario.operations.length,
          expectedMetrics: scenario.expectedMetrics
        })),
        total: scenarios.length,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      structuredLogger.error(
        LogCategory.API,
        'load_testing_scenarios_error',
        { error: (error as Error).message }
      );

      res.status(500).json({
        error: 'Failed to retrieve scenarios',
        message: (error as Error).message,
        timestamp: new Date().toISOString()
      });
    }
  });

  /**
   * POST /api/v1/load-testing/start
   * Start a load test execution
   */
  router.post('/start', async (req: Request, res: Response) => {
    try {
      const {
        name,
        description,
        scenarioIds,
        maxConcurrentUsers,
        testDuration,
        rampUpStrategy = 'linear',
        abortOnFailure = false,
        targetMetrics
      } = req.body;

      // Validate required fields
      if (!name || !scenarioIds || !maxConcurrentUsers || !testDuration) {
        return res.status(400).json({
          error: 'Missing required fields',
          required: ['name', 'scenarioIds', 'maxConcurrentUsers', 'testDuration']
        });
      }

      const config = {
        id: `test_${Date.now()}`,
        name,
        description: description || `Load test with ${maxConcurrentUsers} users`,
        scenarioIds,
        maxConcurrentUsers,
        testDuration,
        rampUpStrategy,
        abortOnFailure,
        targetMetrics: targetMetrics || {
          maxResponseTime: 2000,
          maxErrorRate: 10,
          minThroughput: 10,
          maxCpuUsage: 90,
          maxMemoryUsage: 90
        }
      };

      const testId = await loadTestingService.startLoadTest(config);

      structuredLogger.info(
        LogCategory.PERFORMANCE,
        'load_test_started_via_api',
        {
          test_id: testId,
          max_users: maxConcurrentUsers,
          scenarios: scenarioIds,
          duration: testDuration
        }
      );

      res.json({
        success: true,
        test_id: testId,
        message: 'Load test started successfully',
        config,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      structuredLogger.error(
        LogCategory.API,
        'load_test_start_error',
        { error: (error as Error).message }
      );

      res.status(500).json({
        error: 'Failed to start load test',
        message: (error as Error).message,
        timestamp: new Date().toISOString()
      });
    }
  });

  /**
   * GET /api/v1/load-testing/status
   * Get current load test status
   */
  router.get('/status', async (req: Request, res: Response) => {
    try {
      const currentExecution = loadTestingService.getCurrentExecution();
      const resourceSummary = resourceMonitor.getMonitoringSummary();

      if (!currentExecution) {
        return res.json({
          status: 'idle',
          message: 'No load test currently running',
          resource_monitoring: resourceSummary.monitoring_active,
          timestamp: new Date().toISOString()
        });
      }

      res.json({
        status: currentExecution.status,
        test_id: currentExecution.testId,
        config: {
          name: currentExecution.config.name,
          max_users: currentExecution.config.maxConcurrentUsers,
          duration: currentExecution.config.testDuration
        },
        progress: {
          active_users: currentExecution.virtualUsers.size,
          elapsed_time: Date.now() - currentExecution.startTime,
          estimated_remaining: currentExecution.config.testDuration - (Date.now() - currentExecution.startTime)
        },
        metrics: currentExecution.metrics,
        violations: currentExecution.violations.length,
        breaking_point: currentExecution.breakingPoint,
        resource_monitoring: resourceSummary,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      structuredLogger.error(
        LogCategory.API,
        'load_test_status_error',
        { error: (error as Error).message }
      );

      res.status(500).json({
        error: 'Failed to retrieve load test status',
        message: (error as Error).message
      });
    }
  });

  /**
   * POST /api/v1/load-testing/stop
   * Stop current load test
   */
  router.post('/stop', async (req: Request, res: Response) => {
    try {
      const currentExecution = loadTestingService.getCurrentExecution();
      
      if (!currentExecution) {
        return res.status(400).json({
          error: 'No load test currently running',
          timestamp: new Date().toISOString()
        });
      }

      loadTestingService.stopCurrentTest();

      structuredLogger.info(
        LogCategory.PERFORMANCE,
        'load_test_stopped_via_api',
        { test_id: currentExecution.testId }
      );

      res.json({
        success: true,
        message: 'Load test stopped successfully',
        test_id: currentExecution.testId,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      structuredLogger.error(
        LogCategory.API,
        'load_test_stop_error',
        { error: (error as Error).message }
      );

      res.status(500).json({
        error: 'Failed to stop load test',
        message: (error as Error).message
      });
    }
  });

  /**
   * POST /api/v1/load-testing/reports/generate
   * Generate comprehensive load test report
   */
  router.post('/reports/generate', async (req: Request, res: Response) => {
    try {
      const {
        includeRawData = false,
        includeResourceMetrics = true,
        includeRecommendations = true,
        format = 'json'
      } = req.body;

      const config = {
        includeRawData,
        includeResourceMetrics,
        includeRecommendations,
        includeGraphData: false,
        format
      };

      const report = await loadTestReporter.generateComprehensiveReport(config);

      structuredLogger.info(
        LogCategory.PERFORMANCE,
        'load_test_report_generated_via_api',
        {
          report_id: report.id,
          overall_rating: report.executive_summary.overall_rating,
          readiness_status: report.executive_summary.readiness_status
        }
      );

      res.json({
        success: true,
        report_id: report.id,
        report,
        executive_summary: report.executive_summary,
        recommendations: report.recommendations,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      structuredLogger.error(
        LogCategory.API,
        'report_generation_error',
        { error: (error as Error).message }
      );

      res.status(500).json({
        error: 'Failed to generate report',
        message: (error as Error).message
      });
    }
  });

  return router;
}