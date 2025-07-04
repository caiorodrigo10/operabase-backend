
import type { Storage } from '../../storage';
import type { CreateMedicalRecordRequest, UpdateMedicalRecordRequest } from './medical-records.types';

export class MedicalRecordsRepository {
  constructor(private storage: Storage) {}

  async getMedicalRecords(contactId: number, clinicId: number) {
    return this.storage.getMedicalRecords(contactId, clinicId);
  }

  async getMedicalRecordById(recordId: number) {
    return this.storage.getMedicalRecord(recordId);
  }

  async createMedicalRecord(data: CreateMedicalRecordRequest) {
    return this.storage.createMedicalRecord(data);
  }

  async updateMedicalRecord(recordId: number, data: UpdateMedicalRecordRequest) {
    return this.storage.updateMedicalRecord(recordId, data);
  }

  async deleteMedicalRecord(recordId: number) {
    return this.storage.deleteMedicalRecord(recordId);
  }
}
