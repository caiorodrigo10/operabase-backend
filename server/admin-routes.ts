import { Request, Response } from 'express';
import { IStorage } from './storage';
import { isAuthenticated } from './auth';
import { requireAdminRole } from './middleware/admin-auth';

interface BasicAdminMetrics {
  totalClinics: number;
  totalUsers: number;
  totalContacts: number;
  totalAppointments: number;
}

export function setupAdminRoutes(app: any, storage: IStorage) {
  // Admin Dashboard Metrics
  app.get('/api/admin/dashboard', isAuthenticated, requireAdminRole, async (req: Request, res: Response) => {
    try {

      // Get metrics by aggregating data from all clinics
      // For now, we'll use clinic 1 as the primary clinic and get basic counts
      const [contacts, appointments, clinicUsers] = await Promise.all([
        storage.getContacts(1),
        storage.getAppointments(1),
        storage.getClinicUsers(1)
      ]);

      const metrics: BasicAdminMetrics = {
        totalClinics: 1, // Hardcoded for now as we have one clinic
        totalUsers: clinicUsers.length,
        totalContacts: contacts.length,
        totalAppointments: appointments.length
      };

      res.json(metrics);
    } catch (error) {
      console.error('Error fetching admin dashboard metrics:', error);
      res.status(500).json({ error: 'Failed to fetch dashboard metrics' });
    }
  });

  // Admin Clinics List
  app.get('/api/admin/clinics', isAuthenticated, async (req: Request, res: Response) => {
    try {
      const user = (req as any).user;
      if (!user || (user.role !== 'admin' && user.role !== 'super_admin')) {
        return res.status(403).json({ error: 'Access denied. Admin role required.' });
      }

      // For now, return a hardcoded clinic structure since we have one main clinic
      const clinic = await storage.getClinic(1);
      res.json(clinic ? [clinic] : []);
    } catch (error) {
      console.error('Error fetching clinics:', error);
      res.status(500).json({ error: 'Failed to fetch clinics' });
    }
  });

  // Admin Users Cross-Tenant
  app.get('/api/admin/users', isAuthenticated, requireAdminRole, async (req: Request, res: Response) => {
    try {

      const { clinic_id } = req.query;
      
      let users;
      
      // Get users from clinic if specified, otherwise get all users from clinic 1
      if (clinic_id) {
        const clinicIdNum = parseInt(clinic_id as string);
        const clinicUsers = await storage.getClinicUsers(clinicIdNum);
        users = clinicUsers.map(cu => ({
          ...cu.user,
          role: cu.role,
          is_professional: cu.is_professional,
          clinic_id: clinicIdNum
        }));
      } else {
        const clinicUsers = await storage.getClinicUsers(1);
        users = clinicUsers.map(cu => ({
          ...cu.user,
          role: cu.role,
          is_professional: cu.is_professional,
          clinic_id: 1
        }));
      }

      res.json(users);
    } catch (error) {
      console.error('Error fetching users:', error);
      res.status(500).json({ error: 'Failed to fetch users' });
    }
  });

  // Create new clinic (for future growth)
  app.post('/api/admin/clinics', isAuthenticated, requireAdminRole, async (req: Request, res: Response) => {
    try {

      const { name, email, phone, address } = req.body;
      
      if (!name || !email) {
        return res.status(400).json({ error: 'Name and email are required' });
      }

      const newClinic = await storage.createClinic({
        name,
        email,
        phone: phone || null,
        address: address || null,
        created_at: new Date(),
        updated_at: new Date()
      });

      res.status(201).json(newClinic);
    } catch (error) {
      console.error('Error creating clinic:', error);
      res.status(500).json({ error: 'Failed to create clinic' });
    }
  });
}