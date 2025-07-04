import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import { AlertTriangle, CheckCircle } from 'lucide-react';

interface AnamnesisQuestion {
  id: string;
  text: string;
  type: string;
  required: boolean;
}

interface AnamnesisData {
  id: number;
  contact_id?: number;
  template_name: string;
  template_fields: {
    questions: AnamnesisQuestion[];
  } | null;
  status: string;
  expires_at: string;
}

export default function AnamnesisPublica() {
  const { toast } = useToast();
  // Extract token from URL directly since we're outside the routing context
  const token = window.location.pathname.split('/').pop();
  
  const [anamnesis, setAnamnesis] = useState<AnamnesisData | null>(null);
  const [clinicName, setClinicName] = useState('');
  const [clinicPhone, setClinicPhone] = useState('');
  const [loading, setLoading] = useState(true);
  const [responses, setResponses] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [showSuccessScreen, setShowSuccessScreen] = useState(false);

  useEffect(() => {
    if (token) {
      fetchAnamnesis();
    }
  }, [token]);

  const fetchAnamnesis = async () => {
    try {
      const response = await fetch(`/api/public/anamnesis/${token}`);
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        
        if (response.status === 410) {
          if (errorData.error === 'Anamnesis already completed') {
            setShowSuccessScreen(true);
            // For completed anamnesis, we still need clinic info, so make another API call or use fallback
            setClinicName('Clínica');
            return;
          } else if (errorData.error === 'Anamnesis expired') {
            toast({
              title: "Link expirado",
              description: "Este link de anamnese expirou. Entre em contato com a clínica.",
              variant: "destructive",
            });
            return;
          }
        }
        
        if (response.status === 404) {
          toast({
            title: "Link inválido",
            description: "Este link de anamnese não é válido ou foi removido.",
            variant: "destructive",
          });
          return;
        }
        
        throw new Error('Erro ao carregar anamnese');
      }
      
      const data = await response.json();
      setAnamnesis(data);
      
      // Set clinic name and phone from API response
      setClinicName(data.clinic_name || 'Clínica');
      setClinicPhone(data.clinic_phone || '');
    } catch (error) {
      console.error('Error fetching anamnesis:', error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar a anamnese.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };



  const handleResponseChange = (questionId: string, value: string) => {
    setResponses(prev => ({
      ...prev,
      [questionId]: value
    }));
  };

  const handleSubmit = () => {
    setShowConfirmDialog(true);
  };

  const handleConfirmSubmit = async () => {
    if (!anamnesis) return;

    setShowConfirmDialog(false);
    setSubmitting(true);
    try {
      const response = await fetch(`/api/public/anamnesis/${token}/submit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          responses,
          patient_name: 'Paciente',
        })
      });

      if (!response.ok) {
        throw new Error('Erro ao enviar anamnese');
      }

      setShowSuccessScreen(true);
    } catch (error) {
      console.error('Error submitting anamnesis:', error);
      toast({
        title: "Erro",
        description: "Não foi possível enviar a anamnese.",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
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
              <Label htmlFor={`${question.id}-sim`} className="text-sm font-normal">Sim</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="Não" id={`${question.id}-nao`} />
              <Label htmlFor={`${question.id}-nao`} className="text-sm font-normal">Não</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="Não sei" id={`${question.id}-nao-sei`} />
              <Label htmlFor={`${question.id}-nao-sei`} className="text-sm font-normal">Não sei</Label>
            </div>
          </RadioGroup>
        );

      case 'sim_nao_nao_sei_texto':
        return (
          <div className="space-y-3">
            <RadioGroup value={value} onValueChange={(val) => handleResponseChange(question.id, val)} className="flex space-x-6">
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="Sim" id={`${question.id}-sim`} />
                <Label htmlFor={`${question.id}-sim`} className="text-sm font-normal">Sim</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="Não" id={`${question.id}-nao`} />
                <Label htmlFor={`${question.id}-nao`} className="text-sm font-normal">Não</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="Não sei" id={`${question.id}-nao-sei`} />
                <Label htmlFor={`${question.id}-nao-sei`} className="text-sm font-normal">Não sei</Label>
              </div>
            </RadioGroup>
            
            <div>
              <Label className="text-sm text-gray-600 mb-1 block">Informações adicionais</Label>
              <Input
                value={additionalValue}
                onChange={(e) => handleResponseChange(`${question.id}_additional`, e.target.value)}
                placeholder="Digite aqui..."
                className="w-full"
              />
            </div>
          </div>
        );

      default:
        return (
          <Input
            value={value}
            onChange={(e) => handleResponseChange(question.id, e.target.value)}
            placeholder="Digite sua resposta..."
            className="w-full"
          />
        );
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Carregando anamnese...</p>
        </div>
      </div>
    );
  }

  if (showSuccessScreen) {
    return (
      <TooltipProvider>
        <div className="min-h-screen bg-blue-600 flex items-center justify-center">
          <div className="text-center text-white max-w-md mx-auto px-6">
            <div className="mb-8">
              <div className="relative mx-auto w-32 h-32 mb-6">
                <div className="absolute inset-0 bg-blue-400 rounded-full opacity-20"></div>
                <div className="absolute inset-4 bg-blue-300 rounded-full opacity-30"></div>
                <div className="absolute inset-8 bg-white rounded-full flex items-center justify-center">
                  <CheckCircle className="w-12 h-12 text-blue-600" />
                </div>
                <div className="absolute -top-2 -right-2 w-4 h-4 bg-blue-400 rounded-full opacity-60"></div>
                <div className="absolute top-6 -left-3 w-2 h-2 bg-blue-300 rounded-full"></div>
                <div className="absolute bottom-4 -right-4 w-3 h-3 bg-blue-400 rounded-full opacity-40"></div>
                <div className="absolute -bottom-1 left-8 w-1 h-1 bg-blue-300 rounded-full"></div>
              </div>
            </div>
            
            <h1 className="text-2xl font-bold mb-4">Anamnese enviada com sucesso!</h1>
            <p className="text-blue-100 mb-8">Caso necessário entre em contato</p>
            
            <div className="bg-white bg-opacity-10 rounded-lg p-6 mb-6">
              <h2 className="text-lg font-semibold mb-2">{clinicName}</h2>
              {clinicPhone && <p className="text-blue-100">{clinicPhone}</p>}
            </div>
          </div>
        </div>
        <Toaster />
      </TooltipProvider>
    );
  }

  if (!anamnesis) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Anamnese não encontrada</h1>
          <p className="text-gray-600">A anamnese pode ter expirado ou o link pode estar incorreto.</p>
        </div>
      </div>
    );
  }

  return (
    <TooltipProvider>
      <div className="min-h-screen bg-gray-50">
        {/* Clinic name header */}
        <div className="bg-blue-600 text-white py-4">
          <div className="max-w-3xl mx-auto px-6">
            <h1 className="text-lg font-medium text-center">{clinicName}</h1>
          </div>
        </div>

        {/* Main content */}
        <div className="max-w-3xl mx-auto px-6 py-8">
          <div className="bg-white rounded-lg shadow-sm p-8">
            <div className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Anamnese</h2>
              <p className="text-gray-600">
                Olá, assim que você preencher a anamnese o profissional irá receber os dados.
              </p>
            </div>

            {/* Questions */}
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

            {/* Submit button */}
            <div className="mt-8 flex justify-end">
              <Button
                onClick={handleSubmit}
                disabled={submitting}
                className="bg-blue-600 hover:bg-blue-700 px-8"
              >
                {submitting ? 'Enviando...' : 'Enviar →'}
              </Button>
            </div>
          </div>
        </div>

        {/* Confirmation Dialog */}
        <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
          <DialogContent className="max-w-md mx-auto">
            <DialogHeader>
              <div className="flex items-center justify-center mb-4">
                <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center">
                  <AlertTriangle className="w-8 h-8 text-orange-500" />
                </div>
              </div>
              <DialogTitle className="text-center text-xl font-semibold text-gray-900">
                Confirmar envio
              </DialogTitle>
            </DialogHeader>
            <div className="text-center mb-6">
              <p className="text-gray-600">
                Não será possível alterar após enviar, confira os dados primeiro.
              </p>
            </div>
            <div className="flex space-x-3">
              <Button
                onClick={handleConfirmSubmit}
                disabled={submitting}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
              >
                {submitting ? 'Enviando...' : 'OK'}
              </Button>
              <Button
                onClick={() => setShowConfirmDialog(false)}
                variant="outline"
                className="flex-1"
                disabled={submitting}
              >
                Cancelar
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
      <Toaster />
    </TooltipProvider>
  );
}