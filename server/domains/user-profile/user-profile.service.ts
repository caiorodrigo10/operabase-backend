
import { UserProfileRepository } from './user-profile.repository';
import type { UpdateUserProfileRequest, RequestPasswordResetRequest, ResetPasswordRequest } from './user-profile.types';

export class UserProfileService {
  constructor(private repository: UserProfileRepository) {}

  async updateProfile(userId: string, data: UpdateUserProfileRequest) {
    const user = await this.repository.getUser(userId);
    if (!user) {
      throw new Error('Usuário não encontrado');
    }

    // If password update requested, validate current password
    if (data.newPassword && data.newPassword.trim()) {
      if (!data.currentPassword || !data.currentPassword.trim()) {
        throw new Error('Senha atual é obrigatória para alterar a senha');
      }

      const bcrypt = require('bcryptjs');
      const isValidPassword = await bcrypt.compare(data.currentPassword, user.password);
      if (!isValidPassword) {
        throw new Error('Senha atual incorreta');
      }

      // Hash new password
      const hashedPassword = await bcrypt.hash(data.newPassword, 10);
      await this.repository.updateUser(userId, {
        name: data.name,
        email: data.email,
        password: hashedPassword,
        updated_at: new Date(),
      });
    } else {
      // Update only name and email
      await this.repository.updateUser(userId, {
        name: data.name,
        email: data.email,
        updated_at: new Date(),
      });
    }

    return this.repository.getUser(userId);
  }

  async requestPasswordReset(data: RequestPasswordResetRequest) {
    const user = await this.repository.getUserByEmail(data.email);
    if (!user) {
      // Don't reveal if email exists for security
      return { message: 'Se o email estiver registrado, você receberá as instruções' };
    }

    // Generate unique token
    const crypto = require('crypto');
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    await this.repository.createPasswordResetToken({
      user_id: user.id,
      token,
      expires_at: expiresAt,
      used: false,
    });

    // Log token for development
    console.log(`\n🔑 TOKEN DE RECUPERAÇÃO DE SENHA:`);
    console.log(`Email: ${data.email}`);
    console.log(`Token: ${token}`);
    console.log(`Expira em: ${expiresAt.toLocaleString('pt-BR')}`);
    console.log(`Link de recuperação: http://localhost:5000/recuperar-senha?token=${token}\n`);

    return { 
      message: 'Se o email estiver registrado, você receberá as instruções',
      token: process.env.NODE_ENV === 'development' ? token : undefined
    };
  }

  async resetPassword(data: ResetPasswordRequest) {
    const resetToken = await this.repository.getPasswordResetToken(data.token);
    if (!resetToken) {
      throw new Error('Token inválido ou expirado');
    }

    if (resetToken.used) {
      throw new Error('Token já foi utilizado');
    }

    if (new Date() > new Date(resetToken.expires_at)) {
      throw new Error('Token expirado');
    }

    // Hash new password
    const bcrypt = require('bcryptjs');
    const hashedPassword = await bcrypt.hash(data.password, 10);

    // Update user password
    await this.repository.updateUser(resetToken.user_id, {
      password: hashedPassword,
      updated_at: new Date(),
    });

    // Mark token as used
    await this.repository.markPasswordResetTokenAsUsed(resetToken.id);

    return { message: 'Senha alterada com sucesso' };
  }
}
