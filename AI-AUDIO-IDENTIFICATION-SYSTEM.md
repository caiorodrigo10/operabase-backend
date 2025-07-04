# Sistema de Identificação de Áudios da IA

## Visão Geral

Sistema implementado para distinguir entre áudios enviados por pacientes e áudios gerados pela IA, utilizando o endpoint N8N existente com identificação via header.

## Especificação Técnica

### Header de Identificação
- **Header**: `X-Sender-Type`
- **Valores**: 
  - `patient` (padrão) - Mensagem enviada pelo paciente
  - `ai` - Mensagem gerada pela IA

### Parâmetros de Banco de Dados
- **Mensagens de Pacientes**:
  - `sender_type: 'patient'`
  - `device_type: 'manual'`
  
- **Mensagens da IA**:
  - `sender_type: 'ai'`
  - `device_type: 'system'`

## Implementação

### 1. Upload Routes (server/routes/upload-routes.ts)
```typescript
// Captura do header X-Sender-Type
const senderType = req.headers['x-sender-type'] || req.body.senderType;

// Log de identificação
console.log('📋 N8N Upload parameters:', {
  // ... outros parâmetros
  senderType: senderType || 'patient (default)'
});

// Parâmetros enviados para o serviço
const uploadParams = {
  // ... outros parâmetros
  senderType // Novo parâmetro para identificação
};
```

### 2. Conversation Upload Service (server/services/conversation-upload.service.ts)

#### Interface Atualizada
```typescript
interface N8NUploadParams {
  file: Buffer;
  filename: string;
  mimeType: string;
  conversationId: string;
  clinicId: number;
  caption?: string;
  whatsappMessageId?: string;
  whatsappMediaId?: string;
  whatsappMediaUrl?: string;
  timestamp?: string;
  senderType?: string; // 🤖 Novo: Para identificar origem (patient/ai)
}
```

#### Lógica de Identificação
```typescript
// Identificação da origem
const isAIMessage = senderType === 'ai';
console.log(`🤖 Message identification: ${isAIMessage ? 'AI-generated' : 'Patient-sent'}`);

// Determinar parâmetros baseado na origem
const finalSenderType = isAIMessage ? 'ai' : 'patient';
const finalDeviceType = isAIMessage ? 'system' : 'manual';

// Criação da mensagem com parâmetros corretos
const message = await this.storage.createMessage({
  conversation_id: conversation.id.toString(),
  content: messageContent,
  sender_type: finalSenderType, // 'ai' ou 'patient'
  message_type: messageType,
  device_type: finalDeviceType, // 'system' ou 'manual'
  // ... outros campos
});
```

## Fluxo de Funcionamento

### Para Mensagens de Pacientes (Comportamento Atual Preservado)
1. N8N envia arquivo SEM header `X-Sender-Type` (ou com valor `patient`)
2. Sistema detecta `senderType = undefined` (padrão para `patient`)
3. Mensagem criada com:
   - `sender_type: 'patient'`
   - `device_type: 'manual'`
4. **Zero impacto** no funcionamento atual

### Para Mensagens da IA (Nova Funcionalidade)
1. N8N envia arquivo COM header `X-Sender-Type: ai`
2. Sistema detecta `senderType = 'ai'`
3. Mensagem criada com:
   - `sender_type: 'ai'`
   - `device_type: 'system'`
4. Diferenciação completa da origem do áudio

## Exemplos de Uso

### Curl para Áudio de Paciente (Comportamento Atual)
```bash
curl -X POST https://operabase.com/api/n8n/upload \
  -H "X-API-Key: sua_chave_api" \
  -H "X-Conversation-Id: 559887694034551150391104" \
  -H "X-Clinic-Id: 1" \
  -H "X-Filename: audio-paciente.mp3" \
  -H "X-Mime-Type: audio/mpeg" \
  -F "file=@audio-paciente.mp3"
```

### Curl para Áudio da IA (Nova Funcionalidade)
```bash
curl -X POST https://operabase.com/api/n8n/upload \
  -H "X-API-Key: sua_chave_api" \
  -H "X-Conversation-Id: 559887694034551150391104" \
  -H "X-Clinic-Id: 1" \
  -H "X-Filename: audio-ia-gerado.mp3" \
  -H "X-Mime-Type: audio/mpeg" \
  -H "X-Sender-Type: ai" \
  -F "file=@audio-ia-gerado.mp3"
```

## Logs de Sistema

### Mensagem de Paciente
```
📥 N8N Upload: audio-paciente.mp3 (audio/mpeg) for conversation 559887694034551150391104
🤖 Sender Type: patient (default)
🤖 Message identification: Patient-sent
📝 Using sender_type: 'patient', device_type: 'manual'
```

### Mensagem da IA
```
📥 N8N Upload: audio-ia-gerado.mp3 (audio/mpeg) for conversation 559887694034551150391104
🤖 Sender Type: ai
🤖 Message identification: AI-generated
📝 Using sender_type: 'ai', device_type: 'system'
```

## Compatibilidade

- ✅ **Zero impacto** no envio de áudios de pacientes existente
- ✅ **Backward compatible** - sem header = comportamento atual
- ✅ **Preserva** todas as funcionalidades de upload existentes
- ✅ **Adiciona** identificação da IA sem quebrar sistema atual

## Benefícios

1. **Diferenciação Clara**: Sistema distingue automaticamente origem dos áudios
2. **Integração Seamless**: Usa endpoint N8N existente sem criação de nova API
3. **Backward Compatibility**: Funcionalidade atual 100% preservada
4. **Flexibilidade**: Header opcional, padrão mantém comportamento atual
5. **Logs Detalhados**: Sistema registra identificação para debugging

## Status

✅ **IMPLEMENTADO** - Sistema pronto para identificar áudios da IA através do header `X-Sender-Type: ai`