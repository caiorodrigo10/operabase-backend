
import { MedicalRecordsRepository } from './medical-records.repository';
import type { CreateMedicalRecordRequest, UpdateMedicalRecordRequest } from './medical-records.types';

export class MedicalRecordsService {
  constructor(private repository: MedicalRecordsRepository) {}

  async getMedicalRecords(contactId: number, clinicId: number) {
    return this.repository.getMedicalRecords(contactId, clinicId);
  }

  async getMedicalRecordById(recordId: number) {
    const record = await this.repository.getMedicalRecordById(recordId);
    if (!record) {
      throw new Error('Medical record not found');
    }
    return record;
  }

  async createMedicalRecord(data: CreateMedicalRecordRequest) {
    return this.repository.createMedicalRecord(data);
  }

  async updateMedicalRecord(recordId: number, data: UpdateMedicalRecordRequest) {
    const existing = await this.repository.getMedicalRecordById(recordId);
    if (!existing) {
      throw new Error('Medical record not found');
    }
    return this.repository.updateMedicalRecord(recordId, data);
  }

  async deleteMedicalRecord(recordId: number) {
    const existing = await this.repository.getMedicalRecordById(recordId);
    if (!existing) {
      throw new Error('Medical record not found');
    }
    return this.repository.deleteMedicalRecord(recordId);
  }
}
