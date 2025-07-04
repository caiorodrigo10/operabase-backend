
import { Request, Response } from 'express';
import { AppointmentTagsService } from './appointment-tags.service';
import { AppointmentTagsRepository } from './appointment-tags.repository';
import { createAppointmentTagSchema, updateAppointmentTagSchema } from './appointment-tags.types';

export class AppointmentTagsController {
  private service: AppointmentTagsService;

  constructor(storage: any) {
    const repository = new AppointmentTagsRepository(storage);
    this.service = new AppointmentTagsService(repository);
  }

  getAppointmentTags = async (req: Request, res: Response) => {
    try {
      const clinicId = parseInt(req.params.clinicId);
      if (isNaN(clinicId)) {
        return res.status(400).json({ error: "Invalid clinic ID" });
      }
      
      const tags = await this.service.getAppointmentTags(clinicId);
      res.json(tags);
    } catch (error: any) {
      console.error("Error fetching appointment tags:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  };

  createAppointmentTag = async (req: Request, res: Response) => {
    try {
      const clinicId = parseInt(req.params.clinicId);
      if (isNaN(clinicId)) {
        return res.status(400).json({ error: "Invalid clinic ID" });
      }

      // Preprocess data to handle null/undefined values
      const preprocessedData = {
        ...req.body,
        clinic_id: clinicId,
        color: req.body.color === "" ? null : req.body.color,
        description: req.body.description === "" ? undefined : req.body.description
      };

      const validatedData = createAppointmentTagSchema.parse(preprocessedData);

      const tag = await this.service.createAppointmentTag(validatedData);
      res.status(201).json(tag);
    } catch (error: any) {
      if (error.name === 'ZodError') {
        return res.status(400).json({ error: "Validation failed", details: error.errors });
      }
      console.error("Error creating appointment tag:", error);
      res.status(500).json({ error: error.message || "Internal server error" });
    }
  };

  updateAppointmentTag = async (req: Request, res: Response) => {
    try {
      const tagId = parseInt(req.params.id);
      if (isNaN(tagId)) {
        return res.status(400).json({ error: "Invalid tag ID" });
      }

      // Preprocess data to handle null/undefined values
      const preprocessedData = {
        ...req.body,
        color: req.body.color === "" ? null : req.body.color,
        description: req.body.description === "" ? undefined : req.body.description
      };

      const validatedData = updateAppointmentTagSchema.parse(preprocessedData);
      const tag = await this.service.updateAppointmentTag(tagId, validatedData);
      res.json(tag);
    } catch (error: any) {
      if (error.name === 'ZodError') {
        return res.status(400).json({ error: "Validation failed", details: error.errors });
      }
      console.error("Error updating appointment tag:", error);
      if (error.message === 'Tag not found') {
        return res.status(404).json({ error: error.message });
      }
      res.status(500).json({ error: "Internal server error" });
    }
  };

  deleteAppointmentTag = async (req: Request, res: Response) => {
    try {
      const tagId = parseInt(req.params.id);
      if (isNaN(tagId)) {
        return res.status(400).json({ error: "Invalid tag ID" });
      }

      await this.service.deleteAppointmentTag(tagId);
      res.json({ success: true });
    } catch (error: any) {
      console.error("Error deleting appointment tag:", error);
      if (error.message === 'Tag not found') {
        return res.status(404).json({ error: error.message });
      }
      res.status(500).json({ error: "Internal server error" });
    }
  };
}
