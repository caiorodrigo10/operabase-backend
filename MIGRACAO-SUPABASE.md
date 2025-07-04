# Migração para Supabase - Guia Completo

## 📋 Passos para Migração

### 1. Criar Tabelas no Supabase
1. Acesse seu painel do Supabase: https://supabase.com/dashboard
2. Vá para seu projeto
3. Clique em "SQL Editor" no menu lateral
4. Copie todo o conteúdo do arquivo `schema-supabase.sql` 
5. Cole no editor SQL do Supabase
6. Clique em "Run" para executar

### 2. Executar Migração de Dados
Após criar as tabelas, execute:
```bash
tsx migrate-data-only.ts
```

### 3. Configurar Aplicação para Usar Supabase
Após a migração bem-sucedida, atualize o sistema para usar Supabase:

```bash
# Instalar dependências do Supabase (já instalado)
# Atualizar configuração de storage
```

## 📊 O que Será Migrado

### Dados Principais
- ✅ Usuários e autenticação
- ✅ Clínicas e configurações
- ✅ Contatos e informações dos pacientes
- ✅ Agendamentos e consultas
- ✅ Prontuários médicos completos
- ✅ Pipeline de vendas e oportunidades
- ✅ Dados financeiros (clientes, cobranças)
- ✅ Integrações de calendário

### Estrutura Preservada
- ✅ Relacionamentos entre tabelas
- ✅ Índices para performance
- ✅ Constraints e validações
- ✅ Timestamps e metadados

## 🔧 Após a Migração

1. **Testar Sistema**: Faça login e verifique se todos os dados estão visíveis
2. **Backup**: O PostgreSQL original permanece como backup
3. **Performance**: Supabase oferece melhor escalabilidade
4. **Monitoramento**: Use o painel do Supabase para acompanhar uso

## ⚠️ Importante

- **Backup Automático**: Os dados originais permanecem no PostgreSQL atual
- **Zero Downtime**: A migração não afeta o sistema em execução
- **Reversível**: Podemos voltar ao PostgreSQL se necessário
- **Dados Preservados**: Todos os prontuários e históricos são mantidos

## 🆘 Resolução de Problemas

### Se der erro na criação de tabelas:
1. Verifique se copiou todo o SQL corretamente
2. Execute seção por seção se necessário
3. Ignore avisos sobre tabelas que já existem

### Se der erro na migração de dados:
1. O script tenta inserir registro por registro em caso de erro
2. Verifique o relatório final para ver quais dados foram migrados
3. Execute novamente se necessário (dados duplicados são tratados)

## 📞 Status Atual

- ✅ Conexão com Supabase testada e funcionando
- ✅ Credenciais configuradas corretamente  
- ✅ Arquivo SQL gerado (`schema-supabase.sql`)
- ✅ Script de migração pronto (`migrate-data-only.ts`)
- ⏳ Aguardando criação das tabelas no Supabase

**Próximo passo**: Execute o SQL no painel do Supabase para criar as tabelas.