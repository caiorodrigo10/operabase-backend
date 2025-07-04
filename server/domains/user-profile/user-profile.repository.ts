
import type { Storage } from '../../storage';

export class UserProfileRepository {
  constructor(private storage: Storage) {}

  async getUser(userId: string) {
    return this.storage.getUser(userId);
  }

  async getUserByEmail(email: string) {
    return this.storage.getUserByEmail(email);
  }

  async updateUser(userId: string, data: any) {
    return this.storage.updateUser(userId, data);
  }

  async createPasswordResetToken(data: any) {
    return this.storage.createPasswordResetToken(data);
  }

  async getPasswordResetToken(token: string) {
    return this.storage.getPasswordResetToken(token);
  }

  async markPasswordResetTokenAsUsed(tokenId: string) {
    return this.storage.markPasswordResetTokenAsUsed(tokenId);
  }
}
