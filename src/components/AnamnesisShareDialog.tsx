import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Copy, MessageCircle, QrCode } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface AnamnesisResponse {
  id: number;
  template_id: number;
  template_name: string;
  status: 'pending' | 'completed';
  share_token: string;
  patient_name?: string;
  completed_at?: string;
  created_at: string;
  expires_at?: string;
}

interface AnamnesisShareDialogProps {
  anamnesis: AnamnesisResponse;
  onClose: () => void;
}

export function AnamnesisShareDialog({ anamnesis, onClose }: AnamnesisShareDialogProps) {
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();

  const shareUrl = `${window.location.origin}/anamnese/${anamnesis.share_token}`;

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      toast({
        title: "Link copiado!",
        description: "O link foi copiado para a área de transferência",
      });
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy:', error);
      toast({
        title: "Erro ao copiar",
        description: "Não foi possível copiar o link",
        variant: "destructive",
      });
    }
  };

  const handleWhatsAppShare = () => {
    const message = `Olá! Preciso que você preencha uma anamnese. Ao acessar o link, você poderá preencher a anamnese. Ele será direcionado a página de assinatura.

${shareUrl}`;
    
    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, '_blank');
  };

  const generateQRCode = () => {
    // Simple QR code generation using a public API
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(shareUrl)}`;
    return qrUrl;
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium text-slate-900 mb-2">
          Compartilhar link para preenchimento
        </h3>
        <p className="text-sm text-slate-600">
          Compartilhe o documento com seu paciente pelo WhatsApp, SMS, Telegram, e-mail ou como ele escolher.
        </p>
        <p className="text-sm text-slate-600 mt-1">
          Ao acessar o link, ele poderá preencher a anamnese.
        </p>
      </div>

      <div className="space-y-4">
        <div>
          <Label htmlFor="share-url" className="text-sm font-medium text-slate-700">
            Link para compartilhamento
          </Label>
          <div className="flex mt-1">
            <Input
              id="share-url"
              value={shareUrl}
              readOnly
              className="flex-1"
            />
            <Button
              onClick={handleCopyLink}
              variant="outline"
              className="ml-2"
              size="sm"
            >
              <Copy className="w-4 h-4 mr-1" />
              {copied ? 'Copiado' : 'Copiar'}
            </Button>
          </div>
        </div>

        <Button
          onClick={handleWhatsAppShare}
          className="w-full bg-green-600 hover:bg-green-700"
        >
          <MessageCircle className="w-4 h-4 mr-2" />
          Enviar pelo WhatsApp
        </Button>
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-slate-700">QR Code</span>
        </div>
        
        <div className="flex justify-center">
          <div className="p-4 bg-white border border-slate-200 rounded-lg">
            <img
              src={generateQRCode()}
              alt="QR Code"
              className="w-48 h-48"
            />
          </div>
        </div>
        
        <p className="text-xs text-slate-500 text-center">
          Se preferir, você pode solicitar ao seu paciente que aponte a câmera do celular para o QR code ao lado.
        </p>
        <p className="text-xs text-slate-500 text-center">
          Ele será direcionado a página de assinatura.
        </p>
      </div>

      <div className="flex justify-end space-x-3 pt-4 border-t">
        <Button variant="outline" onClick={onClose}>
          Fechar
        </Button>
      </div>
    </div>
  );
}