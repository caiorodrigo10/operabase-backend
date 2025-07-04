
import type { Storage } from '../../storage';
import type { CreateAppointmentTagRequest, UpdateAppointmentTagRequest } from './appointment-tags.types';

export class AppointmentTagsRepository {
  constructor(private storage: Storage) {}

  async getAppointmentTags(clinicId: number) {
    return this.storage.getAppointmentTags(clinicId);
  }

  async createAppointmentTag(data: CreateAppointmentTagRequest) {
    return this.storage.createAppointmentTag(data);
  }

  async updateAppointmentTag(tagId: number, data: UpdateAppointmentTagRequest) {
    return this.storage.updateAppointmentTag(tagId, data);
  }

  async deleteAppointmentTag(tagId: number) {
    return this.storage.deleteAppointmentTag(tagId);
  }
}
