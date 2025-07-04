
import { AppointmentTagsRepository } from './appointment-tags.repository';
import type { CreateAppointmentTagRequest, UpdateAppointmentTagRequest } from './appointment-tags.types';

export class AppointmentTagsService {
  constructor(private repository: AppointmentTagsRepository) {}

  async getAppointmentTags(clinicId: number) {
    return this.repository.getAppointmentTags(clinicId);
  }

  async createAppointmentTag(data: CreateAppointmentTagRequest) {
    // Check for duplicate tag name
    const existingTags = await this.repository.getAppointmentTags(data.clinic_id);
    const isDuplicate = existingTags.some(tag => 
      tag.name.toLowerCase() === data.name.toLowerCase()
    );

    if (isDuplicate) {
      throw new Error('Já existe uma etiqueta com este nome');
    }

    return this.repository.createAppointmentTag(data);
  }

  async updateAppointmentTag(tagId: number, data: UpdateAppointmentTagRequest) {
    const tag = await this.repository.updateAppointmentTag(tagId, data);
    if (!tag) {
      throw new Error('Tag not found');
    }
    return tag;
  }

  async deleteAppointmentTag(tagId: number) {
    const success = await this.repository.deleteAppointmentTag(tagId);
    if (!success) {
      throw new Error('Tag not found');
    }
    return success;
  }
}
