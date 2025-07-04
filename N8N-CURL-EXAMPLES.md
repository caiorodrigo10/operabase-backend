# N8N CURL Examples para TaskMed

## Configuração Base

**Endpoint**: `https://your-taskmed-domain.com/api/n8n/upload`
**API Key**: `e277a75d4fc5ae0e93c3746930b36ca0551185d6e7bafa8a110850076ad818c1`

## 1. Upload de Imagem

```bash
curl -X POST https://your-taskmed-domain.com/api/n8n/upload \
  -H "X-API-Key: e277a75d4fc5ae0e93c3746930b36ca0551185d6e7bafa8a110850076ad818c1" \
  -H "X-Conversation-Id: 5511965860124551150391104" \
  -H "X-Clinic-Id: 1" \
  -H "X-Filename: foto-exame.jpg" \
  -H "X-Mime-Type: image/jpeg" \
  -H "X-Caption: Paciente enviou foto do exame" \
  -F "file=@/path/to/foto-exame.jpg"
```

## 2. Upload de Documento PDF

```bash
curl -X POST https://your-taskmed-domain.com/api/n8n/upload \
  -H "X-API-Key: e277a75d4fc5ae0e93c3746930b36ca0551185d6e7bafa8a110850076ad818c1" \
  -H "X-Conversation-Id: 5511965860124551150391104" \
  -H "X-Clinic-Id: 1" \
  -H "X-Filename: receita-medica.pdf" \
  -H "X-Mime-Type: application/pdf" \
  -H "X-Caption: Receita médica enviada pelo paciente" \
  -F "file=@/path/to/receita-medica.pdf"
```

## 3. Upload de Áudio/Arquivo de Voz

```bash
curl -X POST https://your-taskmed-domain.com/api/n8n/upload \
  -H "X-API-Key: e277a75d4fc5ae0e93c3746930b36ca0551185d6e7bafa8a110850076ad818c1" \
  -H "X-Conversation-Id: 5511965860124551150391104" \
  -H "X-Clinic-Id: 1" \
  -H "X-Filename: audio-paciente.ogg" \
  -H "X-Mime-Type: audio/ogg" \
  -H "X-Caption: Áudio do paciente descrevendo sintomas" \
  -F "file=@/path/to/audio-paciente.ogg"
```

## 4. Upload de Documento Word

```bash
curl -X POST https://your-taskmed-domain.com/api/n8n/upload \
  -H "X-API-Key: e277a75d4fc5ae0e93c3746930b36ca0551185d6e7bafa8a110850076ad818c1" \
  -H "X-Conversation-Id: 5511965860124551150391104" \
  -H "X-Clinic-Id: 1" \
  -H "X-Filename: historico-medico.docx" \
  -H "X-Mime-Type: application/vnd.openxmlformats-officedocument.wordprocessingml.document" \
  -H "X-Caption: Histórico médico do paciente" \
  -F "file=@/path/to/historico-medico.docx"
```

## 5. Upload de Vídeo

```bash
curl -X POST https://your-taskmed-domain.com/api/n8n/upload \
  -H "X-API-Key: e277a75d4fc5ae0e93c3746930b36ca0551185d6e7bafa8a110850076ad818c1" \
  -H "X-Conversation-Id: 5511965860124551150391104" \
  -H "X-Clinic-Id: 1" \
  -H "X-Filename: video-sintomas.mp4" \
  -H "X-Mime-Type: video/mp4" \
  -H "X-Caption: Vídeo mostrando sintomas" \
  -F "file=@/path/to/video-sintomas.mp4"
```

## Headers Obrigatórios

| Header | Descrição | Exemplo |
|--------|-----------|---------|
| `X-API-Key` | Chave de autenticação | `e277a75d4fc5ae0e93c3746930b36ca0551185d6e7bafa8a110850076ad818c1` |
| `X-Conversation-Id` | ID da conversa no TaskMed | `5511965860124551150391104` |
| `X-Clinic-Id` | ID da clínica | `1` |
| `X-Filename` | Nome original do arquivo | `foto-exame.jpg` |
| `X-Mime-Type` | Tipo MIME do arquivo | `image/jpeg` |

## Headers Opcionais

| Header | Descrição | Exemplo |
|--------|-----------|---------|
| `X-Caption` | Legenda/descrição do arquivo | `Paciente enviou exame` |
| `X-WhatsApp-Message-Id` | ID da mensagem WhatsApp | `3EB07A582C7D179F2391CD4C518B085B` |
| `X-Timestamp` | Timestamp personalizado | `2025-06-26T10:30:00.000Z` |

## Tipos MIME Suportados

### Imagens
- `image/jpeg` - .jpg, .jpeg
- `image/png` - .png
- `image/gif` - .gif
- `image/webp` - .webp

### Documentos
- `application/pdf` - .pdf
- `application/msword` - .doc
- `application/vnd.openxmlformats-officedocument.wordprocessingml.document` - .docx
- `text/plain` - .txt

### Áudio
- `audio/mpeg` - .mp3
- `audio/ogg` - .ogg
- `audio/wav` - .wav
- `audio/webm` - .webm

### Vídeo
- `video/mp4` - .mp4
- `video/quicktime` - .mov
- `video/webm` - .webm

## Resposta de Sucesso

```json
{
  "success": true,
  "data": {
    "message": {
      "id": 427,
      "conversation_id": "5511965860124551150391104",
      "content": "Paciente enviou foto do exame",
      "timestamp": "2025-06-26T10:30:00.000Z"
    },
    "attachment": {
      "id": 126,
      "filename": "foto-exame.jpg",
      "file_type": "image/jpeg",
      "file_size": 1024567,
      "public_url": "https://supabase-storage-url/signed-url"
    }
  }
}
```

## Resposta de Erro

```json
{
  "success": false,
  "error": "Authentication required",
  "message": "N8N API key required. Use X-API-Key, X-N8N-API-Key, or Authorization header",
  "status": 401
}
```

## Configuração no N8N

### HTTP Request Node
```json
{
  "method": "POST",
  "url": "https://your-taskmed-domain.com/api/n8n/upload",
  "headers": {
    "X-API-Key": "e277a75d4fc5ae0e93c3746930b36ca0551185d6e7bafa8a110850076ad818c1",
    "X-Conversation-Id": "{{$json.conversationId}}",
    "X-Clinic-Id": "{{$json.clinicId}}",
    "X-Filename": "{{$json.filename}}",
    "X-Mime-Type": "{{$json.mimeType}}",
    "X-Caption": "{{$json.caption}}"
  },
  "body": {
    "contentType": "multipart-form-data",
    "values": {
      "file": "{{$binary.data}}"
    }
  }
}
```

## Limites e Restrições

- **Tamanho máximo**: 50MB por arquivo
- **Rate limiting**: 30 requests por minuto por IP
- **Formatos suportados**: Imagens, documentos, áudio, vídeo
- **Autenticação**: API Key obrigatória
- **Storage**: Supabase Storage com URLs assinadas