
import { Router } from 'express';
import { UserProfileController } from './user-profile.controller';
import { isAuthenticated } from '../../auth';

export function createUserProfileRoutes(storage: any): Router {
  const router = Router();
  const controller = new UserProfileController(storage);

  // User Profile routes
  router.put('/user/profile', isAuthenticated, controller.updateProfile);
  router.post('/auth/request-password-reset', controller.requestPasswordReset);
  router.post('/auth/reset-password', controller.resetPassword);

  return router;
}
