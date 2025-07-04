import { minimalStorage } from './storage-minimal';
import { PostgreSQLStorage } from './postgres-storage';
import { TenantAwareStorageProxy } from './shared/tenant-aware-storage-proxy';
import type { IStorage } from './storage';

export function createStorage(): IStorage {
  let baseStorage: IStorage;
  
  if (process.env.DATABASE_URL) {
    console.log('💾 Using PostgreSQL storage with Supabase');
    baseStorage = new PostgreSQLStorage();
  } else {
    console.log('💾 Using minimal storage for server startup');
    baseStorage = minimalStorage;
  }
  
  // Wrap with tenant isolation proxy
  console.log('🔒 Applying tenant isolation layer');
  return new TenantAwareStorageProxy(baseStorage);
}

export const storage = createStorage();