
import type { Request, Response } from 'express';
import { AuthService } from './auth.service';
import {
  loginRequestSchema,
  passwordResetRequestSchema,
  resetPasswordRequestSchema,
  updateProfileRequestSchema,
  invitationRequestSchema,
  type LoginRequest,
  type PasswordResetRequest,
  type ResetPasswordRequest,
  type UpdateProfileRequest,
  type InvitationRequest
} from './auth.types';

export class AuthController {
  constructor(private authService: AuthService) {}

  async getUserClinics(req: any, res: Response) {
    try {
      const userId = req.user.id;
      const userClinics = await this.authService.getUserClinics(userId);
      res.json(userClinics);
    } catch (error) {
      console.error("Error fetching user clinics:", error);
      res.status(500).json({ error: "Failed to fetch clinics" });
    }
  }

  async createInvitation(req: any, res: Response) {
    try {
      const clinicId = parseInt(req.params.clinicId);
      const inviterId = req.user.dbUser.id;
      
      const validatedData = invitationRequestSchema.parse(req.body);
      const invitation = await this.authService.createInvitation(clinicId, inviterId, validatedData);
      
      res.status(201).json(invitation);
    } catch (error: any) {
      if (error.name === 'ZodError') {
        return res.status(400).json({ error: "Invalid data", details: error.errors });
      }
      console.error("Error creating invitation:", error);
      res.status(500).json({ error: error.message || "Failed to create invitation" });
    }
  }

  async acceptInvitation(req: any, res: Response) {
    try {
      const token = req.params.token;
      const userId = req.user.dbUser.id;
      
      const clinicUser = await this.authService.acceptInvitation(token, userId);
      res.json(clinicUser);
    } catch (error: any) {
      console.error("Error accepting invitation:", error);
      res.status(400).json({ error: error.message || "Failed to accept invitation" });
    }
  }

  async requestPasswordReset(req: Request, res: Response) {
    try {
      const validatedData = passwordResetRequestSchema.parse(req.body);
      const result = await this.authService.requestPasswordReset(validatedData);
      res.json(result);
    } catch (error: any) {
      if (error.name === 'ZodError') {
        return res.status(400).json({ error: "Invalid data", details: error.errors });
      }
      console.error("Error requesting password reset:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  }

  async resetPassword(req: Request, res: Response) {
    try {
      const validatedData = resetPasswordRequestSchema.parse(req.body);
      const result = await this.authService.resetPassword(validatedData);
      res.json(result);
    } catch (error: any) {
      if (error.name === 'ZodError') {
        return res.status(400).json({ error: "Invalid data", details: error.errors });
      }
      console.error("Error resetting password:", error);
      
      if (error.message.includes('Token')) {
        return res.status(400).json({ error: error.message });
      }
      
      res.status(500).json({ error: "Internal server error" });
    }
  }

  async updateProfile(req: any, res: Response) {
    try {
      const userId = req.user.id;
      const validatedData = updateProfileRequestSchema.parse(req.body);
      
      const result = await this.authService.updateProfile(userId, validatedData);
      res.json(result);
    } catch (error: any) {
      if (error.name === 'ZodError') {
        return res.status(400).json({ error: "Invalid data", details: error.errors });
      }
      
      console.error("Error updating profile:", error);
      
      if (error.message.includes('Senha') || error.message.includes('Usuário')) {
        return res.status(400).json({ error: error.message });
      }
      
      res.status(500).json({ error: "Internal server error" });
    }
  }
}
