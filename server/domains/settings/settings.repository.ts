
import type { Storage } from '../../storage';
import type { CreateClinicSettingRequest, UpdateClinicSettingRequest } from './settings.types';

export class SettingsRepository {
  constructor(private storage: Storage) {}

  async getClinicSettings(clinicId: number) {
    return this.storage.getClinicSettings(clinicId);
  }

  async getClinicSetting(clinicId: number, key: string) {
    return this.storage.getClinicSetting(clinicId, key);
  }

  async setClinicSetting(data: CreateClinicSettingRequest) {
    return this.storage.setClinicSetting(data);
  }

  async updateClinicSetting(clinicId: number, key: string, data: UpdateClinicSettingRequest) {
    return this.storage.updateClinicSetting(clinicId, key, data);
  }

  async deleteClinicSetting(clinicId: number, key: string) {
    return this.storage.deleteClinicSetting(clinicId, key);
  }
}
