
import { Request, Response } from 'express';
import { UserProfileService } from './user-profile.service';
import { UserProfileRepository } from './user-profile.repository';
import { updateUserProfileSchema, requestPasswordResetSchema, resetPasswordSchema } from './user-profile.types';

export class UserProfileController {
  private service: UserProfileService;

  constructor(storage: any) {
    const repository = new UserProfileRepository(storage);
    this.service = new UserProfileService(repository);
  }

  updateProfile = async (req: Request, res: Response) => {
    try {
      const userId = (req as any).user?.id;
      if (!userId) {
        return res.status(401).json({ error: 'Usuário não autenticado' });
      }

      const validatedData = updateUserProfileSchema.parse(req.body);
      const updatedUser = await this.service.updateProfile(userId, validatedData);

      res.json({
        message: 'Perfil atualizado com sucesso',
        user: {
          id: updatedUser.id,
          name: updatedUser.name,
          email: updatedUser.email,
          role: updatedUser.role,
        }
      });
    } catch (error: any) {
      if (error.name === 'ZodError') {
        return res.status(400).json({ error: "Invalid data", details: error.errors });
      }
      console.error('Erro ao atualizar perfil:', error);
      res.status(500).json({ error: error.message || 'Erro interno do servidor' });
    }
  };

  requestPasswordReset = async (req: Request, res: Response) => {
    try {
      const validatedData = requestPasswordResetSchema.parse(req.body);
      const result = await this.service.requestPasswordReset(validatedData);
      res.json(result);
    } catch (error: any) {
      if (error.name === 'ZodError') {
        return res.status(400).json({ error: "Invalid data", details: error.errors });
      }
      console.error('Erro ao solicitar reset de senha:', error);
      res.status(500).json({ error: 'Erro interno do servidor' });
    }
  };

  resetPassword = async (req: Request, res: Response) => {
    try {
      const validatedData = resetPasswordSchema.parse(req.body);
      const result = await this.service.resetPassword(validatedData);
      res.json(result);
    } catch (error: any) {
      if (error.name === 'ZodError') {
        return res.status(400).json({ error: "Invalid data", details: error.errors });
      }
      console.error('Erro ao resetar senha:', error);
      res.status(400).json({ error: error.message || 'Erro interno do servidor' });
    }
  };
}
