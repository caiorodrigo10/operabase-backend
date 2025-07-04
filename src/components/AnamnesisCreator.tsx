import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Share, ChevronUp } from 'lucide-react';

interface AnamnesisTemplate {
  id: number;
  name: string;
  description?: string;
  fields: {
    questions: Array<{
      id: string;
      text: string;
      type: 'text' | 'radio' | 'checkbox' | 'textarea';
      options?: string[];
      required: boolean;
      additionalInfo: boolean;
    }>;
  };
}

interface AnamnesisCreatorProps {
  contactId: number;
  onSuccess: () => void;
  onCancel: () => void;
}

export function AnamnesisCreator({ contactId, onSuccess, onCancel }: AnamnesisCreatorProps) {
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');
  const [responses, setResponses] = useState<Record<string, any>>({});
  const [expandedQuestions, setExpandedQuestions] = useState<Set<string>>(new Set());

  // Fetch templates
  const { data: templates = [], isLoading: templatesLoading } = useQuery({
    queryKey: ['/api/anamnesis/templates'],
    queryFn: async () => {
      const response = await fetch('/api/anamnesis/templates');
      if (!response.ok) throw new Error('Failed to fetch templates');
      return response.json();
    }
  });

  // Create anamnesis mutation
  const createMutation = useMutation({
    mutationFn: async (templateId: number) => {
      const response = await fetch(`/api/contacts/${contactId}/anamnesis`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ template_id: templateId })
      });
      if (!response.ok) throw new Error('Failed to create anamnesis');
      return response.json();
    },
    onSuccess: () => {
      onSuccess();
    }
  });

  const selectedTemplate = templates.find((t: AnamnesisTemplate) => t.id.toString() === selectedTemplateId);

  const handleResponseChange = (questionId: string, value: any) => {
    setResponses(prev => ({
      ...prev,
      [questionId]: value
    }));
  };

  const handleAdditionalInfoChange = (questionId: string, value: string) => {
    setResponses(prev => ({
      ...prev,
      [`${questionId}_additional`]: value
    }));
  };

  const toggleQuestionExpansion = (questionId: string) => {
    setExpandedQuestions(prev => {
      const newSet = new Set(prev);
      if (newSet.has(questionId)) {
        newSet.delete(questionId);
      } else {
        newSet.add(questionId);
      }
      return newSet;
    });
  };

  const handleSendToPatient = () => {
    if (!selectedTemplateId) return;
    createMutation.mutate(parseInt(selectedTemplateId));
  };

  const renderQuestion = (question: any) => {
    const isExpanded = expandedQuestions.has(question.id);
    const hasAdditionalInfo = question.additionalInfo && responses[question.id];

    return (
      <div key={question.id} className="space-y-4">
        <div className="space-y-3">
          <h3 className="font-medium text-slate-900">{question.text}</h3>
          
          {question.type === 'radio' && question.options && (
            <RadioGroup
              value={responses[question.id] || ''}
              onValueChange={(value) => handleResponseChange(question.id, value)}
            >
              <div className="flex gap-6">
                {question.options.map((option: string) => (
                  <div key={option} className="flex items-center space-x-2">
                    <RadioGroupItem value={option} id={`${question.id}-${option}`} />
                    <Label htmlFor={`${question.id}-${option}`}>{option}</Label>
                  </div>
                ))}
              </div>
            </RadioGroup>
          )}

          {question.type === 'textarea' && (
            <Textarea
              placeholder="Informações adicionais"
              value={responses[question.id] || ''}
              onChange={(e) => handleResponseChange(question.id, e.target.value)}
              className="min-h-[100px]"
            />
          )}

          {question.additionalInfo && (
            <div className="space-y-2">
              <Label className="text-sm text-slate-600">Informações adicionais</Label>
              <Textarea
                placeholder="Digite aqui..."
                value={responses[`${question.id}_additional`] || ''}
                onChange={(e) => handleAdditionalInfoChange(question.id, e.target.value)}
                className="min-h-[80px]"
              />
            </div>
          )}
        </div>
      </div>
    );
  };

  if (templatesLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Select value={selectedTemplateId} onValueChange={setSelectedTemplateId}>
            <SelectTrigger className="w-[300px]">
              <SelectValue placeholder="Anamnese Padrão" />
            </SelectTrigger>
            <SelectContent>
              {templates.map((template: AnamnesisTemplate) => (
                <SelectItem key={template.id} value={template.id.toString()}>
                  {template.name}
                </SelectItem>
              ))}
              <Separator className="my-2" />
              <SelectItem value="create_new">
                <div className="flex items-center">
                  <ChevronUp className="w-4 h-4 mr-2" />
                  Criar novo modelo
                </div>
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Button 
          onClick={handleSendToPatient}
          disabled={!selectedTemplateId || selectedTemplateId === 'create_new' || createMutation.isPending}
          className="bg-blue-600 hover:bg-blue-700"
        >
          <Share className="w-4 h-4 mr-2" />
          Enviar para paciente responder
        </Button>
      </div>

      {selectedTemplate && (
        <div className="space-y-6">
          <div className="space-y-4">
            {selectedTemplate.fields.questions.map(renderQuestion)}
          </div>
        </div>
      )}

      <div className="flex justify-end space-x-3 pt-4 border-t">
        <Button variant="outline" onClick={onCancel}>
          Voltar
        </Button>
      </div>
    </div>
  );
}