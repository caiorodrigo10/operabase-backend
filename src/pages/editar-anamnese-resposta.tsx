import { useState, useEffect } from 'react';
import { useParams, useLocation } from 'wouter';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, Save } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface AnamnesisQuestion {
  id: string;
  text: string;
  type: string;
  required: boolean;
}

interface AnamnesisData {
  id: number;
  contact_id: number;
  template_id: number;
  template_name: string;
  template_fields: {
    questions: AnamnesisQuestion[];
  } | null;
  responses: Record<string, string>;
  status: string;
  patient_name?: string;
  created_at: string;
  updated_at: string;
}

interface Contact {
  id: number;
  name: string;
  email?: string;
  phone?: string;
}

export default function EditarAnamneseResposta() {
  const { contactId, anamnesisId } = useParams();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [responses, setResponses] = useState<Record<string, string>>({});
  const [hasChanges, setHasChanges] = useState(false);

  // Fetch anamnesis data
  const { data: anamnesis, isLoading } = useQuery({
    queryKey: ['/api/anamnesis', anamnesisId],
    queryFn: async () => {
      const response = await fetch(`/api/anamnesis/${anamnesisId}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      if (!response.ok) throw new Error('Failed to fetch anamnesis');
      return response.json();
    },
    enabled: !!anamnesisId
  });

  // Fetch contact data
  const { data: contact } = useQuery({
    queryKey: ['/api/contacts', contactId],
    queryFn: async () => {
      const response = await fetch(`/api/contacts/${contactId}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      if (!response.ok) throw new Error('Failed to fetch contact');
      return response.json();
    },
    enabled: !!contactId
  });

  // Initialize responses when anamnesis data loads
  useEffect(() => {
    if (anamnesis?.responses) {
      setResponses(anamnesis.responses);
    }
  }, [anamnesis]);

  const handleResponseChange = (questionId: string, value: string) => {
    setResponses(prev => ({
      ...prev,
      [questionId]: value
    }));
    setHasChanges(true);
  };

  // Save mutation
  const saveMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await fetch(`/api/anamnesis/${anamnesisId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(data)
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Erro ao salvar anamnese');
      }
      
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Sucesso!",
        description: "Anamnese atualizada com sucesso.",
      });
      setHasChanges(false);
      queryClient.invalidateQueries({ queryKey: ['/api/anamnesis', anamnesisId] });
      queryClient.invalidateQueries({ queryKey: ['/api/contacts', contactId, 'anamnesis'] });
    },
    onError: (error: any) => {
      toast({
        title: "Erro",
        description: error.message || "Não foi possível salvar a anamnese.",
        variant: "destructive",
      });
    }
  });

  const handleSave = () => {
    saveMutation.mutate({
      responses,
      status: 'completed'
    });
  };

  const handleBack = () => {
    // Navigate back to contact page and focus on anamnesis section
    setLocation(`/contatos/${contactId}#anamnesis`);
  };

  const renderQuestion = (question: AnamnesisQuestion) => {
    const value = responses[question.id] || '';
    const additionalValue = responses[`${question.id}_additional`] || '';

    switch (question.type) {
      case 'somente_texto':
        return (
          <Input
            value={value}
            onChange={(e) => handleResponseChange(question.id, e.target.value)}
            placeholder="Informações adicionais"
            className="w-full"
          />
        );

      case 'sim_nao_nao_sei':
        return (
          <RadioGroup value={value} onValueChange={(val) => handleResponseChange(question.id, val)} className="flex space-x-6">
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="Sim" id={`${question.id}-sim`} />
              <Label htmlFor={`${question.id}-sim`}>Sim</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="Não" id={`${question.id}-nao`} />
              <Label htmlFor={`${question.id}-nao`}>Não</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="Não sei" id={`${question.id}-nao-sei`} />
              <Label htmlFor={`${question.id}-nao-sei`}>Não sei</Label>
            </div>
          </RadioGroup>
        );

      case 'sim_nao_nao_sei_texto':
        return (
          <div className="space-y-4">
            <RadioGroup value={value} onValueChange={(val) => handleResponseChange(question.id, val)} className="flex space-x-6">
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="Sim" id={`${question.id}-sim`} />
                <Label htmlFor={`${question.id}-sim`}>Sim</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="Não" id={`${question.id}-nao`} />
                <Label htmlFor={`${question.id}-nao`}>Não</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="Não sei" id={`${question.id}-nao-sei`} />
                <Label htmlFor={`${question.id}-nao-sei`}>Não sei</Label>
              </div>
            </RadioGroup>
            <Input
              value={additionalValue}
              onChange={(e) => handleResponseChange(`${question.id}_additional`, e.target.value)}
              placeholder="Informações adicionais"
              className="w-full"
            />
          </div>
        );

      default:
        return (
          <Input
            value={value}
            onChange={(e) => handleResponseChange(question.id, e.target.value)}
            placeholder="Resposta"
            className="w-full"
          />
        );
    }
  };

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/3"></div>
          <div className="h-4 bg-gray-200 rounded w-2/3"></div>
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-20 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!anamnesis) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Anamnese não encontrada</h1>
          <p className="text-gray-600">A anamnese pode ter sido removida ou você não tem permissão para visualizá-la.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleBack}
            className="flex items-center space-x-2"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Voltar</span>
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Editar Anamnese</h1>
            <p className="text-gray-600">
              {contact?.name} • {anamnesis.template_name}
            </p>
          </div>
        </div>
        
        <div className="flex items-center space-x-3">
          <Button
            onClick={handleSave}
            disabled={!hasChanges || saveMutation.isPending}
            className="flex items-center space-x-2"
          >
            <Save className="w-4 h-4" />
            <span>{saveMutation.isPending ? 'Salvando...' : 'Salvar'}</span>
          </Button>
        </div>
      </div>

      {/* Form */}
      <Card>
        <CardHeader>
          <CardTitle>Respostas da Anamnese</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-8">
            {anamnesis.template_fields?.questions?.map((question, index) => (
              <div key={question.id} className="bg-gray-50 rounded-lg p-6">
                <Label className="text-base font-medium text-gray-900 block mb-4">
                  {question.text}
                  {question.required && <span className="text-red-500 ml-1">*</span>}
                </Label>
                {renderQuestion(question)}
              </div>
            ))}
            
            {(!anamnesis.template_fields?.questions || anamnesis.template_fields.questions.length === 0) && (
              <div className="text-center py-8">
                <p className="text-gray-500">Nenhuma pergunta encontrada no template.</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}