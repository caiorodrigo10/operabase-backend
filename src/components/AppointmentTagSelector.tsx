import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Tag, X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';

interface AppointmentTag {
  id: number;
  name: string;
  color: string;
  clinic_id: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface CreateTagData {
  name: string;
  color: string;
  clinic_id: number;
}

interface TagSelectorProps {
  clinicId: number;
  selectedTagId?: number | null;
  onTagSelect: (tagId: number | null) => void;
}

const predefinedColors = [
  '#3B82F6', // Blue
  '#10B981', // Green
  '#F59E0B', // Yellow
  '#EF4444', // Red
  '#8B5CF6', // Purple
  '#F97316', // Orange
  '#EC4899', // Pink
  '#6B7280', // Gray
  '#14B8A6', // Teal
  '#84CC16', // Lime
];

export function AppointmentTagSelector({ clinicId, selectedTagId, onTagSelect }: TagSelectorProps) {
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newTagName, setNewTagName] = useState('');
  const [newTagColor, setNewTagColor] = useState(predefinedColors[0]);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch appointment tags for the clinic
  const { data: tags = [], isLoading } = useQuery<AppointmentTag[]>({
    queryKey: [`/api/clinic/${clinicId}/appointment-tags`],
    enabled: !!clinicId,
  });

  // Create new tag mutation
  const createTagMutation = useMutation<AppointmentTag, Error, CreateTagData>({
    mutationFn: async (tagData: CreateTagData) => {
      const response = await apiRequest('POST', `/api/clinic/${clinicId}/appointment-tags`, tagData);
      return response.json();
    },
    onSuccess: (newTag: AppointmentTag) => {
      queryClient.invalidateQueries({ queryKey: [`/api/clinic/${clinicId}/appointment-tags`] });
      onTagSelect(newTag.id);
      setIsCreateModalOpen(false);
      setNewTagName('');
      setNewTagColor(predefinedColors[0]);
      toast({
        title: "Etiqueta criada",
        description: "Nova etiqueta criada com sucesso",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao criar etiqueta",
        description: error.message || "Ocorreu um erro inesperado",
        variant: "destructive",
      });
    },
  });

  const handleCreateTag = () => {
    if (!newTagName.trim()) {
      toast({
        title: "Nome obrigatório",
        description: "Por favor, insira um nome para a etiqueta",
        variant: "destructive",
      });
      return;
    }

    createTagMutation.mutate({
      name: newTagName.trim(),
      color: newTagColor,
      clinic_id: clinicId,
    });
  };

  const selectedTag = tags.find((tag: AppointmentTag) => tag.id === selectedTagId);

  return (
    <div className="space-y-2">
      <Label className="text-sm font-medium text-gray-700">Etiqueta</Label>
      <div className="flex gap-2">
        <Select 
          value={selectedTagId?.toString() || 'no-tag'} 
          onValueChange={(value) => onTagSelect(value === 'no-tag' ? null : parseInt(value))}
        >
          <SelectTrigger className="flex-1 h-11">
            <SelectValue placeholder="Selecione uma etiqueta">
              {selectedTag && (
                <div className="flex items-center gap-2">
                  <div 
                    className="w-3 h-3 rounded-full" 
                    style={{ backgroundColor: selectedTag.color }}
                  />
                  <span className="truncate">{selectedTag.name}</span>
                </div>
              )}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="no-tag">
              <div className="flex items-center gap-2">
                <X className="w-3 h-3 text-gray-400" />
                <span>Sem etiqueta</span>
              </div>
            </SelectItem>
            {tags.map((tag: AppointmentTag) => (
              <SelectItem key={tag.id} value={tag.id.toString()}>
                <div className="flex items-center gap-2">
                  <div 
                    className="w-3 h-3 rounded-full" 
                    style={{ backgroundColor: tag.color }}
                  />
                  <span className="truncate" title={tag.name}>{tag.name}</span>
                </div>
              </SelectItem>
            ))}
            <div className="border-t mt-1 pt-1">
              <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
                <DialogTrigger asChild>
                  <button className="w-full text-left px-2 py-1.5 text-sm hover:bg-gray-100 rounded flex items-center gap-2">
                    <Plus className="w-3 h-3" />
                    <span>Criar nova etiqueta</span>
                  </button>
                </DialogTrigger>
              </Dialog>
            </div>
          </SelectContent>
        </Select>
      </div>

      {/* Create Tag Modal */}
      <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Tag className="w-5 h-5" />
              Criar Nova Etiqueta
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="tag-name">Nome da Etiqueta *</Label>
              <Input
                id="tag-name"
                value={newTagName}
                onChange={(e) => setNewTagName(e.target.value)}
                placeholder="Ex: Avaliação, Retorno, Urgente..."
                maxLength={50}
              />
            </div>

            <div className="space-y-2">
              <Label>Cor da Etiqueta *</Label>
              <div className="grid grid-cols-5 gap-2">
                {predefinedColors.map((color) => (
                  <button
                    key={color}
                    type="button"
                    className={`w-8 h-8 rounded-full border-2 ${
                      newTagColor === color ? 'border-gray-800' : 'border-gray-300'
                    }`}
                    style={{ backgroundColor: color }}
                    onClick={() => setNewTagColor(color)}
                  />
                ))}
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button
                variant="outline"
                onClick={() => setIsCreateModalOpen(false)}
              >
                Cancelar
              </Button>
              <Button
                onClick={handleCreateTag}
                disabled={createTagMutation.isPending || !newTagName.trim()}
              >
                {createTagMutation.isPending ? 'Criando...' : 'Salvar'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}