
import { AiTemplatesRepository } from './ai-templates.repository';
import type { CreateAiTemplateRequest, UpdateAiTemplateRequest } from './ai-templates.types';

export class AiTemplatesService {
  constructor(private repository: AiTemplatesRepository) {}

  async getAiTemplates(clinicId: number, templateType?: string) {
    return this.repository.getAiTemplates(clinicId, templateType);
  }

  async getAiTemplate(templateId: number) {
    const template = await this.repository.getAiTemplate(templateId);
    if (!template) {
      throw new Error('Template not found');
    }
    return template;
  }

  async createAiTemplate(data: CreateAiTemplateRequest) {
    return this.repository.createAiTemplate(data);
  }

  async updateAiTemplate(templateId: number, data: UpdateAiTemplateRequest) {
    const template = await this.repository.updateAiTemplate(templateId, data);
    if (!template) {
      throw new Error('Template not found');
    }
    return template;
  }

  async deleteAiTemplate(templateId: number) {
    return this.repository.deleteAiTemplate(templateId);
  }
}
