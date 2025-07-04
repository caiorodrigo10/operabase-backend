# Plano: Sistema de Upload de Arquivos - Supabase Storage + Evolution API

## 🎯 Objetivo
Implementar sistema completo de upload de arquivos (imagem, vídeo, áudio, documentos) conectado ao botão de anexo existente, usando **Supabase Storage** para armazenamento interno e **Evolution API** para envio automático via WhatsApp.

## 📋 Funcionalidades Principais

### 1. **Interface de Upload**
- **Trigger**: Botão "Paperclip" existente no MainConversationArea (linha 186)
- **Modal/Dialog**: Interface drag-and-drop para seleção de arquivos
- **Preview**: Visualização prévia antes do upload
- **Progress**: Barra de progresso durante upload
- **Validação**: Tipos MIME e tamanho (50MB máximo)

### 2. **Estrutura de Armazenamento**
```
conversation-attachments/
  clinic-{clinicId}/
    conversation-{conversationId}/
      images/
        {timestamp}-{filename}.{ext}
      videos/
        {timestamp}-{filename}.{ext}
      audio/
        {timestamp}-{filename}.{ext}
      documents/
        {timestamp}-{filename}.{ext}
```

### 3. **Tipos de Arquivo Suportados**
- **Imagens**: JPG, PNG, GIF, WEBP (até 10MB)
- **Vídeos**: MP4, MOV, AVI, WEBM (até 50MB)
- **Áudio**: MP3, WAV, OGG, M4A (até 25MB)
- **Documentos**: PDF, DOC, DOCX, TXT (até 20MB)

## 🔧 Implementação Técnica

### **FASE 1: Frontend Upload Component**

#### FileUploadModal Component
```typescript
interface FileUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  conversationId: string;
  onUploadSuccess: (attachment: MessageAttachment) => void;
}

// Funcionalidades:
// - Drag and drop zone
// - Multiple file selection
// - File type validation
// - Size validation
// - Progress tracking
// - Error handling
```

#### Integração com MainConversationArea
```typescript
// Atualizar botão existente (linha 186):
<Button
  variant="ghost"
  size="sm"
  className="text-gray-500 hover:text-gray-700 flex-shrink-0 w-10 h-10"
  title="Anexar arquivo"
  onClick={() => setShowUploadModal(true)} // Nova funcionalidade
>
  <Paperclip className="w-4 h-4" />
</Button>

// Adicionar modal:
<FileUploadModal
  isOpen={showUploadModal}
  onClose={() => setShowUploadModal(false)}
  conversationId={selectedConversationId}
  onUploadSuccess={handleUploadSuccess}
/>
```

### **FASE 2: Backend Upload Service - Integração Dupla**

#### Endpoint de Upload
```typescript
POST /api/conversations/:conversationId/upload
Content-Type: multipart/form-data

// Request:
{
  file: File,
  clinicId: number,
  caption?: string, // Caption para WhatsApp
  sendToWhatsApp?: boolean // Default: true
}

// Response:
{
  success: boolean,
  message: MessageWithAttachment,
  attachment: MessageAttachment,
  signedUrl: string,
  expiresAt: string,
  whatsapp: {
    sent: boolean,
    messageId?: string,
    error?: string
  }
}
```

#### UploadService Class - Integração Dupla
```typescript
class ConversationUploadService {
  // Upload principal com integração dupla
  async uploadFile(params: {
    file: Buffer,
    filename: string,
    mimeType: string,
    conversationId: string,
    clinicId: number,
    userId: number,
    caption?: string,
    sendToWhatsApp?: boolean
  }): Promise<UploadResult>;

  // Upload para Supabase Storage
  private async uploadToSupabase(params: UploadParams): Promise<StorageResult>;
  
  // Envio para Evolution API
  private async sendToEvolution(params: {
    mediaType: 'image' | 'video' | 'document' | 'audio',
    mediaUrl: string,
    fileName?: string,
    caption?: string,
    whatsappNumber: string,
    instanceId: string
  }): Promise<EvolutionResult>;

  // Gerar URLs assinadas
  async generateSignedUrl(storagePath: string): Promise<string>;
  
  // Validação de arquivos
  validateFile(file: Buffer, mimeType: string): ValidationResult;
  
  // Cleanup em caso de erro
  async cleanupFailedUpload(storagePath: string): Promise<void>;
}
```

### **FASE 3: Database Integration + WhatsApp**

#### Fluxo Completo - Integração Dupla
```typescript
// Fluxo completo:
1. Upload do arquivo para Supabase Storage
2. Criação da mensagem na tabela messages
3. Criação do attachment na tabela message_attachments
4. Geração de URL assinada (24h)
5. **ENVIO VIA EVOLUTION API**:
   - Buscar instância ativa da clínica
   - Determinar número WhatsApp do paciente
   - Enviar mídia via Evolution sendMedia
   - Atualizar status da mensagem
6. Invalidação do cache da conversa
7. Notificação WebSocket (se disponível)
```

#### Mapeamento Evolution API
```typescript
// Conversão MIME -> Evolution mediaType
const evolutionTypeMapping = {
  'image/jpeg': 'image',
  'image/png': 'image',
  'image/gif': 'image',
  'image/webp': 'image',
  'video/mp4': 'video',
  'video/mov': 'video',
  'video/avi': 'video',
  'audio/mp3': 'audio',
  'audio/mpeg': 'audio',
  'audio/wav': 'audio',
  'audio/ogg': 'audio',
  'application/pdf': 'document',
  'application/msword': 'document',
  'text/*': 'document'
};

// Payload Evolution API
interface EvolutionMediaPayload {
  number: string; // WhatsApp do paciente
  mediaMessage: {
    mediaType: 'image' | 'video' | 'document' | 'audio';
    fileName?: string; // Apenas para documentos
    caption?: string; // Não para áudio
    media: string; // URL pública assinada do Supabase
  };
  options?: {
    delay?: number;
    presence?: 'composing' | 'recording';
  };
}
```

#### Schema da Mensagem com Anexo + WhatsApp
```typescript
interface MessageWithAttachment {
  id: number;
  conversation_id: string;
  sender_type: 'professional' | 'patient';
  content: string; // Caption ou "📎 [filename] enviado"
  message_type: 'image' | 'video' | 'audio' | 'document';
  status: 'pending' | 'sent' | 'failed'; // Status WhatsApp
  whatsapp_message_id?: string; // ID retornado pela Evolution
  created_at: string;
  
  message_attachments: {
    id: number;
    file_name: string;
    file_type: string; // MIME type
    file_size: number;
    file_url: string; // URL assinada
    storage_path: string;
    signed_url_expires: string;
    whatsapp_sent: boolean; // Enviado via WhatsApp?
    whatsapp_error?: string; // Erro de envio
  }[];
}
```

## 🎨 Interface do Usuário

### **Upload Modal Design**
```
┌─────────────────────────────────────┐
│  📎 Enviar Arquivo                   │
├─────────────────────────────────────┤
│                                     │
│  ┌─────────────────────────────────┐ │
│  │  📁 Arraste arquivos aqui       │ │
│  │     ou clique para selecionar   │ │
│  │                                 │ │
│  │  Suportados: imagem, vídeo,     │ │
│  │  áudio, documentos (até 50MB)   │ │
│  └─────────────────────────────────┘ │
│                                     │
│  📄 documento.pdf (2.3 MB)          │
│  ████████████████░░░░ 80%           │
│                                     │
│  [Cancelar]           [Enviar]     │
└─────────────────────────────────────┘
```

### **Preview de Arquivos**
- **Imagens**: Thumbnail com dimensões
- **Vídeos**: Primeiro frame + duração
- **Áudio**: Waveform ou ícone + duração
- **Documentos**: Ícone + nome + tamanho

## 🔄 Fluxo de Upload

### **Passo a Passo - Fluxo Duplo**
1. **Usuário clica no botão anexo** → Abre modal
2. **Seleciona arquivo(s) + caption** → Validação client-side
3. **Confirma envio** → Inicia upload duplo
4. **Upload para Storage** → Progress feedback (50%)
5. **Criação de mensagem** → Banco de dados
6. **Envio via Evolution API** → Progress feedback (100%)
7. **Retorna para conversa** → Anexo visível + status WhatsApp
8. **Cache invalidation** → Lista atualizada

### **Estados da Mensagem**
- **📤 Enviando**: Upload em progresso
- **⏳ Processando**: Enviando via WhatsApp
- **✅ Enviado**: Sucesso total (Storage + WhatsApp)
- **⚠️ Parcial**: Storage OK, WhatsApp falhou
- **❌ Erro**: Falha completa

### **Tratamento de Erros - Cenários Duplos**
- **Arquivo muito grande**: Modal de erro com limite
- **Tipo não suportado**: Lista de tipos aceitos
- **Falha Storage**: Retry automático (3x), erro total
- **Falha WhatsApp**: Arquivo salvo, mas não enviado (modo degradado)
- **Instância WhatsApp offline**: Armazenar para retry posterior
- **Número WhatsApp inválido**: Salvar como nota interna
- **Erro de rede**: Mensagem "Verifique conexão"

## 🔒 Segurança e Validação

### **Client-side**
- Validação de tipo MIME
- Verificação de tamanho
- Preview sanitizado
- Rate limiting (max 5 uploads/minuto)

### **Server-side**
- Re-validação de todos os parâmetros
- Scan de malware (futuro)
- Autenticação obrigatória
- Isolamento por clínica
- Logs de auditoria

## 📊 Métricas e Monitoramento

### **Métricas de Upload**
```typescript
interface UploadMetrics {
  totalUploads: number;
  successRate: number;
  avgUploadTime: number;
  storageUsed: number; // GB por clínica
  popularFileTypes: Record<string, number>;
  errorsByType: Record<string, number>;
}
```

### **Alertas**
- Storage > 80% da cota
- Taxa de erro > 5%
- Upload time > 30s
- Arquivos suspeitos

## 🚀 Cronograma de Implementação - Integração Dupla

### **Dia 1: Frontend Base + Caption**
- [ ] FileUploadModal component com campo caption
- [ ] Integração com MainConversationArea
- [ ] Validação client-side + preview
- [ ] Progress tracking duplo (Storage + WhatsApp)

### **Dia 2: Backend Supabase Storage**
- [ ] Upload endpoint base
- [ ] SupabaseStorageService updates
- [ ] Database integration
- [ ] URL assinada generation

### **Dia 3: Evolution API Integration**
- [ ] EvolutionService para sendMedia
- [ ] Mapeamento MIME → mediaType
- [ ] Error handling e retry logic
- [ ] Status tracking (pending/sent/failed)

### **Dia 4: Integração Completa**
- [ ] Frontend + Backend integration
- [ ] Cache invalidation
- [ ] Visual feedback para estados
- [ ] Testing completo

### **Dia 5: Polimento + Monitoramento**
- [ ] UI/UX refinements
- [ ] Error messages específicos
- [ ] Métricas de sucesso WhatsApp
- [ ] Documentation update

## ❓ Decisões Pendentes - Integração WhatsApp

1. **Múltiplos arquivos**: Permitir upload simultâneo? (Recomendo: Não, WhatsApp é sequencial)
2. **Caption obrigatório**: Exigir caption para todos os tipos? (Recomendo: Opcional, exceto documentos)
3. **Retry WhatsApp**: Quantas tentativas se Evolution falhar? (Recomendo: 3x com backoff)
4. **Fallback mode**: Se WhatsApp falhar, salvar como nota interna? (Recomendo: Sim)
5. **URL pública**: Evolution precisa de URL pública - usar signed URL do Supabase? (Recomendo: Sim)
6. **Compressão**: Comprimir automaticamente antes do WhatsApp? (Recomendo: Apenas > 25MB)
7. **Presence indicator**: Mostrar "enviando foto/gravando áudio" no WhatsApp? (Recomendo: Sim)

## 🔄 Referências Técnicas

### **Evolution API sendMedia**
```javascript
// Endpoint: POST /message/sendMedia/{instance}
// Headers: { 'apikey': 'YOUR_API_KEY' }
{
  "number": "5511999999999", // WhatsApp do paciente
  "mediaMessage": {
    "mediaType": "image", // image, video, document, audio
    "fileName": "documento.pdf", // Apenas para documents
    "caption": "Resultado do seu exame", // Não para audio
    "media": "https://supabase.url/signed-url" // URL pública
  },
  "options": {
    "delay": 1000, // ms antes de enviar
    "presence": "composing" // composing | recording
  }
}
```

### **Integração com Sistema Existente**
- **Usar instância ativa da clínica**: Sistema já identifica instância "open"
- **Usar número WhatsApp do paciente**: conversation.whatsapp_chat_id
- **Manter compatibilidade**: Sistema funciona mesmo se Evolution falhar
- **Logs consistentes**: Usar mesmo sistema de logs do envio de texto

---

**✅ PLANO ATUALIZADO - Integração Supabase Storage + Evolution API WhatsApp**  
**Aguardando aprovação para iniciar implementação** 🚦