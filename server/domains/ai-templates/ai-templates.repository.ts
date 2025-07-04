
import type { Storage } from '../../storage';
import type { CreateAiTemplateRequest, UpdateAiTemplateRequest } from './ai-templates.types';

export class AiTemplatesRepository {
  constructor(private storage: Storage) {}

  async getAiTemplates(clinicId: number, templateType?: string) {
    return this.storage.getAiTemplates(clinicId, templateType);
  }

  async getAiTemplate(templateId: number) {
    return this.storage.getAiTemplate(templateId);
  }

  async createAiTemplate(data: CreateAiTemplateRequest) {
    return this.storage.createAiTemplate(data);
  }

  async updateAiTemplate(templateId: number, data: UpdateAiTemplateRequest) {
    return this.storage.updateAiTemplate(templateId, data);
  }

  async deleteAiTemplate(templateId: number) {
    return this.storage.deleteAiTemplate(templateId);
  }
}
