import { useRef } from 'react';
import { Camera, Loader2, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';

interface ProfileImageUploadProps {
  currentImageUrl?: string | null;
  onImageChange?: (newImageUrl: string | null) => void;
}

export function ProfileImageUpload({ currentImageUrl, onImageChange }: ProfileImageUploadProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Mutation para upload de imagem
  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('image', file);

      const response = await fetch('/api/user/upload-profile-picture', {
        method: 'POST',
        body: formData,
        credentials: 'include'
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Erro ao fazer upload da imagem');
      }

      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Sucesso!",
        description: "Imagem de perfil atualizada com sucesso."
      });
      
      // Invalidar cache do usuário
      queryClient.invalidateQueries({ queryKey: ['/api/user'] });
      
      // Chamar callback se fornecido
      if (onImageChange) {
        onImageChange(data.profilePictureUrl);
      }
    },
    onError: (error: Error) => {
      toast({
        title: "Erro",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  // Mutation para remover imagem
  const removeMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch('/api/user/profile-picture', {
        method: 'DELETE',
        credentials: 'include'
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Erro ao remover imagem');
      }

      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Sucesso!",
        description: "Imagem de perfil removida com sucesso."
      });
      
      // Invalidar cache do usuário
      queryClient.invalidateQueries({ queryKey: ['/api/user'] });
      
      // Chamar callback se fornecido
      if (onImageChange) {
        onImageChange(null);
      }
    },
    onError: (error: Error) => {
      toast({
        title: "Erro",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validar tipo de arquivo
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      toast({
        title: "Arquivo inválido",
        description: "Selecione uma imagem JPEG, PNG ou WebP.",
        variant: "destructive"
      });
      return;
    }

    // Validar tamanho (5MB)
    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      toast({
        title: "Arquivo muito grande",
        description: "A imagem deve ter no máximo 5MB.",
        variant: "destructive"
      });
      return;
    }

    // Upload automático após validação
    uploadMutation.mutate(file);
  };

  const handleRemove = () => {
    removeMutation.mutate();
  };

  // Gerar iniciais do usuário para fallback
  const getUserInitials = (name?: string): string => {
    if (!name) return 'U';
    return name
      .split(' ')
      .map(word => word.charAt(0))
      .slice(0, 2)
      .join('')
      .toUpperCase();
  };

  return (
    <>
      {/* Avatar atual com clique direto para seleção */}
      <div className="relative inline-block">
        <div 
          className="w-32 h-32 rounded-full overflow-hidden border-4 border-white shadow-lg bg-teal-600 flex items-center justify-center cursor-pointer hover:opacity-80 transition-opacity"
          onClick={() => fileInputRef.current?.click()}
          title="Clique para alterar foto de perfil"
        >
          {currentImageUrl ? (
            <img
              src={currentImageUrl}
              alt="Foto de perfil"
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="flex flex-col items-center justify-center text-white">
              <Camera className="w-8 h-8 mb-2" />
              <span className="text-xs">Adicionar foto</span>
            </div>
          )}
        </div>
        
        {/* Ícone indicativo de que é clicável */}
        <div className="absolute bottom-2 right-2 bg-teal-600 rounded-full w-8 h-8 flex items-center justify-center shadow-lg">
          <Camera className="w-4 h-4 text-white" />
        </div>
      </div>

      {/* Input de arquivo oculto */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        onChange={handleFileSelect}
        className="hidden"
      />

      {/* Botão de remover (apenas se houver imagem) */}
      {currentImageUrl && (
        <div className="mt-4 flex justify-center">
          <Button
            onClick={handleRemove}
            disabled={removeMutation.isPending}
            variant="outline"
            size="sm"
            className="text-red-600 hover:text-red-700 hover:bg-red-50"
          >
            {removeMutation.isPending ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Removendo...
              </>
            ) : (
              <>
                <Trash2 className="w-4 h-4 mr-2" />
                Remover foto
              </>
            )}
          </Button>
        </div>
      )}

      {/* Indicador de loading durante upload */}
      {uploadMutation.isPending && (
        <div className="mt-3 flex items-center justify-center text-sm text-gray-600">
          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          Enviando foto...
        </div>
      )}
    </>
  );
}