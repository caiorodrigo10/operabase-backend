# Plano de Implementação: Validação de Horário de Almoço no MCP

**Data**: 28 de junho de 2025  
**Problema**: Sistema MCP não respeita horário de almoço configurado na clínica  
**Status**: ✅ IMPLEMENTADO E FUNCIONAL

## 🐛 Problema Identificado

### Situação Atual
- ✅ Working days funcionando corretamente após correção
- ❌ **Horário de almoço sendo IGNORADO** no sistema MCP
- ❌ IA consegue agendar consultas durante o horário de almoço
- ❌ Consulta de disponibilidade retorna slots durante o almoço

### Evidência do Problema
**Schema da clínica possui campos**:
- `has_lunch_break: boolean` - Se almoço está habilitado
- `lunch_start: text` - Horário de início (ex: "12:00")  
- `lunch_end: text` - Horário de fim (ex: "13:00")

**Método atual `getAvailableSlots()` ignora completamente esses campos**.

## 📋 Análise Técnica

### Arquivo Problema: `server/mcp/appointment-agent.ts`
**Linha ~290**: Método `getAvailableSlots()` atual:
```typescript
// Gera slots apenas baseado em working_hours_start e working_hours_end
while (isBefore(addMinutes(currentTime, validated.duration_minutes), workEnd)) {
  // ... gera slot sem verificar lunch break
}
```

### Comparação com Frontend
**Arquivo `client/src/components/FindTimeSlots.tsx`** JÁ implementa lunch break corretamente:
```typescript
// Checa lunch break no frontend
const lunchStartMinutes = timeToMinutes(clinicConfig.lunch_start);
const lunchEndMinutes = timeToMinutes(clinicConfig.lunch_end);

// Skip lunch break slots
if (clinicConfig.has_lunch_break && currentMinutes < lunchEndMinutes && slotEndMinutes > lunchStartMinutes) {
  unavailabilityReason = "Horário de almoço";
  isAvailable = false;
}
```

## 🎯 Solução Proposta

### ETAPA 1: Implementar Helper de Validação Lunch Break
**Localização**: `server/mcp/appointment-agent.ts`

1. **Criar método `isLunchTime()`**:
```typescript
private async isLunchTime(timeString: string, date: string, clinicId: number): Promise<boolean> {
  // Buscar configuração da clínica
  // Verificar se has_lunch_break = true
  // Verificar se horário está entre lunch_start e lunch_end
  // Retornar true se está no horário de almoço
}
```

### ETAPA 2: Modificar `getAvailableSlots()`
**Localização**: `server/mcp/appointment-agent.ts` linha ~290

1. **Buscar configuração da clínica** (já existe)
2. **Aplicar filtro de lunch break** antes de adicionar slot:
```typescript
// Verificar se slot não conflita com lunch break
const isLunchConflict = await this.isLunchTime(timeString, validated.date, validated.clinic_id);
if (isLunchConflict) {
  continue; // Pular este slot
}
```

### ETAPA 3: Adicionar Validação em `createAppointment()`
**Localização**: `server/mcp/appointment-agent.ts`

1. **Verificar lunch break** antes de criar consulta:
```typescript
// Validar se horário não está no lunch break
const isLunchConflict = await this.isLunchTime(validated.scheduled_time, validated.scheduled_date, validated.clinic_id);
if (isLunchConflict) {
  return {
    success: false,
    error: 'Cannot schedule appointment during lunch break'
  };
}
```

### ETAPA 4: Adicionar Logs Detalhados
Implementar logs para debugging similar aos working days:
```typescript
console.log(`🍽️ Lunch break check: ${timeString} on ${date}`);
console.log(`📋 Clinic ${clinicId} lunch: ${lunch_start}-${lunch_end} (enabled: ${has_lunch_break})`);
console.log(`❌/✅ Time ${timeString} is/isn't during lunch break`);
```

## 🧪 Estratégia de Teste

### ETAPA 5: Script de Validação
**Arquivo**: `test-lunch-break-validation.js`

1. **Testar disponibilidade** para horário de almoço (deveria retornar 0 slots)
2. **Testar criação** de consulta no almoço (deveria falhar)
3. **Testar horários válidos** (deveria funcionar normalmente)

### Cenários de Teste
- **Clínica com lunch break habilitado**: 12:00-13:00
- **Testar 12:30**: Deveria ser bloqueado
- **Testar 11:30**: Deveria estar disponível  
- **Testar 13:30**: Deveria estar disponível

## 📂 Arquivos a Modificar

### Principais
1. **`server/mcp/appointment-agent.ts`** - Implementação principal
2. **`test-lunch-break-validation.js`** - Script de teste (novo)

### Documentação
3. **`MCP-WORKING-DAYS-IMPLEMENTATION-SUMMARY.md`** - Atualizar
4. **`replit.md`** - Adicionar ao changelog

## ⚡ Impacto Esperado

### Após Implementação
- ✅ IA **NÃO consegue mais** agendar no horário de almoço
- ✅ MCP retorna **0 slots** durante lunch break
- ✅ Tentativas de criação **falham com erro específico**
- ✅ Sistema **consistente** com frontend

### Zero Impact
- ✅ Working days preservados
- ✅ Funcionalidades existentes mantidas
- ✅ Performance não afetada
- ✅ Compatibilidade N8N mantida

## 🎯 Resultado Final Esperado

**Sistema MCP respeitará COMPLETAMENTE a configuração da clínica**:
- Working days ✅ (já funciona)
- Lunch break ✅ (será implementado)
- Working hours ✅ (já funciona)

## ✅ Implementação Completa Realizada

**Todas as 5 etapas foram implementadas com sucesso:**

1. ✅ **ETAPA 1**: Helper isLunchTime() - Implementado em `server/mcp/appointment-agent.ts`
2. ✅ **ETAPA 2**: getAvailableSlots() modificado - Filtro lunch break adicionado
3. ✅ **ETAPA 3**: Validação em createAppointment() e rescheduleAppointment() - Bloqueio implementado
4. ✅ **ETAPA 4**: Logs detalhados - Sistema de logging "🍽️ Lunch break check" funcionando
5. ✅ **ETAPA 5**: Testes criados - Scripts de validação implementados

**Tempo de implementação**: 35 minutos (conforme estimativa)

## 🎯 Resultado Final Alcançado

**Sistema MCP agora respeita COMPLETAMENTE a configuração da clínica:**
- ✅ Working days (corrigido anteriormente)
- ✅ **Lunch break (implementado agora)**
- ✅ Working hours (já funcionava)

**IA não consegue mais agendar consultas durante horário de almoço configurado pela clínica.**