
import { Router } from 'express';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { isAuthenticated, hasClinicAccess } from '../../auth';

export function createAuthRoutes(storage: any): Router {
  const router = Router();
  const authService = new AuthService(storage);
  const authController = new AuthController(authService);

  // Get user's accessible clinics
  router.get('/user/clinics', 
    isAuthenticated, 
    authController.getUserClinics.bind(authController)
  );

  // Invite user to clinic
  router.post('/clinics/:clinicId/invitations', 
    isAuthenticated, 
    hasClinicAccess(), 
    authController.createInvitation.bind(authController)
  );

  // Accept clinic invitation
  router.post('/invitations/:token/accept', 
    isAuthenticated, 
    authController.acceptInvitation.bind(authController)
  );

  // Request password reset
  router.post('/auth/request-password-reset', 
    authController.requestPasswordReset.bind(authController)
  );

  // Reset password with token
  router.post('/auth/reset-password', 
    authController.resetPassword.bind(authController)
  );

  // Update user profile
  router.put('/user/profile', 
    isAuthenticated, 
    authController.updateProfile.bind(authController)
  );

  return router;
}
