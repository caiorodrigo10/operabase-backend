import { createClient } from '@supabase/supabase-js';

interface UploadProfilePictureParams {
  file: Buffer;
  filename: string;
  mimeType: string;
  userId: string;
}

interface UploadProfilePictureResult {
  success: boolean;
  profilePictureUrl?: string;
  error?: string;
}

export class ProfilePictureService {
  private supabase;
  private bucketName = 'user-profiles';

  constructor() {
    this.supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
  }

  async uploadProfilePicture(params: UploadProfilePictureParams): Promise<UploadProfilePictureResult> {
    try {
      const { file, filename, mimeType, userId } = params;

      // Validar tipo de arquivo
      const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
      if (!allowedTypes.includes(mimeType)) {
        return {
          success: false,
          error: 'Formato de arquivo não suportado. Use JPEG, PNG ou WebP.'
        };
      }

      // Validar tamanho (5MB máximo)
      const maxSize = 5 * 1024 * 1024; // 5MB
      if (file.length > maxSize) {
        return {
          success: false,
          error: 'Arquivo muito grande. Máximo de 5MB.'
        };
      }

      // Garantir que o bucket existe
      await this.ensureBucketExists();

      // Gerar nome único para o arquivo
      const fileExtension = this.getFileExtension(mimeType);
      const fileName = `${userId}/profile.${fileExtension}`;

      // Deletar arquivo anterior se existir
      await this.deleteExistingProfilePicture(userId);

      // Upload do arquivo
      const { data: uploadData, error: uploadError } = await this.supabase.storage
        .from(this.bucketName)
        .upload(fileName, file, {
          contentType: mimeType,
          upsert: true
        });

      if (uploadError) {
        console.error('Erro no upload:', uploadError);
        return {
          success: false,
          error: 'Erro ao fazer upload da imagem.'
        };
      }

      // Gerar URL assinada (válida por 1 ano)
      const { data: urlData, error: urlError } = await this.supabase.storage
        .from(this.bucketName)
        .createSignedUrl(fileName, 31536000); // 1 ano em segundos

      if (urlError) {
        console.error('Erro ao gerar URL:', urlError);
        return {
          success: false,
          error: 'Erro ao gerar URL da imagem.'
        };
      }

      return {
        success: true,
        profilePictureUrl: urlData.signedUrl
      };

    } catch (error) {
      console.error('Erro no ProfilePictureService:', error);
      return {
        success: false,
        error: 'Erro interno do servidor.'
      };
    }
  }

  private async ensureBucketExists(): Promise<void> {
    try {
      const { data: buckets } = await this.supabase.storage.listBuckets();
      const bucketExists = buckets?.some(bucket => bucket.name === this.bucketName);

      if (!bucketExists) {
        await this.supabase.storage.createBucket(this.bucketName, {
          public: false,
          allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp'],
          fileSizeLimit: 5242880 // 5MB
        });
      }
    } catch (error) {
      console.error('Erro ao verificar/criar bucket:', error);
    }
  }

  private async deleteExistingProfilePicture(userId: string): Promise<void> {
    try {
      const extensions = ['jpg', 'jpeg', 'png', 'webp'];
      
      for (const ext of extensions) {
        const fileName = `${userId}/profile.${ext}`;
        await this.supabase.storage
          .from(this.bucketName)
          .remove([fileName]);
      }
    } catch (error) {
      // Falha silenciosa - não é crítico se não conseguir deletar
      console.log('Aviso: Não foi possível deletar imagem anterior:', error);
    }
  }

  private getFileExtension(mimeType: string): string {
    switch (mimeType) {
      case 'image/jpeg':
        return 'jpg';
      case 'image/png':
        return 'png';
      case 'image/webp':
        return 'webp';
      default:
        return 'jpg';
    }
  }

  async getProfilePictureUrl(userId: string): Promise<string | null> {
    try {
      const extensions = ['jpg', 'jpeg', 'png', 'webp'];
      
      for (const ext of extensions) {
        const fileName = `${userId}/profile.${ext}`;
        
        const { data, error } = await this.supabase.storage
          .from(this.bucketName)
          .createSignedUrl(fileName, 31536000);

        if (!error && data?.signedUrl) {
          // Verificar se o arquivo existe
          const { data: fileData } = await this.supabase.storage
            .from(this.bucketName)
            .list(userId);

          const fileExists = fileData?.some(file => file.name === `profile.${ext}`);
          
          if (fileExists) {
            return data.signedUrl;
          }
        }
      }
      
      return null;
    } catch (error) {
      console.error('Erro ao buscar URL da imagem de perfil:', error);
      return null;
    }
  }
}