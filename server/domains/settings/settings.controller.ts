
import { Request, Response } from 'express';
import { SettingsService } from './settings.service';
import { SettingsRepository } from './settings.repository';
import { createClinicSettingSchema, updateClinicSettingSchema } from './settings.types';

export class SettingsController {
  private service: SettingsService;

  constructor(storage: any) {
    const repository = new SettingsRepository(storage);
    this.service = new SettingsService(repository);
  }

  getClinicSettings = async (req: Request, res: Response) => {
    try {
      const clinicId = parseInt(req.params.clinicId);
      if (isNaN(clinicId)) {
        return res.status(400).json({ error: "Invalid clinic ID" });
      }
      
      const settings = await this.service.getClinicSettings(clinicId);
      res.json(settings);
    } catch (error: any) {
      console.error("Error fetching clinic settings:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  };

  getClinicSetting = async (req: Request, res: Response) => {
    try {
      const clinicId = parseInt(req.params.clinicId);
      const { key } = req.params;
      
      if (isNaN(clinicId)) {
        return res.status(400).json({ error: "Invalid clinic ID" });
      }
      
      const setting = await this.service.getClinicSetting(clinicId, key);
      res.json(setting);
    } catch (error: any) {
      console.error("Error fetching clinic setting:", error);
      if (error.message === 'Setting not found') {
        return res.status(404).json({ error: error.message });
      }
      res.status(500).json({ error: "Internal server error" });
    }
  };

  setClinicSetting = async (req: Request, res: Response) => {
    try {
      const clinicId = parseInt(req.params.clinicId);
      if (isNaN(clinicId)) {
        return res.status(400).json({ error: "Invalid clinic ID" });
      }
      
      const validatedData = createClinicSettingSchema.parse({
        ...req.body,
        clinic_id: clinicId
      });
      
      const setting = await this.service.setClinicSetting(validatedData);
      res.status(201).json(setting);
    } catch (error: any) {
      if (error.name === 'ZodError') {
        return res.status(400).json({ error: "Invalid data", details: error.errors });
      }
      console.error("Error setting clinic setting:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  };
}
