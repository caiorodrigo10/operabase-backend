
import { Request, Response } from 'express';
import { MedicalRecordsService } from './medical-records.service';
import { MedicalRecordsRepository } from './medical-records.repository';
import { medicalRecordSchema, updateMedicalRecordSchema, medicalRecordQuerySchema } from './medical-records.types';

export class MedicalRecordsController {
  private service: MedicalRecordsService;

  constructor(storage: any) {
    const repository = new MedicalRecordsRepository(storage);
    this.service = new MedicalRecordsService(repository);
  }

  async getMedicalRecords(req: Request, res: Response) {
    try {
      const { contact_id, clinic_id } = medicalRecordQuerySchema.parse(req.query);
      const records = await this.service.getMedicalRecords(contact_id, clinic_id);
      res.json(records);
    } catch (error: any) {
      if (error.name === 'ZodError') {
        return res.status(400).json({ error: "Invalid query parameters", details: error.errors });
      }
      
      console.error("Error fetching medical records:", error);
      res.status(500).json({ error: error.message || "Internal server error" });
    }
  }

  async getMedicalRecordById(req: Request, res: Response) {
    try {
      const recordId = parseInt(req.params.id);
      if (isNaN(recordId)) {
        return res.status(400).json({ error: "Invalid record ID" });
      }
      
      const record = await this.service.getMedicalRecordById(recordId);
      res.json(record);
    } catch (error: any) {
      console.error("Error fetching medical record:", error);
      if (error.message === 'Medical record not found') {
        return res.status(404).json({ error: error.message });
      }
      res.status(500).json({ error: error.message || "Internal server error" });
    }
  }

  async createMedicalRecord(req: Request, res: Response) {
    try {
      const validatedData = medicalRecordSchema.parse(req.body);
      const record = await this.service.createMedicalRecord(validatedData);
      res.status(201).json(record);
    } catch (error: any) {
      if (error.name === 'ZodError') {
        return res.status(400).json({ error: "Invalid data", details: error.errors });
      }
      
      console.error("Error creating medical record:", error);
      res.status(500).json({ error: error.message || "Internal server error" });
    }
  }

  async updateMedicalRecord(req: Request, res: Response) {
    try {
      const recordId = parseInt(req.params.id);
      if (isNaN(recordId)) {
        return res.status(400).json({ error: "Invalid record ID" });
      }
      
      const validatedData = updateMedicalRecordSchema.parse(req.body);
      const record = await this.service.updateMedicalRecord(recordId, validatedData);
      
      res.json(record);
    } catch (error: any) {
      if (error.name === 'ZodError') {
        return res.status(400).json({ error: "Invalid data", details: error.errors });
      }
      
      console.error("Error updating medical record:", error);
      if (error.message === 'Medical record not found') {
        return res.status(404).json({ error: error.message });
      }
      res.status(500).json({ error: error.message || "Internal server error" });
    }
  }

  async deleteMedicalRecord(req: Request, res: Response) {
    try {
      const recordId = parseInt(req.params.id);
      if (isNaN(recordId)) {
        return res.status(400).json({ error: "Invalid record ID" });
      }
      
      await this.service.deleteMedicalRecord(recordId);
      res.status(204).send();
    } catch (error: any) {
      console.error("Error deleting medical record:", error);
      if (error.message === 'Medical record not found') {
        return res.status(404).json({ error: error.message });
      }
      res.status(500).json({ error: error.message || "Internal server error" });
    }
  }
}
