import { Request, Response } from 'express';
import { ContactsService } from './contacts.service';
import { ContactsRepository } from './contacts.repository';
import { ContactsRepositoryNew } from './contacts.repository.new';
import { createContactSchema, updateContactSchema, updateContactStatusSchema } from '../../shared/schemas/index';
import { CacheMiddleware } from '../../cache-middleware.js';
import { ProxyMigrationFactory } from '../../shared/migration/proxy-factory';
import { createSuccessResponse, createErrorResponse } from '../../shared/utils/response.utils';

export class ContactsController {
  private service: ContactsService;

  constructor(storage: any) {
    const repository = new ContactsRepository(storage);
    this.service = new ContactsService(repository);
  }

  async getContacts(req: Request, res: Response) {
    try {
      const { clinic_id, status, search } = req.query;

      if (!clinic_id) {
        return res.status(400).json({ error: "clinic_id is required" });
      }

      const clinicId = parseInt(clinic_id as string);
      if (isNaN(clinicId)) {
        return res.status(400).json({ error: "Invalid clinic ID" });
      }

      const filters: any = {};
      if (status) filters.status = status as string;
      if (search) filters.search = search as string;

      // Phase 2: Intelligent cache integration for 2-5ms response times
      const filterKey = `${status || 'all'}:${search || 'none'}`;
      const contacts = await CacheMiddleware.cacheAside(
        'contacts',
        `list:${filterKey}`,
        clinicId,
        () => this.service.getContacts(clinicId, filters)
      );

      res.json(contacts);
    } catch (error: any) {
      console.error("Error fetching contacts:", error);
      res.status(500).json({ error: error.message || "Internal server error" });
    }
  }

  async getContactById(req: Request, res: Response) {
    try {
      const contactId = parseInt(req.params.id);
      if (isNaN(contactId)) {
        return res.status(400).json({ error: "Invalid contact ID" });
      }

      const contact = await this.service.getContactById(contactId);
      res.json(contact);
    } catch (error: any) {
      console.error("Error fetching contact:", error);
      if (error.message === 'Contact not found') {
        return res.status(404).json({ error: error.message });
      }
      res.status(500).json({ error: error.message || "Internal server error" });
    }
  }

  async createContact(req: Request, res: Response) {
    try {
      console.log('🚀 POST /api/contacts - Starting contact creation');
      console.log('📥 Raw request body:', req.body);

      // Preprocess data to convert null values to undefined for optional fields
      const preprocessedData = {
        ...req.body,
        profession: req.body.profession === null ? undefined : req.body.profession,
        address: req.body.address === null ? undefined : req.body.address,
        notes: req.body.notes === null ? undefined : req.body.notes,
        emergency_contact: req.body.emergency_contact === null ? undefined : req.body.emergency_contact,
        gender: req.body.gender === null ? undefined : req.body.gender,
        email: req.body.email === null || req.body.email === "" ? undefined : req.body.email,
      };

      const validatedData = createContactSchema.parse(preprocessedData);
      console.log('✅ Data validation successful:', validatedData);

      const contact = await this.service.createContact(validatedData);
      console.log('✅ Contact created successfully:', contact);

      res.status(201).json(contact);
    } catch (error: any) {
      console.error('❌ Error in POST /api/contacts:', error);

      if (error.name === 'ZodError') {
        console.error('📋 Zod validation errors:', error.errors);
        return res.status(400).json({ error: "Invalid data", details: error.errors });
      }

      console.error("💥 Database/Server error creating contact:", error);
      res.status(500).json({ error: error.message || "Internal server error" });
    }
  }

  async updateContact(req: Request, res: Response) {
    try {
      const contactId = parseInt(req.params.id);
      if (isNaN(contactId)) {
        return res.status(400).json({ error: "Invalid contact ID" });
      }

      const validatedData = updateContactSchema.parse(req.body);
      const contact = await this.service.updateContact(contactId, validatedData);

      res.json(contact);
    } catch (error: any) {
      if (error.name === 'ZodError') {
        return res.status(400).json({ error: "Invalid data", details: error.errors });
      }

      console.error("Error updating contact:", error);
      if (error.message === 'Contact not found') {
        return res.status(404).json({ error: error.message });
      }
      res.status(500).json({ error: error.message || "Internal server error" });
    }
  }

  async updateContactStatus(req: Request, res: Response) {
    try {
      const contactId = parseInt(req.params.id);
      if (isNaN(contactId)) {
        return res.status(400).json({ error: "Invalid contact ID" });
      }

      const validatedData = updateContactStatusSchema.parse(req.body);
      const updatedContact = await this.service.updateContactStatus(contactId, validatedData.status);

      res.json(updatedContact);
    } catch (error: any) {
      if (error.name === 'ZodError') {
        return res.status(400).json({ error: "Invalid data", details: error.errors });
      }

      console.error("Error updating contact status:", error);
      if (error.message === 'Contact not found') {
        return res.status(404).json({ error: error.message });
      }
      res.status(500).json({ error: error.message || "Internal server error" });
    }
  }

  async getContactsPaginated(req: Request, res: Response) {
    try {
      const { clinic_id, page = 1, limit = 25, status, search } = req.query;
      
      if (!clinic_id) {
        return res.status(400).json({ error: 'clinic_id is required' });
      }

      const clinicId = parseInt(clinic_id as string);
      if (isNaN(clinicId)) {
        return res.status(400).json({ error: 'Invalid clinic ID' });
      }

      const paginationParams = {
        page: parseInt(page as string),
        limit: Math.min(parseInt(limit as string), 100),
        offset: (parseInt(page as string) - 1) * parseInt(limit as string)
      };

      const filters = {
        status: status as string,
        search: search as string
      };

      const result = await this.service.getContactsPaginated(
        clinicId,
        paginationParams,
        filters
      );

      res.json(result);
    } catch (error: any) {
      console.error('Error fetching paginated contacts:', error);
      res.status(500).json({ error: error.message || 'Failed to fetch contacts' });
    }
  }
}