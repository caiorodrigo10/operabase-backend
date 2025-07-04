
import { SettingsRepository } from './settings.repository';
import type { CreateClinicSettingRequest, UpdateClinicSettingRequest } from './settings.types';

export class SettingsService {
  constructor(private repository: SettingsRepository) {}

  async getClinicSettings(clinicId: number) {
    return this.repository.getClinicSettings(clinicId);
  }

  async getClinicSetting(clinicId: number, key: string) {
    const setting = await this.repository.getClinicSetting(clinicId, key);
    if (!setting) {
      throw new Error('Setting not found');
    }
    return setting;
  }

  async setClinicSetting(data: CreateClinicSettingRequest) {
    return this.repository.setClinicSetting(data);
  }

  async updateClinicSetting(clinicId: number, key: string, data: UpdateClinicSettingRequest) {
    return this.repository.updateClinicSetting(clinicId, key, data);
  }

  async deleteClinicSetting(clinicId: number, key: string) {
    return this.repository.deleteClinicSetting(clinicId, key);
  }
}
