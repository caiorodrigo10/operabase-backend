
import { Router } from 'express';
import { MedicalRecordsController } from './medical-records.controller';
import { medicalRecordLogsMiddleware } from '../../middleware/system-logs.middleware';
import type { Storage } from '../../storage';

export function createMedicalRecordsRoutes(storage: Storage): Router {
  const router = Router();
  const controller = new MedicalRecordsController(storage);

  // Get medical records for a contact
  router.get('/medical-records', controller.getMedicalRecords.bind(controller));

  // Get medical record by ID
  router.get('/medical-records/:id', controller.getMedicalRecordById.bind(controller));

  // Create medical record (with logging)
  router.post('/medical-records', ...medicalRecordLogsMiddleware, controller.createMedicalRecord.bind(controller));

  // Update medical record (with logging)
  router.put('/medical-records/:id', ...medicalRecordLogsMiddleware, controller.updateMedicalRecord.bind(controller));

  // Delete medical record (with logging)
  router.delete('/medical-records/:id', ...medicalRecordLogsMiddleware, controller.deleteMedicalRecord.bind(controller));

  return router;
}
