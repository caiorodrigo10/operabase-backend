import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface AnamnesisViewerProps {
  anamnesisId: number;
  onClose: () => void;
}

export function AnamnesisViewer({ anamnesisId, onClose }: AnamnesisViewerProps) {
  const { data: anamnesis, isLoading } = useQuery({
    queryKey: ['/api/anamnesis', anamnesisId],
    queryFn: async () => {
      const response = await fetch(`/api/anamnesis/${anamnesisId}`);
      if (!response.ok) throw new Error('Failed to fetch anamnesis details');
      return response.json();
    }
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!anamnesis) {
    return (
      <div className="text-center py-8">
        <p className="text-slate-500">Anamnese não encontrada</p>
      </div>
    );
  }

  const renderQuestionResponse = (question: any) => {
    const response = anamnesis.responses[question.id];
    const additionalInfo = anamnesis.responses[`${question.id}_additional`];

    return (
      <div key={question.id} className="space-y-3">
        <div>
          <h4 className="font-medium text-slate-900 mb-2">{question.text}</h4>
          
          {question.type === 'radio' && (
            <div className="bg-slate-50 p-3 rounded-md">
              <span className="font-medium text-slate-700">
                {response || 'Não respondido'}
              </span>
            </div>
          )}

          {question.type === 'textarea' && (
            <div className="bg-slate-50 p-3 rounded-md">
              <p className="text-slate-700 whitespace-pre-wrap">
                {response || 'Não respondido'}
              </p>
            </div>
          )}

          {additionalInfo && (
            <div className="mt-2">
              <span className="text-sm font-medium text-slate-600">Informações adicionais:</span>
              <div className="bg-blue-50 p-3 rounded-md mt-1">
                <p className="text-slate-700 whitespace-pre-wrap">{additionalInfo}</p>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-slate-900">{anamnesis.template_name}</h2>
            <div className="flex items-center space-x-4 mt-1">
              <span className="text-sm text-slate-500">
                Preenchido por: {anamnesis.patient_name}
              </span>
              {anamnesis.completed_at && (
                <span className="text-sm text-slate-500">
                  em {format(new Date(anamnesis.completed_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                </span>
              )}
            </div>
          </div>
          <Badge variant="default" className="bg-green-100 text-green-800 border-green-200">
            Preenchida
          </Badge>
        </div>

        {anamnesis.patient_email && (
          <div className="text-sm text-slate-600">
            <strong>Email:</strong> {anamnesis.patient_email}
          </div>
        )}

        {anamnesis.patient_phone && (
          <div className="text-sm text-slate-600">
            <strong>Telefone:</strong> {anamnesis.patient_phone}
          </div>
        )}
      </div>

      <Separator />

      {/* Questions and Responses */}
      <div className="space-y-6">
        <h3 className="text-lg font-medium text-slate-900">Respostas</h3>
        
        {anamnesis.template_fields?.questions?.map((question: any) => (
          <Card key={question.id} className="border border-slate-200">
            <CardContent className="p-4">
              {renderQuestionResponse(question)}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Actions */}
      <div className="flex justify-end space-x-3 pt-4 border-t">
        <Button variant="outline" onClick={onClose}>
          Fechar
        </Button>
        <Button onClick={() => window.print()}>
          Imprimir
        </Button>
      </div>
    </div>
  );
}