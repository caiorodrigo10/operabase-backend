
import { Request, Response } from 'express';
import { CalendarService } from './calendar.service';
import { CalendarRepository } from './calendar.repository';
import { calendarSyncSchema, calendarAvailabilitySchema } from './calendar.types';

export class CalendarController {
  private service: CalendarService;

  constructor(storage: any) {
    const repository = new CalendarRepository(storage);
    this.service = new CalendarService(repository);
  }

  async getCalendarConfig(req: Request, res: Response) {
    try {
      const { clinic_id, user_id } = req.query;
      
      if (!clinic_id || !user_id) {
        return res.status(400).json({ error: "clinic_id and user_id are required" });
      }
      
      const config = await this.service.getCalendarConfig(
        parseInt(clinic_id as string),
        user_id as string
      );
      
      res.json(config);
    } catch (error: any) {
      console.error("Error fetching calendar config:", error);
      res.status(500).json({ error: error.message || "Internal server error" });
    }
  }

  async updateCalendarSync(req: Request, res: Response) {
    try {
      const validatedData = calendarSyncSchema.parse(req.body);
      const result = await this.service.updateCalendarSync(validatedData);
      
      res.json(result);
    } catch (error: any) {
      if (error.name === 'ZodError') {
        return res.status(400).json({ error: "Invalid data", details: error.errors });
      }
      
      console.error("Error updating calendar sync:", error);
      res.status(500).json({ error: error.message || "Internal server error" });
    }
  }

  async getAvailableSlots(req: Request, res: Response) {
    try {
      const { date, clinic_id, user_id } = req.query;
      
      const validatedData = calendarAvailabilitySchema.parse({
        date: date as string,
        clinic_id: parseInt(clinic_id as string),
        user_id: user_id as string || undefined
      });
      
      const slots = await this.service.getAvailableSlots(validatedData);
      res.json(slots);
    } catch (error: any) {
      if (error.name === 'ZodError') {
        return res.status(400).json({ error: "Invalid data", details: error.errors });
      }
      
      console.error("Error fetching available slots:", error);
      res.status(500).json({ error: error.message || "Internal server error" });
    }
  }

  async getCalendarEvents(req: Request, res: Response) {
    try {
      const { clinic_id, start_date, end_date } = req.query;
      
      if (!clinic_id || !start_date || !end_date) {
        return res.status(400).json({ error: "clinic_id, start_date and end_date are required" });
      }
      
      const events = await this.service.getCalendarEvents(
        parseInt(clinic_id as string),
        start_date as string,
        end_date as string
      );
      
      res.json(events);
    } catch (error: any) {
      console.error("Error fetching calendar events:", error);
      res.status(500).json({ error: error.message || "Internal server error" });
    }
  }
}
