
import { Request, Response } from 'express';
import { AiTemplatesService } from './ai-templates.service';
import { AiTemplatesRepository } from './ai-templates.repository';
import { createAiTemplateSchema, updateAiTemplateSchema } from './ai-templates.types';

export class AiTemplatesController {
  private service: AiTemplatesService;

  constructor(storage: any) {
    const repository = new AiTemplatesRepository(storage);
    this.service = new AiTemplatesService(repository);
  }

  getAiTemplates = async (req: Request, res: Response) => {
    try {
      const clinicId = parseInt(req.params.clinicId);
      if (isNaN(clinicId)) {
        return res.status(400).json({ error: "Invalid clinic ID" });
      }
      
      const { template_type } = req.query;
      const templates = await this.service.getAiTemplates(clinicId, template_type as string);
      res.json(templates);
    } catch (error: any) {
      console.error("Error fetching AI templates:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  };

  getAiTemplate = async (req: Request, res: Response) => {
    try {
      const templateId = parseInt(req.params.id);
      if (isNaN(templateId)) {
        return res.status(400).json({ error: "Invalid template ID" });
      }
      
      const template = await this.service.getAiTemplate(templateId);
      res.json(template);
    } catch (error: any) {
      console.error("Error fetching AI template:", error);
      if (error.message === 'Template not found') {
        return res.status(404).json({ error: error.message });
      }
      res.status(500).json({ error: "Internal server error" });
    }
  };

  createAiTemplate = async (req: Request, res: Response) => {
    try {
      const clinicId = parseInt(req.params.clinicId);
      if (isNaN(clinicId)) {
        return res.status(400).json({ error: "Invalid clinic ID" });
      }
      
      const validatedData = createAiTemplateSchema.parse({
        ...req.body,
        clinic_id: clinicId
      });
      
      const template = await this.service.createAiTemplate(validatedData);
      res.status(201).json(template);
    } catch (error: any) {
      if (error.name === 'ZodError') {
        return res.status(400).json({ error: "Invalid data", details: error.errors });
      }
      console.error("Error creating AI template:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  };

  updateAiTemplate = async (req: Request, res: Response) => {
    try {
      const templateId = parseInt(req.params.id);
      if (isNaN(templateId)) {
        return res.status(400).json({ error: "Invalid template ID" });
      }
      
      const validatedData = updateAiTemplateSchema.parse(req.body);
      const template = await this.service.updateAiTemplate(templateId, validatedData);
      res.json(template);
    } catch (error: any) {
      if (error.name === 'ZodError') {
        return res.status(400).json({ error: "Invalid data", details: error.errors });
      }
      console.error("Error updating AI template:", error);
      if (error.message === 'Template not found') {
        return res.status(404).json({ error: error.message });
      }
      res.status(500).json({ error: "Internal server error" });
    }
  };
}
