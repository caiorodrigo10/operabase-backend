import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { ArrowLeft, Plus, Edit, Trash2, GripVertical, Search } from 'lucide-react';
import { useLocation, useRoute } from 'wouter';
import { apiRequest } from '@/lib/queryClient';
import { supabase } from '@/lib/supabase';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import {
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface Question {
  id: string;
  text: string;
  type: 'sim_nao_nao_sei' | 'sim_nao_nao_sei_texto' | 'somente_texto';
  required: boolean;
  hasAdditional?: boolean;
  active?: boolean;
  order?: number;
}

interface SortableQuestionItemProps {
  question: Question;
  onEdit: (question: Question) => void;
  onRemove: (questionId: string) => void;
}

function SortableQuestionItem({ question, onEdit, onRemove }: SortableQuestionItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: question.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <Card ref={setNodeRef} style={style} className="hover:shadow-sm transition-shadow">
      <CardContent className="p-4">
        <div className="flex items-center space-x-4">
          <div
            {...attributes}
            {...listeners}
            className="cursor-grab active:cursor-grabbing"
          >
            <GripVertical className="w-5 h-5 text-gray-400" />
          </div>
          
          <div className="flex-1">
            <p className="font-medium text-gray-900">{question.text}</p>
            <p className="text-sm text-gray-500 mt-1">
              Tipo: {
                question.type === 'somente_texto' ? 'Somente texto' :
                question.type === 'sim_nao_nao_sei' ? 'Sim / Não / Não sei' :
                'Sim / Não / Não sei e Texto'
              }
            </p>
          </div>
          
          <div className="flex items-center space-x-3">
            <div className="flex items-center space-x-2">
              <Switch 
                checked={question.active !== false}
                onCheckedChange={() => {}}
              />
              <span className="text-sm text-gray-600">Ativo</span>
            </div>
            
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => onEdit(question)}
            >
              <Edit className="w-4 h-4 mr-1" />
              Editar
            </Button>
            
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => onRemove(question.id)}
              className="text-red-600 hover:text-red-700 hover:bg-red-50"
            >
              Remover
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

interface Template {
  id: number;
  name: string;
  description: string;
  fields: {
    questions: Question[];
  };
}

export default function EditarAnamnesePage() {
  const [, params] = useRoute('/configuracoes/anamneses/:id/editar');
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  
  const templateId = params?.id;
  const [searchTerm, setSearchTerm] = useState('');
  const [isAddQuestionOpen, setIsAddQuestionOpen] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<Question | null>(null);
  const [questionForm, setQuestionForm] = useState<{
    pergunta: string;
    tipo: 'sim_nao_nao_sei' | 'sim_nao_nao_sei_texto' | 'somente_texto';
    addToAllTemplates: boolean;
  }>({
    pergunta: '',
    tipo: 'somente_texto',
    addToAllTemplates: false
  });

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Mutation para reordenar perguntas
  const reorderQuestionsMutation = useMutation({
    mutationFn: async (newOrder: string[]) => {
      const { data: { session } } = await supabase.auth.getSession();
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      
      if (session?.access_token) {
        headers['Authorization'] = `Bearer ${session.access_token}`;
      }
      
      const response = await fetch(`/api/anamneses/${templateId}/perguntas/reorder`, {
        method: 'POST',
        headers,
        credentials: 'include',
        body: JSON.stringify({ order: newOrder })
      });
      if (!response.ok) throw new Error('Failed to reorder questions');
      return response.json();
    }
    // No onSuccess needed - using optimistic updates instead
  });

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;

    if (active.id !== over?.id) {
      const questions = template?.fields?.questions || [];
      const oldIndex = questions.findIndex((q: any) => q.id === active.id);
      const newIndex = questions.findIndex((q: any) => q.id === over?.id);

      if (oldIndex !== -1 && newIndex !== -1) {
        const newOrder = arrayMove(questions, oldIndex, newIndex);
        const questionIds = newOrder.map((q: any) => q.id);
        
        // Optimistically update the cache immediately
        queryClient.setQueryData(['/api/anamneses', templateId, 'editar'], (oldData: any) => {
          if (oldData) {
            return {
              ...oldData,
              fields: {
                ...oldData.fields,
                questions: newOrder
              }
            };
          }
          return oldData;
        });
        
        // Then make the API call in the background
        reorderQuestionsMutation.mutate(questionIds, {
          onError: () => {
            // Revert optimistic update on error
            queryClient.invalidateQueries({ queryKey: ['/api/anamneses', templateId, 'editar'] });
          }
        });
      }
    }
  }

  // Buscar template
  const { data: template, isLoading } = useQuery({
    queryKey: ['/api/anamneses', templateId, 'editar'],
    queryFn: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      
      if (session?.access_token) {
        headers['Authorization'] = `Bearer ${session.access_token}`;
      }
      
      const response = await fetch(`/api/anamneses/${templateId}/editar`, {
        headers,
        credentials: 'include'
      });
      if (!response.ok) throw new Error('Failed to fetch template');
      return response.json();
    },
    enabled: !!templateId
  });

  // Mutation para adicionar pergunta
  const addQuestionMutation = useMutation({
    mutationFn: async (data: any) => {
      const { data: { session } } = await supabase.auth.getSession();
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      
      if (session?.access_token) {
        headers['Authorization'] = `Bearer ${session.access_token}`;
      }
      
      const response = await fetch(`/api/anamneses/${templateId}/perguntas`, {
        method: 'POST',
        headers,
        credentials: 'include',
        body: JSON.stringify(data)
      });
      if (!response.ok) throw new Error('Failed to add question');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/anamneses', templateId, 'editar'] });
      setIsAddQuestionOpen(false);
      resetQuestionForm();
    }
  });

  // Mutation para editar pergunta
  const editQuestionMutation = useMutation({
    mutationFn: async ({ questionId, data }: { questionId: string; data: any }) => {
      const { data: { session } } = await supabase.auth.getSession();
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      
      if (session?.access_token) {
        headers['Authorization'] = `Bearer ${session.access_token}`;
      }
      
      const response = await fetch(`/api/anamneses/${templateId}/perguntas/${questionId}`, {
        method: 'PUT',
        headers,
        credentials: 'include',
        body: JSON.stringify(data)
      });
      if (!response.ok) throw new Error('Failed to edit question');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/anamneses', templateId, 'editar'] });
      setEditingQuestion(null);
      resetQuestionForm();
    }
  });

  // Mutation para remover pergunta
  const removeQuestionMutation = useMutation({
    mutationFn: async (questionId: string) => {
      const { data: { session } } = await supabase.auth.getSession();
      const headers: Record<string, string> = {};
      
      if (session?.access_token) {
        headers['Authorization'] = `Bearer ${session.access_token}`;
      }
      
      const response = await fetch(`/api/anamneses/${templateId}/perguntas/${questionId}`, {
        method: 'DELETE',
        headers,
        credentials: 'include'
      });
      if (!response.ok) throw new Error('Failed to remove question');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/anamneses', templateId, 'editar'] });
    }
  });

  const resetQuestionForm = () => {
    setQuestionForm({
      pergunta: '',
      tipo: 'somente_texto',
      addToAllTemplates: false
    });
  };

  const handleAddQuestion = () => {
    if (!questionForm.pergunta.trim()) return;

    addQuestionMutation.mutate({
      pergunta: questionForm.pergunta.trim(),
      tipo: questionForm.tipo,
      addToAllTemplates: questionForm.addToAllTemplates
    });
  };

  const handleEditQuestion = () => {
    if (!editingQuestion || !questionForm.pergunta.trim()) return;

    editQuestionMutation.mutate({
      questionId: editingQuestion.id,
      data: {
        pergunta: questionForm.pergunta.trim(),
        tipo: questionForm.tipo
      }
    });
  };

  const handleRemoveQuestion = (questionId: string) => {
    if (confirm('Tem certeza que deseja remover esta pergunta?')) {
      removeQuestionMutation.mutate(questionId);
    }
  };

  const openEditQuestion = (question: Question) => {
    setEditingQuestion(question);
    setQuestionForm({
      pergunta: question.text,
      tipo: question.type,
      addToAllTemplates: false
    });
    setIsAddQuestionOpen(true);
  };

  const openAddQuestion = () => {
    setEditingQuestion(null);
    resetQuestionForm();
    setIsAddQuestionOpen(true);
  };

  const questions = template?.fields?.questions || [];
  const filteredQuestions = questions.filter((q: Question) =>
    q.text.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (isLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Carregando modelo...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!template) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center">
          <p className="text-gray-600">Modelo não encontrado</p>
          <Button onClick={() => setLocation('/configuracoes/anamneses')} className="mt-4">
            Voltar aos modelos
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center space-x-4">
          <Button 
            variant="ghost" 
            size="sm"
            onClick={() => setLocation('/configuracoes/anamneses')}
            className="text-gray-600 hover:text-gray-900"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Voltar
          </Button>
          <h1 className="text-2xl font-semibold text-gray-900">{template.name}</h1>
          <Edit className="w-5 h-5 text-gray-400" />
        </div>
        
        <Dialog open={isAddQuestionOpen} onOpenChange={setIsAddQuestionOpen}>
          <DialogTrigger asChild>
            <Button onClick={openAddQuestion} className="bg-blue-600 hover:bg-blue-700">
              <Plus className="w-4 h-4 mr-2" />
              Adicionar pergunta
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-2xl">
            <DialogHeader>
              <DialogTitle>
                {editingQuestion ? 'Editar pergunta de anamnese' : 'Nova pergunta de anamnese'}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="question-text">* Pergunta</Label>
                <Input
                  id="question-text"
                  value={questionForm.pergunta}
                  onChange={(e) => setQuestionForm(prev => ({ ...prev, pergunta: e.target.value }))}
                  placeholder="Ex: Usa alguma medicação controlada?"
                  className="mt-1"
                />
              </div>
              
              <div>
                <Label>Tipo de resposta</Label>
                <Select 
                  value={questionForm.tipo} 
                  onValueChange={(value: any) => setQuestionForm(prev => ({ ...prev, tipo: value }))}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="somente_texto">Somente texto</SelectItem>
                    <SelectItem value="sim_nao_nao_sei">Sim / Não / Não sei</SelectItem>
                    <SelectItem value="sim_nao_nao_sei_texto">Sim / Não / Não sei e Texto</SelectItem>
                  </SelectContent>
                </Select>
              </div>



              {!editingQuestion && (
                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="add-to-all"
                    checked={questionForm.addToAllTemplates}
                    onCheckedChange={(checked) => setQuestionForm(prev => ({ ...prev, addToAllTemplates: !!checked }))}
                  />
                  <Label htmlFor="add-to-all">Adicionar esta pergunta em todos os modelos de anamnese</Label>
                </div>
              )}
              
              <div className="flex justify-end space-x-3 pt-4">
                <Button 
                  variant="outline" 
                  onClick={() => setIsAddQuestionOpen(false)}
                >
                  Cancelar
                </Button>
                <Button 
                  onClick={editingQuestion ? handleEditQuestion : handleAddQuestion}
                  disabled={!questionForm.pergunta.trim() || addQuestionMutation.isPending || editQuestionMutation.isPending}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  {editingQuestion ? 'Salvar alterações' : 'Salvar pergunta'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Search */}
      <div className="mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <Input
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Pesquisar"
            className="pl-10"
          />
        </div>
      </div>

      {/* Questions List */}
      <div className="space-y-4">
        {filteredQuestions.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500">
              {searchTerm ? 'Nenhuma pergunta encontrada' : 'Nenhuma pergunta adicionada ainda'}
            </p>
            {!searchTerm && (
              <Button onClick={openAddQuestion} className="mt-4">
                Adicionar primeira pergunta
              </Button>
            )}
          </div>
        ) : (
          <DndContext 
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext 
              items={filteredQuestions.map((q: any) => q.id)}
              strategy={verticalListSortingStrategy}
            >
              <div className="space-y-4">
                {filteredQuestions.map((question: Question) => (
                  <SortableQuestionItem
                    key={question.id}
                    question={question}
                    onEdit={openEditQuestion}
                    onRemove={handleRemoveQuestion}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        )}
      </div>
    </div>
  );
}