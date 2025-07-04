
import type { IStorage } from '../../storage';
import type { CreateContactRequest, UpdateContactRequest } from './contacts.types';

export class ContactsRepository {
  constructor(private storage: IStorage) {}

  async getContacts(clinicId: number, filters?: any) {
    return this.storage.getContacts(clinicId, filters);
  }

  async getContactById(contactId: number) {
    return this.storage.getContact(contactId);
  }

  async createContact(data: CreateContactRequest) {
    return this.storage.createContact(data);
  }

  async updateContact(contactId: number, data: UpdateContactRequest) {
    return this.storage.updateContact(contactId, data);
  }

  async updateContactStatus(contactId: number, status: string) {
    return this.storage.updateContactStatus(contactId, status);
  }

  async countContacts(clinicId: number, filters: { status?: string; search?: string } = {}): Promise<number> {
    const allContacts = await this.storage.getContacts(clinicId, filters);
    return allContacts.length;
  }

  async findPaginated(
    clinicId: number, 
    pagination: { page: number; limit: number; offset: number },
    filters: { status?: string; search?: string } = {}
  ) {
    const allContacts = await this.storage.getContacts(clinicId, filters);
    
    const startIndex = pagination.offset;
    const endIndex = startIndex + pagination.limit;
    
    return allContacts.slice(startIndex, endIndex);
  }
}
