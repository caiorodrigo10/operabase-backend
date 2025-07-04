# Sistema de Recebimento de Arquivos N8N - Documentação Completa

## Visão Geral
Sistema completo para recebimento de arquivos de clientes via WhatsApp através da integração N8N. O sistema processa arquivos com ou sem texto do cliente, armazena no Supabase Storage e exibe corretamente na interface do TaskMed.

## Arquitetura do Sistema

### Fluxo de Dados
```
WhatsApp Cliente → N8N Workflow → TaskMed API (/api/n8n/upload) → Supabase Storage + Database → Frontend
```

## 1. Backend: API de Recebimento

### Endpoint Principal
```
POST /api/n8n/upload
```

### Autenticação e Segurança
- **Middleware de Autenticação**: `validateN8NApiKey`
- **Rate Limiting**: 30 requests/min por IP
- **Header Sanitization**: Remove caracteres problemáticos dos headers

```typescript
// Headers de Autenticação
X-API-Key: [64-character-key]
// ou
X-N8N-API-Key: [64-character-key]
// ou  
Authorization: Bearer [64-character-key]
```

### Headers de Entrada
```typescript
// Obrigatórios
x-conversation-id: string  // ID da conversa
x-clinic-id: number       // ID da clínica

// Opcionais
x-caption: string                    // Texto do cliente junto com arquivo
x-whatsapp-message-id: string       // ID da mensagem no WhatsApp
x-whatsapp-media-id: string         // ID da mídia no WhatsApp  
x-whatsapp-media-url: string        // URL da mídia no WhatsApp
x-timestamp: string                 // Timestamp ISO 8601
```

### Processamento Backend

#### 1. Sanitização de Headers
```typescript
// server/n8n-auth.ts
export const sanitizeN8NHeaders = (req: Request, res: Response, next: NextFunction) => {
  const headersToSanitize = [
    'x-caption', 'x-filename', 'x-whatsapp-message-id',
    'x-whatsapp-media-id', 'x-whatsapp-media-url'
  ];
  
  headersToSanitize.forEach(headerName => {
    if (req.headers[headerName]) {
      const sanitized = sanitizeHeaderValue(req.headers[headerName]);
      req.headers[headerName] = sanitized;
    }
  });
}
```

#### 2. Upload para Supabase Storage
```typescript
// server/services/conversation-upload.service.ts
async uploadFromN8N(params: N8NUploadParams): Promise<UploadResult> {
  // 1. Validar arquivo
  this.validateFile(file, mimeType, filename);
  
  // 2. Sanitizar filename
  const sanitizedFilename = this.sanitizeFilename(filename);
  
  // 3. Upload para Supabase Storage
  const storageResult = await this.uploadToSupabase({
    file, filename: sanitizedFilename, mimeType, conversationId, clinicId
  });
  
  // 4. Validar conversa existe
  const conversation = await this.findConversation(conversationId, clinicId);
  
  // 5. Criar mensagem no banco
  const messageContent = caption && caption.trim() ? caption.trim() : '';
  const messageType = this.getWhatsAppMessageType(mimeType);
  
  const message = await this.storage.createMessage({
    conversation_id: conversation.id.toString(),
    content: messageContent,  // Vazio se não há caption
    sender_type: 'patient',
    message_type: messageType,
    timestamp: brasiliaTimestamp
  });
  
  // 6. Criar attachment
  const attachment = await this.storage.createAttachment({
    message_id: message.id,
    clinic_id: clinicId,
    file_name: filename,
    file_type: mimeType,
    file_size: file.length,
    file_url: storageResult.signedUrl
  });
  
  return { success: true, message, attachment, signedUrl, expiresAt };
}
```

#### 3. Lógica de Caption
```typescript
// Decisão de Content da Mensagem
let messageContent = '';
if (caption !== undefined && caption !== null && caption.trim() !== '') {
  messageContent = caption.trim();  // Usar texto do cliente
}
// Se não há caption válido, content fica vazio (só anexo visual)
```

## 2. Armazenamento: Supabase Storage

### Estrutura de Pastas
```
conversation-attachments/
├── clinic-1/
│   ├── conversation-{id}/
│   │   ├── images/
│   │   │   └── timestamp-filename.jpg
│   │   ├── audio/
│   │   │   └── timestamp-filename.mp3
│   │   ├── videos/
│   │   │   └── timestamp-filename.mp4
│   │   └── documents/
│   │       └── timestamp-filename.pdf
```

### Configuração do Bucket
```typescript
// Bucket: conversation-attachments
{
  allowedMimeTypes: [
    'image/jpeg', 'image/png', 'image/gif', 'image/webp',
    'audio/mpeg', 'audio/mp4', 'audio/wav', 'audio/ogg',
    'video/mp4', 'video/mpeg', 'video/quicktime',
    'application/pdf', 'text/plain', 'application/msword'
  ],
  maxFileSize: 50 * 1024 * 1024, // 50MB
  isPublic: false // Arquivos privados
}
```

### URLs Assinadas
- **Duração**: 24 horas
- **Renovação**: Automática via endpoint `/api/attachments/:id/renew-url`
- **Segurança**: Acesso restrito por clínica

## 3. Database: Estrutura de Dados

### Tabela: messages
```sql
-- Mensagem criada para cada arquivo
{
  id: number,
  conversation_id: string,
  content: string,           -- Vazio se sem caption, texto se com caption
  sender_type: 'patient',    -- Sempre patient para N8N
  message_type: string,      -- audio_voice, image, video, document
  device_type: 'manual',     -- WhatsApp considerado manual
  timestamp: datetime,       -- GMT-3 (Brasília)
  ai_action: 'file_upload'   -- Marca como upload de arquivo
}
```

### Tabela: message_attachments
```sql
-- Anexo vinculado à mensagem
{
  id: number,
  message_id: number,        -- FK para messages.id
  clinic_id: number,         -- Isolamento multi-tenant
  file_name: string,         -- Nome original do arquivo
  file_type: string,         -- MIME type
  file_size: number,         -- Tamanho em bytes
  file_url: string,          -- URL assinada do Supabase
  whatsapp_media_id: string, -- ID da mídia no WhatsApp (opcional)
  whatsapp_media_url: string -- URL da mídia no WhatsApp (opcional)
}
```

## 4. Frontend: Exibição de Arquivos

### Componente de Mensagem
```typescript
// client/src/components/features/conversas/MessageBubble.tsx
const MessageBubble = ({ message, attachments }) => {
  const messageAttachments = attachments.filter(att => att.message_id === message.id);
  
  return (
    <div className="message-bubble">
      {/* Texto da mensagem (se houver) */}
      {message.content && (
        <div className="message-content">
          {message.content}
        </div>
      )}
      
      {/* Anexos */}
      {messageAttachments.map(attachment => (
        <MediaMessage 
          key={attachment.id}
          attachment={attachment}
          type={getMediaType(attachment.file_type)}
        />
      ))}
    </div>
  );
};
```

### Componente de Mídia
```typescript
// client/src/components/features/conversas/MediaMessage.tsx
const MediaMessage = ({ attachment, type }) => {
  switch (type) {
    case 'image':
      return <ImagePreview src={attachment.file_url} alt={attachment.file_name} />;
    
    case 'audio':
      return <AudioPlayer src={attachment.file_url} filename={attachment.file_name} />;
    
    case 'video':
      return <VideoPlayer src={attachment.file_url} filename={attachment.file_name} />;
    
    case 'document':
      return <DocumentPreview attachment={attachment} />;
  }
};
```

### Detecção de Tipos de Mídia
```typescript
// Mapeamento MIME → Categoria
const getMediaType = (mimeType: string): string => {
  if (mimeType.startsWith('image/')) return 'image';
  if (mimeType.startsWith('audio/')) return 'audio'; 
  if (mimeType.startsWith('video/')) return 'video';
  return 'document';
};

// Tipo de mensagem para WhatsApp
const getWhatsAppMessageType = (mimeType: string): string => {
  if (mimeType.startsWith('audio/')) return 'audio_voice'; // Diferencia de audio_file
  if (mimeType.startsWith('image/')) return 'image';
  if (mimeType.startsWith('video/')) return 'video';
  return 'document';
};
```

## 5. Exemplos de Uso

### Arquivo SEM Caption (só anexo)
```bash
curl -X POST "https://taskmed.com/api/n8n/upload" \
  -H "X-API-Key: sua_chave_64_chars" \
  -H "x-conversation-id: 559887694034551150391104" \
  -H "x-clinic-id: 1" \
  -F "file=@audio.mp3"

# Resultado: Mensagem com content="" (vazio) + anexo de áudio
```

### Arquivo COM Caption (texto + anexo)
```bash
curl -X POST "https://taskmed.com/api/n8n/upload" \
  -H "X-API-Key: sua_chave_64_chars" \
  -H "x-conversation-id: 559887694034551150391104" \
  -H "x-clinic-id: 1" \
  -H "x-caption: Olha essa foto do exame!" \
  -F "file=@exame.jpg"

# Resultado: Mensagem com content="Olha essa foto do exame!" + anexo de imagem
```

## 6. Configuração de Ambiente

### Variáveis Necessárias
```env
# Supabase
SUPABASE_URL=https://seu-projeto.supabase.co
SUPABASE_SERVICE_ROLE_KEY=sua_service_role_key

# N8N API
N8N_API_KEY=sua_chave_de_64_caracteres_criptograficamente_segura

# Database
DATABASE_URL=postgresql://conexao_supabase
```

### Inicialização do Bucket
```typescript
// Executado automaticamente no startup do servidor
await this.supabaseStorage.initializeBucket();
```

## 7. Monitoramento e Logs

### Logs de Upload
```
📥 N8N Upload: filename.jpg (image/jpeg) for conversation 123
📁 Uploading N8N file to Supabase Storage...
💾 Creating N8N message in database...
📎 Creating N8N attachment...
✅ N8N Upload completed: { messageId: 456, attachmentId: 147 }
```

### Métricas Importantes
- **Taxa de Sucesso**: >95% uploads bem-sucedidos
- **Tempo de Resposta**: <2s para arquivos <10MB
- **Armazenamento**: Organizado por clínica/conversa
- **Segurança**: Headers sanitizados, rate limiting ativo

## 8. Tratamento de Erros

### Erros Comuns
```typescript
// Arquivo muito grande
400: "File size exceeds 50MB limit"

// Tipo não suportado  
400: "Unsupported file type"

// Conversa não encontrada
404: "Conversation not found"

// Autenticação inválida
401: "Invalid API key"

// Rate limit excedido
429: "Too many requests"
```

### Recovery e Fallback
- **Headers Corrompidos**: Sanitização automática
- **Upload Falha**: Retry com exponential backoff
- **Conversa Inválida**: Log de erro detalhado
- **Timeout**: Limite de 30s por request

## Conclusão

O sistema de recebimento de arquivos N8N está completamente funcional com:

✅ **Backend Robusto**: API segura com sanitização e validação  
✅ **Armazenamento Organizado**: Supabase Storage com estrutura clara  
✅ **Database Consistente**: Mensagens e anexos relacionados corretamente  
✅ **Frontend Intuitivo**: Exibição limpa de arquivos com/sem caption  
✅ **Segurança Completa**: Autenticação, rate limiting, headers sanitizados  
✅ **Monitoramento**: Logs detalhados para troubleshooting  

O sistema processa corretamente arquivos do WhatsApp via N8N, mantendo a experiência do usuário natural e a integridade dos dados.