import { useState, useEffect } from 'react';
import { useParams, useLocation } from 'wouter';
import { ArrowLeft, FileText, Send, Copy, X, QrCode } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { queryClient, apiRequest } from '@/lib/queryClient';

interface AnamnesisTemplate {
  id: number;
  name: string;
  description: string;
  fields: {
    questions: Array<{
      id: string;
      text: string;
      type: 'text' | 'textarea' | 'select' | 'radio' | 'date' | 'email' | 'phone';
      options?: string[];
      required: boolean;
    }>;
  };
}

interface Contact {
  id: number;
  name: string;
  email?: string;
  phone?: string;
}

export default function PreencherAnamnese() {
  const params = useParams();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const contactId = parseInt(params.contactId || '0');
  
  const [selectedTemplateId, setSelectedTemplateId] = useState<number | null>(null);
  const [responses, setResponses] = useState<Record<string, string>>({});
  const [patientInfo, setPatientInfo] = useState({
    name: '',
    email: '',
    phone: ''
  });
  const [showShareModal, setShowShareModal] = useState(false);
  const [shareToken, setShareToken] = useState<string | null>(null);

  // Get contact info
  const { data: contact } = useQuery<Contact>({
    queryKey: ['/api/contacts', contactId],
    enabled: !!contactId
  });

  // Get available templates
  const { data: templates = [] } = useQuery<AnamnesisTemplate[]>({
    queryKey: ['/api/anamnesis/templates'],
    queryFn: async () => {
      const response = await fetch('/api/anamnesis/templates', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      if (!response.ok) throw new Error('Failed to fetch templates');
      return response.json();
    }
  });

  // Get selected template details
  const selectedTemplate = templates.find(t => t.id === selectedTemplateId);

  // Initialize patient info from contact
  useEffect(() => {
    if (contact) {
      setPatientInfo({
        name: contact.name || '',
        email: contact.email || '',
        phone: contact.phone || ''
      });
    }
  }, [contact]);

  // Auto-select default template (Anamnese Geral)
  useEffect(() => {
    if (templates.length > 0 && !selectedTemplateId) {
      const defaultTemplate = templates.find(t => t.name === 'Anamnese Geral') || templates[0];
      setSelectedTemplateId(defaultTemplate.id);
    }
  }, [templates, selectedTemplateId]);

  // Create anamnesis mutation
  const createAnamnesisMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await fetch(`/api/contacts/${contactId}/anamnesis`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(data)
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Erro ao criar anamnese');
      }
      
      return response.json();
    },
    onSuccess: (data, variables) => {
      // Check if this was a direct fill by professional (has responses) vs link creation (no responses)
      const isDirectFill = variables.responses && Object.keys(variables.responses).length > 0;
      
      if (isDirectFill) {
        toast({
          title: "Anamnese salva com sucesso",
          description: "A anamnese foi preenchida pelo profissional e salva no sistema."
        });
      } else {
        toast({
          title: "Anamnese criada com sucesso",
          description: "O link foi gerado e está pronto para ser enviado ao paciente."
        });
      }
      
      queryClient.invalidateQueries({ queryKey: ['/api/contacts', contactId, 'anamnesis'] });
      setLocation(`/contatos/${contactId}`);
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao criar anamnese",
        description: error.message || "Ocorreu um erro inesperado",
        variant: "destructive"
      });
    }
  });

  const handleBack = () => {
    // Invalidate cache before navigating to ensure fresh data
    queryClient.invalidateQueries({ queryKey: ['/api/contacts', contactId, 'anamnesis'] });
    // Navigate back to contact page and focus on anamnesis section
    setLocation(`/contatos/${contactId}#anamnesis`);
  };

  const generateShareableLink = () => {
    if (!shareToken) return '';
    const baseUrl = window.location.origin;
    return `${baseUrl}/anamnese/${shareToken}`;
  };

  const handleCopyLink = async () => {
    const link = generateShareableLink();
    try {
      await navigator.clipboard.writeText(link);
      toast({
        title: "Link copiado!",
        description: "O link foi copiado para a área de transferência.",
      });
    } catch (err) {
      toast({
        title: "Erro ao copiar",
        description: "Não foi possível copiar o link.",
        variant: "destructive",
      });
    }
  };

  const handleWhatsAppShare = () => {
    const link = generateShareableLink();
    const message = encodeURIComponent(`Olá! Por favor, preencha esta anamnese: ${link}`);
    window.open(`https://wa.me/?text=${message}`, '_blank');
  };

  const generateQRCode = () => {
    const link = generateShareableLink();
    return `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(link)}`;
  };

  // Mutation to create anamnesis record
  const createAnamnesisRecordMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch(`/api/contacts/${contactId}/anamnesis`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include', // Include session cookies
        body: JSON.stringify({
          template_id: selectedTemplateId,
          status: 'solicitado'
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create anamnesis record');
      }

      return response.json();
    },
    onSuccess: (data) => {
      setShareToken(data.share_token);
      // Invalidate anamnesis cache using the correct query key format
      queryClient.invalidateQueries({ queryKey: ['/api/contacts', contactId, 'anamnesis'] });
      toast({
        title: "Link criado!",
        description: "O link foi criado e a anamnese foi adicionada à lista.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao criar link",
        description: error.message || "Não foi possível criar o link de compartilhamento.",
        variant: "destructive",
      });
    }
  });

  const handleShareButtonClick = async () => {
    if (!selectedTemplateId) return;
    
    try {
      // Create anamnesis record first
      await createAnamnesisRecordMutation.mutateAsync();
      
      // Then open the modal
      setShowShareModal(true);
    } catch (error) {
      console.error('Error creating anamnesis record:', error);
    }
  };

  const handleTemplateChange = (templateId: string) => {
    if (templateId === 'create-new') {
      setLocation('/configuracoes/anamneses');
      return;
    }
    setSelectedTemplateId(parseInt(templateId));
    setResponses({});
  };

  const handleResponseChange = (questionId: string, value: string) => {
    setResponses(prev => ({
      ...prev,
      [questionId]: value
    }));
  };

  const handlePatientInfoChange = (field: string, value: string) => {
    setPatientInfo(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSubmit = () => {
    if (!selectedTemplateId) {
      toast({
        title: "Selecione um modelo",
        description: "Escolha um modelo de anamnese para continuar",
        variant: "destructive"
      });
      return;
    }

    if (!selectedTemplate) return;

    // Send as professional fill with appropriate status
    createAnamnesisMutation.mutate({
      template_id: selectedTemplateId,
      patient_name: patientInfo.name,
      patient_email: patientInfo.email,
      patient_phone: patientInfo.phone,
      responses: responses,
      status: 'preenchido_profissional', // Set status for professional fill
      filled_by_professional: true // Flag to indicate this is professional fill
    });
  };

  const renderQuestion = (question: any) => {
    const value = responses[question.id] || '';
    const additionalValue = responses[`${question.id}_additional`] || '';

    switch (question.type) {
      case 'text':
      case 'email':
      case 'phone':
        return (
          <Input
            type={question.type}
            value={value}
            onChange={(e) => handleResponseChange(question.id, e.target.value)}
            placeholder="Digite sua resposta..."
          />
        );

      case 'textarea':
        return (
          <Input
            value={value}
            onChange={(e) => handleResponseChange(question.id, e.target.value)}
            placeholder="Digite sua resposta..."
            className="w-full"
          />
        );

      case 'date':
        return (
          <Input
            type="date"
            value={value}
            onChange={(e) => handleResponseChange(question.id, e.target.value)}
          />
        );

      case 'select':
        return (
          <Select value={value} onValueChange={(val) => handleResponseChange(question.id, val)}>
            <SelectTrigger>
              <SelectValue placeholder="Selecione uma opção" />
            </SelectTrigger>
            <SelectContent>
              {question.options?.map((option: string) => (
                <SelectItem key={option} value={option}>
                  {option}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        );

      case 'radio':
        return (
          <div className="space-y-3">
            <RadioGroup value={value} onValueChange={(val) => handleResponseChange(question.id, val)} className="flex space-x-6">
              {question.options?.map((option: string) => (
                <div key={option} className="flex items-center space-x-2">
                  <RadioGroupItem value={option} id={`${question.id}-${option}`} />
                  <Label htmlFor={`${question.id}-${option}`} className="text-sm font-normal">{option}</Label>
                </div>
              ))}
            </RadioGroup>
            
            {question.hasAdditional && (
              <div className="mt-3">
                <Label className="text-sm text-gray-600 mb-2 block">Informações adicionais</Label>
                <Textarea
                  value={additionalValue}
                  onChange={(e) => handleResponseChange(`${question.id}_additional`, e.target.value)}
                  placeholder="Digite aqui..."
                  rows={2}
                  className="w-full"
                />
              </div>
            )}
          </div>
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

      case 'somente_texto':
        return (
          <Input
            value={value}
            onChange={(e) => handleResponseChange(question.id, e.target.value)}
            placeholder="Digite sua resposta..."
            className="w-full"
          />
        );

      default:
        return null;
    }
  };

  if (!contact) {
    return <div>Carregando...</div>;
  }

  return (
    <div className="max-w-4xl mx-auto p-6 bg-white min-h-screen">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center">
          <Button
            variant="ghost"
            onClick={handleBack}
            className="mr-3 p-2"
          >
            <ArrowLeft className="w-4 h-4 mr-1" />
            Voltar
          </Button>
          <h1 className="text-xl font-semibold text-slate-900">Preencher anamnese</h1>
        </div>
      </div>

      {/* Compact Template Selection */}
      <div className="flex items-center gap-4 mb-6 p-4 bg-gray-50 rounded-lg">
        <div className="flex-1">
          <Select value={selectedTemplateId?.toString() || ''} onValueChange={handleTemplateChange}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Anamnese Padrão" />
            </SelectTrigger>
            <SelectContent>
              {templates.map(template => (
                <SelectItem key={template.id} value={template.id.toString()}>
                  {template.name}
                </SelectItem>
              ))}
              <SelectItem value="create-new" className="text-blue-600 font-medium">
                Criar novo modelo
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        {selectedTemplateId && (
          <Button 
            onClick={handleShareButtonClick}
            variant="outline"
            size="sm"
            className="whitespace-nowrap"
            disabled={createAnamnesisRecordMutation.isPending}
          >
            <Send className="w-4 h-4 mr-2" />
            {createAnamnesisRecordMutation.isPending ? 'Criando...' : 'Enviar para paciente responder'}
          </Button>
        )}
      </div>



      {/* Questions Form */}
      {selectedTemplate && (
        <div className="space-y-6">
          {selectedTemplate.fields.questions.map((question, index) => (
            <div key={question.id} className="space-y-2">
              <Label className="text-sm font-medium text-gray-900 block">
                {question.text}
                {question.required && <span className="text-red-500 ml-1">*</span>}
              </Label>
              {renderQuestion(question)}
            </div>
          ))}
        </div>
      )}

      {/* Actions */}
      {selectedTemplate && (
        <div className="flex justify-end space-x-3 mt-8 pt-6 border-t">
          <Button
            variant="outline"
            onClick={handleBack}
            size="sm"
          >
            Cancelar
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={createAnamnesisMutation.isPending}
            className="bg-blue-600 hover:bg-blue-700"
            size="sm"
          >
            {createAnamnesisMutation.isPending ? (
              <>Salvando...</>
            ) : (
              <>
                <Send className="w-4 h-4 mr-2" />
                Salvar anamnese
              </>
            )}
          </Button>
        </div>
      )}

      {/* Share Modal */}
      <Dialog open={showShareModal} onOpenChange={(open) => {
        setShowShareModal(open);
        if (!open) {
          // When modal closes, navigate back to contact page with anamnesis tab
          queryClient.invalidateQueries({ queryKey: ['/api/contacts', contactId, 'anamnesis'] });
          setLocation(`/contatos/${contactId}#anamnesis`);
        }
      }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Compartilhar link para preenchimento</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              Compartilhe o documento com seu paciente pelo WhatsApp, SMS, Telegram, e-mail ou como ele escolher.
            </p>
            <p className="text-sm text-gray-600">
              Ao acessar o link, ele poderá preencher a anamnese.
            </p>
            
            {/* Link Input */}
            <div className="flex items-center space-x-2">
              <Input
                value={generateShareableLink()}
                readOnly
                className="flex-1"
              />
              <Button
                variant="outline"
                size="sm"
                onClick={handleCopyLink}
              >
                <Copy className="h-4 w-4 mr-1" />
                Copiar
              </Button>
            </div>

            {/* QR Code Section */}
            <div className="border-t pt-4">
              <div className="flex items-start space-x-4">
                <div className="flex-shrink-0">
                  <img
                    src={generateQRCode()}
                    alt="QR Code"
                    className="w-24 h-24 border rounded"
                  />
                </div>
                <div className="flex-1 space-y-2">
                  <p className="text-sm text-gray-600">
                    Se preferir, você pode solicitar ao seu paciente que aponte a câmera do celular para o QR code ao lado.
                  </p>
                  <p className="text-sm text-gray-600">
                    Ele será direcionado à página de assinatura.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}