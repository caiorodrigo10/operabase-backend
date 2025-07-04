import { createClient } from '@supabase/supabase-js';

export class SupabaseStorageService {
  private supabase;
  private bucketName = 'conversation-attachments';

  constructor() {
    this.supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
  }

  async uploadFile(params: {
    file: Buffer;
    filename: string;
    mimeType: string;
    path: string;
  }) {
    const { data, error } = await this.supabase.storage
      .from(this.bucketName)
      .upload(params.path, params.file, {
        contentType: params.mimeType,
        upsert: false
      });

    if (error) {
      throw new Error(`Upload failed: ${error.message}`);
    }

    return data;
  }

  async getPublicUrl(path: string) {
    const { data } = this.supabase.storage
      .from(this.bucketName)
      .getPublicUrl(path);

    return data.publicUrl;
  }

  async deleteFile(path: string) {
    const { error } = await this.supabase.storage
      .from(this.bucketName)
      .remove([path]);

    if (error) {
      throw new Error(`Delete failed: ${error.message}`);
    }

    return true;
  }
} 