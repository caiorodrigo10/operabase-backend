import { Router } from "express";
import { ClinicsController } from "./clinics.controller";
import { z } from "zod";
import { isAuthenticated } from "../../auth.js";
// Simple validation middleware
const validateRequest = (schema: z.ZodSchema) => {
  return (req: any, res: any, next: any) => {
    try {
      schema.parse(req.body);
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          error: "Dados inválidos",
          details: error.errors
        });
      }
      next(error);
    }
  };
};

const router = Router();
const clinicsController = new ClinicsController();

// Simple role-based authorization middleware
const requireRole = (allowedRoles: string[]) => {
  return (req: any, res: any, next: any) => {
    if (!req.user) {
      return res.status(401).json({ error: "Usuário não autenticado" });
    }
    
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ error: "Acesso negado" });
    }
    
    next();
  };
};

// Schema for creating clinic invitation
const createInvitationSchema = z.object({
  admin_email: z.string().email("Email inválido"),
  admin_name: z.string().min(1, "Nome é obrigatório"),
  clinic_name: z.string().min(1, "Nome da clínica é obrigatório")
});

// Schema for accepting clinic invitation - CORRIGIDO
const acceptInvitationSchema = z.object({
  name: z.string().min(2, "Nome é obrigatório"),
  email: z.string().email("Email inválido"),
  clinicName: z.string().min(2, "Nome da clínica é obrigatório"),
  password: z.string().min(6, "Senha deve ter pelo menos 6 caracteres")
});

// List all clinics (super admin only)
router.get('/', isAuthenticated, requireRole(['super_admin']), clinicsController.listClinics);

// List invitations (super admin only) - MUST come before /:id route
router.get('/invitations', 
  isAuthenticated, 
  requireRole(['super_admin']), 
  clinicsController.listInvitations
);

// Create clinic invitation (super admin only)
router.post('/invitations', 
  isAuthenticated, 
  requireRole(['super_admin']), 
  validateRequest(createInvitationSchema),
  clinicsController.createInvitation
);

// Get invitation by token (public)
router.get('/invitations/:token', clinicsController.getInvitationByToken);

// Accept invitation (public) - Agora com schema correto
router.post('/invitations/:token/accept', 
  validateRequest(acceptInvitationSchema),
  clinicsController.acceptInvitation
);

// Cancel invitation (super admin only)
router.delete('/invitations/:id', 
  isAuthenticated, 
  requireRole(['super_admin']), 
  clinicsController.cancelInvitation
);

// Get clinic by ID (authenticated) - MUST come after specific routes
router.get('/:id', isAuthenticated, clinicsController.getClinicById);

// Update clinic (admin only)
router.patch('/:id', isAuthenticated, requireRole(['admin', 'super_admin']), clinicsController.updateClinic);

export { router as clinicsRoutes };